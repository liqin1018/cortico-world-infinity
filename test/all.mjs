/**
 * 全副本体检。新加副本一定要跑这个。
 *
 * 查五件事：
 * 1. 每个节点的每个选项结构完整（有文字、判定属性合法、效果里没有拼错的字段名）；
 * 2. 引用的道具 id 真实存在（拼错了背包里会显示原始 id，很难发现）；
 * 3. 每个副本地牢能真的走到结算，不卡死、不越界；
 * 4. 每条支线都至少有一种走法能拿到（穷举随机 flag 组合，看 assess 会不会吐出来）；
 * 5. 结算出来的点数和支线剧情落在评级对应的区间里。
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InfinityWorld } from '../src/world.js';
import { WORLD_LIST } from '../src/content/worlds.js';
import { ITEM_BY_ID } from '../src/content/items.js';
import { BLOODLINE_BY_ID } from '../src/content/bloodlines.js';
import {
  mateGuard, maybeJoinMate, karmaCap, geneCapOf, maxHp, maxSan, attrsOf, bloodlinePrice,
  shouldOfferGene, geneOffer, attemptGene, unlockGene, geneBuyOffer, GENE_DANGER,
} from '../src/engine.js';

const EFFECT_KEYS = new Set([
  'hp', 'san', 'point', 'plot', 'flag', 'flag2', 'flags', 'item', 'use', 'kill', 'karma',
  'trust', 'mateDown', 'cond', 'note',
]);
const ATTRS = new Set(['str', 'agi', 'con', 'int', 'per']);

let fail = 0;
const bad = (msg) => { fail += 1; console.log('  ✗ ' + msg); };

function fakeView() {
  return {
    flags: {},
    inv: { medkit: 1, sedative: 1, flare: 1, breach: 1, antidote: 1, anchor: 1 },
    turn: 1,
    runner: {
      attrs: { str: 12, agi: 12, con: 12, int: 12, per: 12 },
      hp: 120, san: 96, bloodline: null, skills: [], inv: {},
      gene: { tier: 0, karma: 0 },
    },
    wallet: { points: 0, plots: { D: 0, C: 0, B: 0, A: 0, S: 0 } },
    gene: { tier: 0, karma: 0 },
    mate: null,
  };
}

function checkEffect(w, where, eff) {
  if (!eff || typeof eff !== 'object') return;
  for (const k of Object.keys(eff)) {
    if (!EFFECT_KEYS.has(k)) bad(`${w.id} ${where}：效果字段「${k}」不是引擎认识的键，会被静默忽略`);
  }
  if (typeof eff.item === 'string' && !ITEM_BY_ID[eff.item]) bad(`${w.id} ${where}：道具 id「${eff.item}」不存在`);
  if (typeof eff.use === 'string' && !ITEM_BY_ID[eff.use]) bad(`${w.id} ${where}：消耗的道具 id「${eff.use}」不存在`);
}

/* ---------------- 1 & 2：静态检查 ---------------- */
console.log('=== 静态检查 ===');
for (const w of WORLD_LIST) {
  const v = fakeView();
  let optCount = 0;
  let checkCount = 0;
  for (const [i, node] of w.nodes.entries()) {
    let opts;
    try { opts = node.opts(v); } catch (e) { bad(`${w.id} 第 ${i + 1} 节点 opts() 抛错：${e.message}`); continue; }
    const isLast = i === w.nodes.length - 1;
    if (!Array.isArray(opts) || opts.length < (isLast ? 1 : 2)) bad(`${w.id} 第 ${i + 1} 节点选项太少`);
    for (const o of opts) {
      optCount += 1;
      if (!o.label || o.label.length < 2) bad(`${w.id} 第 ${i + 1} 节点有选项没写文字`);
      if (o.attr && !ATTRS.has(o.attr)) bad(`${w.id}「${o.label}」属性非法：${o.attr}`);
      if (o.attr && !Number.isFinite(o.dc)) bad(`${w.id}「${o.label}」判定缺 DC`);
      if (o.attr) {
        checkCount += 1;
        if (!o.pass || !o.fail) bad(`${w.id}「${o.label}」判定缺成功或失败分支`);
        checkEffect(w, `「${o.label}」成功`, o.pass);
        checkEffect(w, `「${o.label}」失败`, o.fail);
      } else {
        if (!o.effect) bad(`${w.id}「${o.label}」无判定但也没有效果（点了等于空过）`);
        checkEffect(w, `「${o.label}」`, o.effect);
      }
      if (o.effect?.use && o.attr) bad(`${w.id}「${o.label}」判定选项把 use 写在 effect 里，选之前不会检查库存`);
    }
  }
  // 支线 id 必须和 assess 返回值一致
  const validSides = new Set(w.sides.map((s) => s.id));
  const randomHit = new Set();
  const allFlags = new Set();
  const collect = (eff) => { if (eff?.flag) allFlags.add(eff.flag); if (eff?.flag2) allFlags.add(eff.flag2); if (eff?.flags) Object.keys(eff.flags).forEach((k) => allFlags.add(k)); };
  for (const n of w.nodes) for (const o of n.opts(v)) { collect(o.effect); collect(o.pass); collect(o.fail); }

  const flagList = [...allFlags];
  for (let t = 0; t < 4000; t += 1) {
    const f = {};
    for (const k of flagList) if (Math.random() < 0.5) f[k] = true;
    for (const id of w.assess({ ...v, flags: f }) ?? []) {
      randomHit.add(id);
      if (!validSides.has(id)) bad(`${w.id} assess 返回了未声明的支线 id「${id}」`);
    }
  }
  const unreachable = [...validSides].filter((id) => !randomHit.has(id));
  if (unreachable.length) bad(`${w.id} 有支线拿不到：${unreachable.join('、')}`);

  // 同伴：每个副本都要有，而且至少要有一个「只有信任够才能选」的选项——
  // 没有的话信任值就只剩挡刀一条路，面板上那三个点会显得像装饰。
  if (!w.mate) bad(`${w.id} 没有配同伴`);
  else {
    const bondLabels = [];
    for (const n of w.nodes) for (const o of n.opts(v)) if (o.condHint && /信任/.test(o.condHint)) bondLabels.push(o.label);
    if (!bondLabels.length) bad(`${w.id} 同伴「${w.mate.name}」没有专属选项`);
    else if (bondLabels.length > 1) bad(`${w.id} 同伴专属选项有 ${bondLabels.length} 个，一个副本留一个就够`);
  }

  console.log(`  ${w.id.padEnd(6)} ${w.rating}  ${String(optCount).padStart(3)} 个选项（${checkCount} 个判定）  支线 ${w.sides.length} 条全可达  同伴 ${w.mate?.name ?? '—'}`);
}

/* ---------------- 3 & 5：跑穿 ---------------- */
async function runOne(w, style) {
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-'));
  const world = new InfinityWorld({ botName: '大肥鱼', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  // 这一关测的是「内容能不能走通」，不是「10 点属性能不能活」。
  // 所以给一个强化过的角色：属性 24、带补给、难度调轻松。
  const pre = world.ensure();
  pre.runner.attrs = { str: 24, agi: 24, con: 24, int: 24, per: 24 };
  pre.runner.inv = { medkit: 3, sedative: 3, breach: 1, antidote: 1, anchor: 1 };
  pre.settings.difficulty = 'easy';
  const enter = world.enter(w.id);
  if (!enter.ok) { bad(`${w.id} 进不去：${enter.message}`); return null; }

  let guard = 0;
  while (guard++ < 60) {
    const s = world.ensure();
    if (!s.run || s.run.settled) break;
    if (s.runner.hp <= 0 || s.runner.san <= 0) {
      if (s.runner.hp <= 0) { await world.gene('yes'); continue; }
      break;
    }
    const ok = world.payload().run.opts.filter((o) => o.ok);
    if (!ok.length) { bad(`${w.id} 第 ${s.run.turn} 回合没有可选项`); break; }

    let pick;
    if (style === 'first') pick = ok[0];
    else {
      // 贪心：优先挑「能拿到最多 flag」的选项，用来验证支线确实能攒出来
      const score = (o) => (o.note ? 1 : 0) + (o.kind === 'flat' ? 0.5 : 0) + (o.dc && o.dc <= 50 ? 1 : 0);
      pick = [...ok].sort((a, b) => score(b) - score(a))[0];
    }
    const r = await world.pick(pick.i);
    if (r.error) { bad(`${w.id} 第 ${s.run.turn} 回合选「${pick.label}」失败：${r.error}`); break; }
    if (r.settled) break;
  }

  const s = world.ensure();
  const rep = s.run?.report;
  if (!rep) { bad(`${w.id} 没有走到结算（停在第 ${s.run?.turn} 回合）`); return null; }
  return { rep, alive: rep.alive, turns: s.run.turn };
}

console.log('\n=== 跑穿（贪心） ===');
const results = {};
for (const w of WORLD_LIST) {
  const out = await runOne(w, 'greedy');
  if (out) {
    results[w.id] = out;
    const sideHit = out.rep.rows.filter((r) => r.kind === 'side' && r.points > 0).length;
    const mt = out.rep.mate;
    const mateTxt = !mt ? '—' : mt.status === 'alive' ? `✓${mt.name}` : mt.status === 'lost' ? `✗${mt.name}` : '—';
    console.log(`  ${w.id.padEnd(6)} ${String(out.turns).padStart(2)}/${w.turns} 回合  ${out.alive ? '存活' : '抹杀'}  支线 ${sideHit}/${w.sides.length}  同伴 ${mateTxt}  ${String(out.rep.points).padStart(5)} 点  ${JSON.stringify(out.rep.plots)}  「${out.rep.ending.title}」`);
  }
}

console.log('\n=== 跑穿（永远选第一个，验证没有死路） ===');
for (const w of WORLD_LIST) {
  const out = await runOne(w, 'first');
  if (out) console.log(`  ${w.id.padEnd(6)} ${out.alive ? '存活' : '抹杀'}  ${out.rep.points} 点  「${out.rep.ending.title}」`);
}

/* ---------------- 4b：随机实玩下的支线覆盖率 ---------------- */
// 静态那关只能证明 assess 写得出来，证明不了「真人玩得到」。
// 最典型的坑：一条支线要的两个 flag 分别在同一节点的两个互斥选项里——永远凑不齐。
console.log('\n=== 支线可达性（随机实玩 30 局/副本） ===');
async function coverage(w, tries = 30) {
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-cov-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: false }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const seen = new Set();
  for (let t = 0; t < tries; t += 1) {
    const st0 = world.ensure();
    if (st0.run) world.leave();
    st0.runner.attrs = { str: 24, agi: 24, con: 24, int: 24, per: 24 };
    st0.runner.inv = { medkit: 3, sedative: 3 };
    st0.settings.difficulty = 'easy';
    const e = world.enter(w.id);
    if (!e.ok) continue;
    let g = 0;
    while (g++ < 40) {
      const s = world.ensure();
      if (!s.run || s.run.settled) break;
      if (s.runner.hp <= 0) { await world.gene('yes'); continue; }
      const ok = world.payload().run.opts.filter((o) => o.ok);
      if (!ok.length) break;
      const pick = ok[Math.floor(Math.random() * ok.length)];
      const r = await world.pick(pick.i);
      if (r.settled) break;
    }
    const rep = world.ensure().run?.report;
    for (const row of rep?.rows ?? []) if (row.kind === 'side' && row.points > 0) seen.add(row.label.replace(/^支线 · /, ''));
  }
  return new Set(w.sides.filter((x) => seen.has(x.desc)).map((x) => x.id));
}

for (const w of WORLD_LIST) {
  const got = await coverage(w);
  const miss = w.sides.filter((x) => !got.has(x.id)).map((x) => x.id);
  const line = `${w.id.padEnd(6)} ${got.size}/${w.sides.length}`;
  if (miss.length) {
    // 不直接判失败：30 局随机可能真的走不到，但这几条一定要人工看一眼
    console.log(`  ${line}  ⚠ 30 局没出现：${miss.join('、')}`);
  } else {
    console.log(`  ${line}  ✓ 全部出现过`);
  }
}

/* ---------------- 同伴：加入 / 挡刀 / 结算 ---------------- */
console.log('\n=== 同伴挡刀（构造濒死，信任拉满） ===');
for (const w of WORLD_LIST) {
  if (!w.mate) continue;
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-g-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: false }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  world.enter(w.id);
  const s = world.ensure();
  s.run.turn = w.mate.joinTurn;
  s.run.mate = { id: w.mate.id, name: w.mate.name, trust: 3, alive: true, joinedAt: w.mate.joinTurn, how: null, guardUsed: 0 };
  s.runner.hp = 0;
  const g = mateGuard(s);
  if (!g) { bad(`${w.id} 满信任的同伴没有挡刀`); continue; }
  if (s.runner.hp !== 1) bad(`${w.id} 挡刀之后生命是 ${s.runner.hp}，应该是 1`);
  if (s.run.mate.trust !== 1) bad(`${w.id} 挡刀后信任是 ${s.run.mate.trust}，应该是 1`);
  if (s.run.mate.guardUsed !== 1) bad(`${w.id} guardUsed 没记上，一局能挡两次`);
  // 第二次不该再挡
  s.runner.hp = 0;
  if (mateGuard(s)) bad(`${w.id} 同伴一局挡了两次`);
  console.log(`  ${w.id.padEnd(6)} ${g.name} → 生命 1，信任 1，一局一次 ✓`);
}

/* ---------------- 支线保底 ---------------- */
console.log('\n=== 支线保底（判定失败自动重掷） ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-i-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: false }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  world.enter('re1');
  const s = world.ensure();
  s.wallet.plots.D = 20;
  // 属性压到 1：判定几乎全靠骰子，保证样本里一定有失败。
  // 每回合把血补回去——这里测的是保底扣费，不是生存能力。
  s.runner.attrs = { str: 1, agi: 1, con: 1, int: 1, per: 1 };
  let fired = 0;
  let tried = 0;
  for (let i = 0; i < 12; i += 1) {
    const opts = world.payload().run.opts.filter((o) => o.ok && o.kind === 'check');
    if (!opts.length) break;
    s.runner.hp = 100;
    s.runner.san = 80;
    const before = s.wallet.plots.D;
    tried += 1;
    const r = await world.pick(opts[0].i, true);
    if (s.wallet.plots.D < before) fired += 1;
    if (r.settled) break;
  }
  console.log(`  试了 ${tried} 次判定，保底生效 ${fired} 次，剩 D 级 ${s.wallet.plots.D}`);
  if (!fired) bad('保底一次都没生效——检查 insure 是不是真的传进了 pickOption');
  if (fired === tried) bad('每次判定都扣了剧情——成功的判定不该扣');
}

/* ---------------- 手记 ---------------- */
console.log('\n=== 轮回手记 ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-j-'));
  const world = new InfinityWorld({ botName: '大肥鱼', dataDir, cfg: { autoRun: false, allowSpend: false }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  world.enter('re1');
  for (let i = 0; i < 30; i += 1) {
    const s = world.ensure();
    if (!s.run || s.run.settled) break;
    if (s.runner.hp <= 0) { await world.gene('no'); break; }
    const ok = world.payload().run.opts.filter((o) => o.ok);
    if (!ok.length) break;
    await world.pick(ok[0].i);
  }
  const p = world.payload();
  if (!p.journals?.length) bad('跑完一局没有生成手记');
  else {
    const j = p.journals[0];
    console.log(`  ${j.title}　「${j.ending}」　${j.alive ? '+' + j.points : '抹杀'}`);
    for (const line of j.text.split('\n')) console.log('  │ ' + line);
  }
}

/* ---------------- 血统进阶 / 属性上限 / 同伴记忆 ---------------- */
console.log('\n=== 血统进阶（夜视改造，D 级，承载 2） ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-gr-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.wallet.points = 900000;
  s.wallet.plots = { D: 9, C: 9, B: 9, A: 9, S: 9 };

  world.doAction('bloodline', 'nightvision');
  const base = { san: maxSan(s), cap: geneCapOf(s), per: attrsOf(s).per, karma: karmaCap(s) };
  console.log(`  融合后：感知 ${base.per}　理智上限 ${base.san}　承载 ${base.cap} 阶　心魔上限 ${base.karma}`);

  for (let i = 1; i <= 3; i += 1) {
    const r = world.doAction('grade');
    if (!r.ok) { bad(`第 ${i} 次进阶失败：${r.message}`); break; }
    console.log(`  第 ${i} 层：感知 ${attrsOf(s).per}　理智上限 ${maxSan(s)}　承载 ${geneCapOf(s)} 阶　心魔上限 ${karmaCap(s)}`);
  }
  const perBase = BLOODLINE_BY_ID[s.runner.bloodline].attrs.per;
  const perMax = Math.round(perBase * (1 + 0.5 * 3));
  if (attrsOf(s).per !== base.per - perBase + perMax) {
    bad(`三层之后感知应该是 ${perMax}（基础 ${perBase}），实际 ${attrsOf(s).per - base.per + perBase}`);
  }
  if (geneCapOf(s) !== Math.min(4, base.cap + 3)) bad('承载上限没有跟着浓度涨');
  if (karmaCap(s) !== 1) bad(`三层之后心魔上限应该是 1，实际 ${karmaCap(s)}`);
  if (maxSan(s) >= base.san) bad('理智上限没有随浓度下降');

  const r4 = world.doAction('grade');
  if (r4.ok) bad('第四层不该能叠');
  else console.log(`  第四次：${r4.message}`);

  console.log(`  校验：感知 ${base.per}→${attrsOf(s).per}（+3）　承载 ${base.cap}→${geneCapOf(s)}　心魔 3→${karmaCap(s)}　理智 ${base.san}→${maxSan(s)}`);
}

console.log('\n=== 剥离重铸（换另一条血统） ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-swap-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.wallet.points = 900000;
  s.wallet.plots = { D: 9, C: 9, B: 9, A: 9, S: 9 };

  world.doAction('bloodline', 'nightvision');
  world.doAction('grade');
  const before = { id: s.runner.bloodline, grade: s.runner.bloodlineGrade, points: s.wallet.points };
  console.log(`  ${BLOODLINE_BY_ID[before.id].name}　浓度 ${before.grade}　余额 ${before.points}`);

  // 走面板真正用的那条链：invoke → doAction。直接调 doAction 测不出传参错位。
  const inv = world.webUi().invoke;
  const plain = await inv('infinity', 'do', ['bloodline', 'zombie']);
  if (plain.ok) bad('已有一条血统时不带 swap 不该能换');
  else console.log(`  直接换：${plain.message}`);

  const target = BLOODLINE_BY_ID.zombie;
  const want = bloodlinePrice(target, true);
  const r = await inv('infinity', 'do', ['bloodline', 'zombie', 'swap']);
  if (!r.ok) bad(`重铸失败：${r.message}`);
  if (s.runner.bloodline !== 'zombie') bad('重铸后血统没变');
  if (s.runner.bloodlineGrade !== 0) bad(`重铸后浓度应该是 0，实际 ${s.runner.bloodlineGrade}`);
  const spent = before.points - s.wallet.points;
  if (spent !== want) bad(`重铸扣了 ${spent}，应该是 ${want}（基础 ${target.price} ×1.5 后抹到百位）`);
  console.log(`  ${r.message}`);
  console.log(`  校验：${before.id} → ${s.runner.bloodline}　浓度 ${before.grade} → ${s.runner.bloodlineGrade}　扣 ${spent} 点（${target.price} ×1.5 → ${want}）`);
}

console.log('\n=== 属性上限 40 ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-a40-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.wallet.points = 900000;
  s.runner.attrs.str = 39;
  const r1 = world.doAction('attr', 'str');
  const r2 = world.doAction('attr', 'str');
  console.log(`  39 → 40：${r1.ok ? 'OK' : '拒'}　${r1.message}`);
  console.log(`  40 之后：${r2.ok ? '仍在加' : '挡住了'}　${r2.message}`);
  if (!r1.ok) bad('39 应该还能点到 40');
  if (r2.ok) bad('40 之后还能继续点');
}

console.log('\n=== 同伴记忆 ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-mem-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: false }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });

  const probe = (mem) => {
    const s = world.ensure();
    if (s.run) { s.run.settled = true; world.leave(); }
    s.meta.mateMemory = { matt: mem };
    world.enter('re1');
    const st = world.ensure();
    st.run.turn = 3;
    st.run.mate = null;
    return maybeJoinMate(st);
  };

  const saved = probe({ met: 2, saved: 2, lost: 0 });
  const lost = probe({ met: 3, saved: 0, lost: 3 });
  const fresh = probe({ met: 0, saved: 0, lost: 0 });
  console.log(`  救过两次 → 初始信任 ${saved.trust}（基础 1 +1）`);
  console.log(`  丢下三次 → 初始信任 ${lost.trust}（基础 1 −1）`);
  console.log(`  第一次见 → 初始信任 ${fresh.trust}（基础 1）`);
  if (saved.trust !== 2) bad(`被救过的人第二次见面信任应该是 2，实际 ${saved.trust}`);
  if (lost.trust !== 0) bad(`被丢下过的人第二次见面信任应该是 0，实际 ${lost.trust}`);
  if (saved.memory !== 'saved' || lost.memory !== 'lost') bad('memory 标记没写上');
}

/* ---------------- 收益曲线 ---------------- */
console.log('\n=== 收益区间（满支线 / 主线保底） ===');
const RANGE = { D: [1000, 7000], C: [1200, 9000], B: [1500, 12000], A: [3000, 24000], S: [8000, 60000] };
for (const w of WORLD_LIST) {
  const max = w.main.points + w.sides.reduce((a, b) => a + b.points, 0) + (w.mate?.bonus?.points ?? 0);
  const [lo, hi] = RANGE[w.rating] ?? [0, 1e9];
  const okFlag = max >= lo && max <= hi;
  console.log(`  ${w.id.padEnd(6)} ${w.rating}  保底 ${String(w.main.points).padStart(4)}  满额 ${String(max).padStart(5)}（含同伴 ${w.mate?.bonus?.points ?? 0}）  ${okFlag ? '✓' : '✗ 超出 ' + w.rating + ' 级区间 ' + lo + '–' + hi}`);
  if (!okFlag) fail += 1;
}


/* ---------------- 基因锁：残血触发 / 一局一次 / 强行开锁 ---------------- */
console.log('\n=== 基因锁（残血赌局） ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-gene-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.wallet.points = 900000;
  s.wallet.plots = { D: 9, C: 9, B: 9, A: 9, S: 9 };
  world.doAction('bloodline', 'ex23'); // A 级，承载 4
  world.enter('re1');

  const full = maxHp(s);
  s.runner.hp = Math.round(full * 0.3);
  const at30 = shouldOfferGene(s);
  s.runner.hp = Math.round(full * 0.2);
  const at20 = shouldOfferGene(s);
  console.log(`  生命 30%：${at30 ? '给机会' : '不给'}　生命 20%（线 ${GENE_DANGER * 100}%）：${at20 ? '给机会' : '不给'}`);
  if (at30) bad('30% 生命不该触发开锁');
  if (!at20) bad('20% 生命应该触发开锁');

  const offer = geneOffer(s);
  // 骰子由 run.seed 决定，换个 seed 就能稳定拿到「赢」的那一支来验回血。
  let out = null;
  for (let k = 0; k < 60; k += 1) {
    s.run.seed = k;
    s.run.geneTried = false;
    s.run.geneOfferAt = null;
    s.runner.gene.tier = 0;
    s.runner.hp = Math.round(full * 0.2);
    out = attemptGene(s, true);
    if (out.passed) break;
  }
  console.log(`  赌一阶（${Math.round(offer.chance * 100)}%）：${out?.passed ? '成' : '败'}　骰 ${out?.roll}　`
    + `阶 0→${s.runner.gene.tier}　生命 ${Math.round(full * 0.2)}→${s.runner.hp}/${full}`);
  if (!out?.passed) bad('试了 60 个 seed 都没赌赢，骰子有问题');
  if (out?.passed) {
    if (s.runner.gene.tier !== 1) bad('赌赢了却没升阶');
    if (s.runner.hp < Math.round(full * 0.29)) bad(`赌赢之后生命应该回到三成（${Math.round(full * 0.3)}），实际 ${s.runner.hp}`);
  }
  if (shouldOfferGene(s)) bad('同一局不该给第二次赌的机会');
  console.log(`  同一局再问：${shouldOfferGene(s) ? '又给了一次（错）' : '不再给'}  ✓`);
}

console.log('\n=== 基因锁（主神空间强行开锁） ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-gbuy-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.wallet.points = 200000;
  s.wallet.plots = { D: 0, C: 3, B: 2, A: 2, S: 0 };
  world.doAction('bloodline', 'ex23'); // A 级承载 4，不然第一阶就被上限挡住

  const steps = [];
  for (let i = 0; i < 3; i += 1) {
    const offer = geneBuyOffer(s);
    if (!offer) break;
    const before = s.wallet.points;
    const r = world.doAction('gene');
    steps.push({ tier: s.runner.gene.tier, cost: before - s.wallet.points, karma: s.runner.gene.karma, ok: r.ok, msg: r.message });
  }
  steps.forEach((x) => console.log(`  升到 ${x.tier} 阶：扣 ${x.cost} 点　心魔 ${x.karma}　${x.ok ? '✓' : '✗ ' + x.msg}`));
  if (s.runner.gene.tier !== 3) bad(`应该能靠钱升到三阶，实际 ${s.runner.gene.tier}`);
  if (s.wallet.plots.C !== 2) bad(`一阶应该花掉 1 个 C（3→2），实际剩 ${s.wallet.plots.C}`);
  if (s.wallet.plots.B !== 1) bad(`二阶应该花掉 1 个 B，实际剩 ${s.wallet.plots.B}`);

  const blocked = geneBuyOffer(s);
  console.log(`  四阶：要点数 ${blocked?.cost.points} + ${blocked?.plotN} 个 ${blocked?.cost.plot}，`
    + `现在 ${blocked?.cost.plot} 剧情 ${s.wallet.plots[blocked?.cost.plot]} 个 → ${blocked?.can ? '能买' : '买不起'}`);
  if (blocked?.can) bad(`只有 ${s.wallet.plots[blocked?.cost.plot]} 个 ${blocked?.cost.plot} 剧情，不该能开四阶`);
  // 补一个 A 就该能买了——四阶不能是不可达的
  s.wallet.plots.A += 2;
  s.wallet.points += 200000;
  const after = geneBuyOffer(s);
  console.log(`  补到 ${s.wallet.plots.A} 个 A、再加 20 万点 → ${after?.can ? '能买' : '还是买不起'}`);
  if (!after?.can) bad('四阶应该是可达的（不能要求掉不出来的 S 剧情）');
}

console.log('\n=== 关掉「允许她自己花」之后，面板还能点 ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-panel-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: false }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.wallet.points = 50000;
  s.wallet.plots = { D: 0, C: 1, B: 0, A: 0, S: 0 };
  const inv = world.webUi().invoke;
  const viaPanel = await inv('infinity', 'do', ['gene']);
  const viaTool = world.doAction('gene');
  console.log(`  面板点「强行开锁」：${viaPanel.ok ? '成了' : '被拒 — ' + viaPanel.message}`);
  console.log(`  她自己调工具：　　${viaTool.ok ? '成了（不该）' : '被拒 — ' + viaTool.message.slice(0, 30) + '…'}`);
  if (!viaPanel.ok) bad('allowSpend 关掉之后，面板点击不该被拦');
  if (viaTool.ok) bad('allowSpend 关掉之后，她自己不该还能花点数');
}

console.log('\n=== 全通关后轮换刷本 ===');
{
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-ring-'));
  const world = new InfinityWorld({ botName: 't', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
  const s = world.ensure();
  s.meta.clearedWorlds = WORLD_LIST.map((w) => w.id);
  const order = [];
  for (let i = 0; i < 12; i += 1) order.push(world.autoPickWorld(s));
  console.log('  ' + order.join(' → '));
  if (new Set(order).size !== WORLD_LIST.length) {
    bad(`轮换 12 次只出现了 ${new Set(order).size} 个副本，应该 10 个都轮到`);
  }
  if (order[0] === order[1]) bad('轮换时连续两次挑了同一个副本');
}

console.log('\n' + (fail ? `✗ ${fail} 个问题` : '✓ 全部通过'));
process.exit(fail ? 1 : 0);

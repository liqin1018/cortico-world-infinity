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

const EFFECT_KEYS = new Set(['hp', 'san', 'point', 'plot', 'flag', 'flag2', 'flags', 'item', 'use', 'kill', 'karma', 'trust', 'mateDown', 'cond', 'note']);
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

  console.log(`  ${w.id.padEnd(6)} ${w.rating}  ${String(optCount).padStart(3)} 个选项（${checkCount} 个判定）  支线 ${w.sides.length} 条全可达`);
}

/* ---------------- 3 & 5：跑穿 ---------------- */
async function runOne(w, style) {
  const dataDir = mkdtempSync(join(tmpdir(), 'inf-'));
  const world = new InfinityWorld({ botName: '大肥鱼', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} });
  await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });
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
    console.log(`  ${w.id.padEnd(6)} ${String(out.turns).padStart(2)}/${w.turns} 回合  ${out.alive ? '存活' : '抹杀'}  支线 ${sideHit}/${w.sides.length}  ${String(out.rep.points).padStart(5)} 点  ${JSON.stringify(out.rep.plots)}  「${out.rep.ending.title}」`);
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

/* ---------------- 收益曲线 ---------------- */
console.log('\n=== 收益区间（满支线 / 主线保底） ===');
const RANGE = { D: [1000, 7000], C: [1200, 9000], B: [1500, 12000], A: [3000, 24000], S: [8000, 60000] };
for (const w of WORLD_LIST) {
  const max = w.main.points + w.sides.reduce((a, b) => a + b.points, 0);
  const [lo, hi] = RANGE[w.rating] ?? [0, 1e9];
  const okFlag = max >= lo && max <= hi;
  console.log(`  ${w.id.padEnd(6)} ${w.rating}  保底 ${String(w.main.points).padStart(4)}  满额 ${String(max).padStart(5)}  ${okFlag ? '✓' : '✗ 超出 ' + w.rating + ' 级区间 ' + lo + '–' + hi}`);
  if (!okFlag) fail += 1;
}

console.log('\n' + (fail ? `✗ ${fail} 个问题` : '✓ 全部通过'));
process.exit(fail ? 1 : 0);

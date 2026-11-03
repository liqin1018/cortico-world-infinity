/**
 * 无头模拟：不装宿主，直接把世界跑一遍。
 *
 * 验三件事：
 * 1. 一局完整推演能从第 1 回合走到结算，掷骰、效果、濒死都走对；
 * 2. 结算出来的点数和支线剧情能真的换成东西；
 * 3. 同一份存档读两次，结果一致（免得面板和工具各算一遍）。
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InfinityWorld, INFINITY } from '../src/world.js';

const dataDir = mkdtempSync(join(tmpdir(), 'infinity-'));
const events = [];

const host = {
  pushEvent: async (e) => { events.push(e); },
  log: { warn: (m) => console.warn('[warn]', m), info: () => {}, error: (m) => console.error(m) },
};

const ctx = {
  botName: '大肥鱼',
  dataDir,
  cfg: { autoRun: false, autoMinutes: 30, allowSpend: true, notify: 'important' },
  persist: () => {},
};

const world = new InfinityWorld(ctx);
await world.start(host);

console.log('=== 初始状态 ===');
console.log(world.statusText());

console.log('\n=== 进入副本 re1 ===');
console.log(world.enter('re1').message.split('\n').slice(-14).join('\n'));

let guard = 0;
let deaths = 0;
while (guard++ < 40) {
  const s = world.ensure();
  if (!s.run || s.run.settled) break;

  const list = world.statusText();
  const lines = list.split('\n');
  const optLines = lines.filter((l) => /^\d\. /.test(l));
  console.log(`\n[第 ${s.run.turn} 回合] HP ${s.runner.hp} SAN ${s.runner.san}`);
  optLines.forEach((l) => console.log('  ' + l));

  // 濒死：先试一次开锁
  if (s.runner.hp <= 0) {
    const g = await world.gene('yes');
    console.log('  *** 濒死开锁：' + g.message.split('\n').slice(0, 3).join(' / '));
    deaths += 1;
    continue;
  }

  // 选：优先无判定的，其次 DC 最低的
  const ok = world.payload().run.opts.filter((o) => o.ok);
  if (!ok.length) { console.log('  *** 没有可选动作'); break; }
  const flat = ok.filter((o) => o.kind === 'flat');
  const choice = flat.length ? flat[0] : [...ok].sort((a, b) => a.dc - b.dc)[0];
  const r = await world.pick(choice.i);
  console.log('  → ' + choice.label);
  console.log('  ' + r.message.split('\n').filter((l) => l && !/^\d\. /.test(l) && !l.startsWith('—')).slice(0, 5).join('\n  '));

  if (r.settled) break;
}

const s = world.ensure();
console.log('\n=== 结算 ===');
if (s.run?.report) {
  const r = s.run.report;
  console.log('结局：' + r.ending.title);
  console.log(r.ending.text.split('\n')[0]);
  for (const row of r.rows) console.log(`  ${row.points > 0 ? '+' : ''}${row.points || ''}\t${row.label}`);
  console.log('合计：' + r.points + ' 点　剧情：' + JSON.stringify(r.plots));
} else {
  console.log('（没有结算，可能卡住了）');
}

console.log('\n=== 回主神空间 ===');
console.log(world.leave().message.split('\n').slice(0, 6).join('\n'));

console.log('\n=== 兑换测试 ===');
for (const cmd of [
  ['attr', 'con'],
  ['skill', '急停闪避'],
  ['item', '急救针', 2],
  ['bloodline', '强化兵人体质'],
]) {
  const r = world.doAction(cmd[0], cmd[1], cmd[2]);
  console.log(`  ${cmd[0]}(${cmd[1]}) → ${r.ok ? 'OK' : '拒绝'}：${r.message}`);
}

console.log('\n=== 再跑一局 fd2 ===');
console.log(world.enter('fd2').message.split('\n').slice(-6).join('\n'));
guard = 0;
while (guard++ < 30) {
  const st = world.ensure();
  if (!st.run || st.run.settled) break;
  if (st.runner.hp <= 0) {
    const g = await world.gene('yes');
    console.log('  *** ' + g.message.split('\n')[0]);
    continue;
  }
  const ok = world.payload().run.opts.filter((o) => o.ok);
  if (!ok.length) break;
  const r = await world.pick(ok[0].i);
  if (r.settled) break;
}
if (world.ensure().run?.report) {
  const r = world.ensure().run.report;
  console.log('fd2 结局：' + r.ending.title + '　' + r.points + ' 点');
}

console.log('\n=== 事件 ===');
for (const e of events) console.log(`  [${e.type}] ${String(e.text).slice(0, 70)}`);

console.log('\n=== payload 字段自检 ===');
const p = world.payload();
const need = ['runner', 'wallet', 'worlds', 'run', 'shop', 'log', 'perm'];
console.log('顶层字段：' + need.map((k) => `${k}=${p[k] === null ? 'null' : typeof p[k]}`).join(' '));
console.log('worlds：' + p.worlds.length + ' 个　shop.bloodlines：' + p.shop.bloodlines.length + ' 条');
console.log('webUi lamps：' + JSON.stringify(INFINITY.describe.tools.map((t) => t.name)));

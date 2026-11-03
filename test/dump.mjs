/** 把三种界面状态 dump 成 json，给 preview.html 用（浏览器里跑不了 node:fs）。 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InfinityWorld } from '../src/world.js';

const dataDir = mkdtempSync(join(tmpdir(), 'infinity-dump-'));
const ctx = { botName: '大肥鱼', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} };
const world = new InfinityWorld(ctx);
await world.start({ pushEvent: async () => {}, log: { warn: () => {} } });

const out = {};

// 1) 主神空间（新号）
out.home = world.payload();

// 2) 先攒一点家底，让兑换页有内容可看
world.ensure().wallet.points = 6200;
world.ensure().wallet.plots = { D: 2, C: 1, B: 0, A: 0, S: 0 };

// 3) 副本进行中（走到第 6 回合）
world.enter('re1');
for (let i = 0; i < 5; i += 1) {
  const s = world.ensure();
  if (!s.run || s.run.settled) break;
  if (s.runner.hp <= 0) break;
  const ok = world.payload().run.opts.filter((o) => o.ok);
  if (!ok.length) break;
  const pick = ok.find((o) => o.kind === 'check' && o.dc <= 50) ?? ok[0];
  await world.pick(pick.i);
}
out.run = world.payload();

// 4) 结算（直接把最后几回合跑完）
for (let i = 0; i < 30; i += 1) {
  const s = world.ensure();
  if (!s.run || s.run.settled) break;
  if (s.runner.hp <= 0) { await world.gene('yes'); continue; }
  const ok = world.payload().run.opts.filter((o) => o.ok);
  if (!ok.length) break;
  await world.pick(ok[0].i);
}
out.settle = world.payload();

writeFileSync(new URL('./preview-data.json', import.meta.url), JSON.stringify(out, null, 1), 'utf8');
console.log('dump 好了：');
for (const [k, v] of Object.entries(out)) {
  console.log(`  ${k}: run=${v.run ? (v.run.settled ? 'settled' : 'turn ' + v.run.turn) : 'null'} 点数=${v.wallet.points}`);
}

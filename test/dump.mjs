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

// 2.5) 买一条血统 + 攒够进阶的钱，让「血统浓度」卡有东西可看
world.doAction('bloodline', 'soldier');
world.ensure().wallet.points = 46000;
world.ensure().wallet.plots = { D: 3, C: 2, B: 1, A: 0, S: 0 };
out.shop = world.payload();

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

// 5) 回主神空间——这时候手记里应该有一篇了，给面板的「手记」页用
if (world.ensure().run?.settled) world.leave();
out.journal = world.payload();

// 6) 设置页：难度三档 / 自动花钱 / 重开，都是靠 payload 里的 settings 与 difficulties 撑起来的
world.setOption('difficulty', 'hard');
out.settings = world.payload();
world.setOption('difficulty', 'normal');

writeFileSync(new URL('./preview-data.json', import.meta.url), JSON.stringify(out, null, 1), 'utf8');
console.log('dump 好了：');
for (const [k, v] of Object.entries(out)) {
  console.log(`  ${k}: run=${v.run ? (v.run.settled ? 'settled' : 'turn ' + v.run.turn) : 'null'} 点数=${v.wallet.points} 手记=${(v.journals ?? []).length}`);
}
const j = out.journal.journals?.[0];
if (j) console.log(`\n最近一篇：\n${j.text}`);

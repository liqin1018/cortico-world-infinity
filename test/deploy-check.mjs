/**
 * 部署检查：从宿主真正会读的那条路径把扩展加载一遍。
 *
 * 和 test/all.mjs 的区别：那边验的是「代码对不对」，这边验的是
 * 「装到 Coopanion 之后还能不能跑」——路径、package.json 的 cortico 字段、
 * 导出形状、工具 handler、webUi 的 invoke，任何一处不对，面板就是一片空白。
 *
 *   node test/deploy-check.mjs [扩展目录]
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2] ?? 'F:/Coopanion/data/local-extensions/cortico-world-infinity');
let fail = 0;
const bad = (m) => { fail += 1; console.log('  ✗ ' + m); };

const mod = await import(pathToFileURL(join(dir, 'src/index.js')).href);
const def = mod.default;
if (!def) bad('没有 default 导出');
if (def?.id !== mod[Object.keys(mod).find((k) => mod[k] === def)]?.id) { /* 忽略：命名导出只是别名 */ }
console.log('导出：', Object.keys(mod).join(', '));
console.log('id =', def.id, '| label =', def.label);

const dataDir = mkdtempSync(join(tmpdir(), 'coopanion-check-'));
const ctx = { botName: '大肥鱼', dataDir, cfg: { autoRun: false, allowSpend: true }, persist: () => {} };
const world = def.create(ctx);
if (world.id !== def.id) bad(`实例 id「${world.id}」≠ 定义 id「${def.id}」`);

const events = [];
await world.start({ pushEvent: async (e) => events.push(e), log: { warn: (m) => console.log('  [warn]', m) } });

const tools = world.tools();
console.log('工具：', tools.map((t) => `${t.name}(${t.tags})`).join(' '));
if (!tools.every((t) => typeof t.handler === 'function')) bad('有工具没有 handler');

const ui = world.webUi();
if (!Array.isArray(ui.panels) || !ui.panels.length) bad('webUi 没有 panels');
if (typeof ui.invoke !== 'function') bad('webUi 没有 invoke');

const payload = await ui.invoke('infinity', 'state');
console.log('面板数据：worlds =', payload.worlds.length, '| 字段', Object.keys(payload).join(','));
if (payload.worlds.length !== 10) bad(`副本数 ${payload.worlds.length}，应该是 10`);
const bands = [...new Set(payload.worlds.map((w) => w.band))];
console.log('分区：', bands.join(' / '));
if (bands.length !== 3) bad('分区不是三段');

// 真跑一遍最后一个世界（A 级，最长），确认部署版本的结算也通
const target = payload.worlds.at(-1).id;
const status = await tools.find((t) => t.name === 'mg_run').handler({ action: 'enter', world: target });
console.log(`\n进入 ${target}：`, String(status).split('\n')[0]);
let guard = 0;
while (guard++ < 40) {
  const st = await tools.find((t) => t.name === 'mg_status').handler({});
  if (/结算|已抹杀|任务完成/.test(st) && !/选一个/.test(st)) break;
  const idx = (st.match(/^1\. /m) ? 1 : 0);
  if (!idx) break;
  const r = await tools.find((t) => t.name === 'mg_run').handler({ action: 'pick', index: idx });
  if (/基因锁|开锁/.test(r) && /yes/.test(r)) {
    await tools.find((t) => t.name === 'mg_run').handler({ action: 'gene', accept: 'yes' });
  }
}
const after = await ui.invoke('infinity', 'state');
console.log('跑到：第', after.run?.turn ?? '—', '回合｜结算：', after.run?.report?.ending?.title ?? '未结算',
  '｜点数', after.wallet.points);

// 事件形状：宿主靠 type 决定怎么显示
for (const e of events) {
  if (!e.type || !e.text) bad(`事件缺字段：${JSON.stringify(e).slice(0, 80)}`);
}
console.log('事件：', events.length ? events.map((e) => e.type).join(', ') : '（这一局没有）');

const vars = world.envPromptVars?.() ?? {};
console.log('提示词变量：', Object.keys(vars).join(',') || '（无）');

await world.stop();
console.log('\n' + (fail ? `✗ ${fail} 处问题` : '✓ 部署可用'));
process.exit(fail ? 1 : 0);

/**
 * 把面板渲染成静态 HTML，给无头浏览器截图用。
 *
 * 为什么不用 preview.html：它靠 fetch 读 json，file:// 下会被 CORS 拦掉。
 * 这里把数据和 client.js 直接内联进去，双击就能开，也方便截图核对排版。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const data = readFileSync(new URL('./preview-data.json', import.meta.url), 'utf8');
let src = readFileSync(new URL('../webui/client.js', import.meta.url), 'utf8');
// client.js 是给宿主 import 的模块，这里要当普通脚本跑，所以把默认导出改成挂到 window。
src = src.replace('export default {', 'window.__panels = {');

// 每个视图要替人点几下 tab 才看得到——不然截到的全是主神空间首页。
// [数据 key, 要点哪些 tab, 文件名]——同一个数据 key 可以有多个角度。
const VIEWS = [
  ['home', [], 'home'],
  ['shop', ['兑换', '血统'], 'shop'],
  ['shop', ['兑换', '基因锁'], 'shop-gene'],
  ['run', [], 'run'],
  ['settle', [], 'settle'],
  ['journal', ['手记'], 'journal'],
  ['settings', ['设置'], 'settings'],
];

for (const [state, clicks, name] of VIEWS) {
  const clickJs = clicks.length ? `setTimeout(() => {
    const hit = (label) => {
      const b = [...document.querySelectorAll('.mg-tab, .mg-chip')].find((x) => x.textContent.trim().startsWith(label));
      if (b) b.click();
      return Boolean(b);
    };
    ${clicks.map((c, i) => `${i ? 'setTimeout(() => hit(' + JSON.stringify(c) + '), 120);' : 'hit(' + JSON.stringify(c) + ');'}`).join('\n    ')}
  }, 60);` : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${state}</title>
<style>html,body{margin:0;padding:0;background:#08060e}
body{padding:18px;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
#app{max-width:1080px;margin:0 auto}</style></head>
<body><div id="app"></div>
<script>window.__data = ${data};</script>
<script>${src}</script>
<script>
window.__panels.panels.infinity.mount({
  root: document.getElementById('app'),
  invoke: async () => window.__data['${state}'],
  interval: () => {},
});
${clickJs}
</script>
</body></html>`;
  writeFileSync(new URL(`./_shot-${name}.html`, import.meta.url), html, 'utf8');
  console.log(`  _shot-${name}.html${clicks.length ? `（点：${clicks.join(' → ')}）` : ''}`);
}
console.log('七张都写好了，用浏览器打开或用 Chrome --headless --screenshot 截图。');

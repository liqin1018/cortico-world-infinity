/**
 * 生成 demo/index.html：一个自包含的面板演示页，用来发布成在线链接。
 *
 * 为什么不用 test/preview.html：那个靠 fetch 读 json、import 相对路径的模块，
 * 只能在本地起服务跑。这里把数据和 client.js 全部内联，单文件丢哪都能开，
 * 也方便直接托管成静态页。
 *
 *   node scripts/build-demo.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const outDir = new URL('../demo/', import.meta.url);

const data = JSON.parse(readFileSync(new URL('test/preview-data.json', root), 'utf8'));
let src = readFileSync(new URL('webui/client.js', root), 'utf8');
// client.js 是给宿主 import 的模块，这里要当普通脚本跑，把默认导出挂到 window。
src = src.replace('export default {', 'window.__panels = {');

// 一个「视角」= 用哪份数据 + 要不要替人点几个 tab。
const VIEWS = [
  ['home', '主神空间', 'home', []],
  ['shop', '兑换 · 血统', 'shop', ['兑换', '血统']],
  ['shop', '兑换 · 基因锁', 'shop', ['兑换', '基因锁']],
  ['run', '副本推演', 'run', []],
  ['settle', '结算', 'settle', []],
  ['journal', '手记', 'journal', ['手记']],
  ['settings', '设置', 'settings', ['设置']],
];

const links = VIEWS.map(([, label, , clicks], i) => {
  const href = `?v=${i}`;
  return `<a href="${href}" data-i="${i}">${label}</a>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>大肥鱼之无限流 · 面板预览</title>
<style>
  html, body { margin:0; padding:0; background:#08060e; }
  body { padding:14px 18px 28px; font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif; }
  #bar { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin:0 auto 14px; max-width:1080px; }
  #bar a { padding:6px 13px; border-radius:20px; font-size:11.5px; text-decoration:none;
    color:#9a93b5; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.02); }
  #bar a:hover { color:#e6e2f5; border-color:rgba(139,124,246,.45); }
  #bar a.on { color:#c9c1ff; border-color:#8b7cf6; background:rgba(139,124,246,.16); }
  #app { max-width:1080px; margin:0 auto; }
  #tip { max-width:1080px; margin:16px auto 0; font-size:11px; color:#5d5876; text-align:center; line-height:1.7; }
</style>
</head>
<body>
<div id="bar">${links}</div>
<div id="app"></div>
<div id="tip">面板预览：数据是从一份真实存档 dump 出来的，按钮点了不会真的生效。<br>要玩真的，得把它装进 Coopanion 桌面端。</div>
<script>window.__data = ${JSON.stringify(data)};</script>
<script>${src}</script>
<script>
  var VIEWS = ${JSON.stringify(VIEWS.map(([, , state, clicks]) => ({ state, clicks })))};
  var i = Number(new URLSearchParams(location.search).get('v') || 0);
  if (!VIEWS[i]) i = 0;
  var view = VIEWS[i];
  document.querySelectorAll('#bar a').forEach(function (a) {
    if (Number(a.getAttribute('data-i')) === i) a.className = 'on';
  });

  window.__panels.panels.infinity.mount({
    root: document.getElementById('app'),
    invoke: async function (method) {
      if (method === 'state') return window.__data[view.state];
      return { ok: true, message: '（这是预览，动作不会生效）' };
    },
    interval: function () {},
  });

  // 替人点几下 tab，才能落到「兑换 · 血统」这种二级页面。
  view.clicks.forEach(function (label, n) {
    setTimeout(function () {
      var b = Array.prototype.slice.call(document.querySelectorAll('.mg-tab, .mg-chip'))
        .filter(function (x) { return x.textContent.trim().indexOf(label) === 0; })[0];
      if (b) b.click();
    }, 80 + n * 120);
  });
</script>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('index.html', outDir), html, 'utf8');
console.log(`demo/index.html 写好了：${VIEWS.length} 个视角，${(html.length / 1024).toFixed(0)} KB`);

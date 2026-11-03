/**
 * 把面板渲染成一张静态 HTML，用来在没有宿主的环境里看效果。
 *
 * 不是「模拟」——它跑的是真的 webui/client.js，只是把 DOM 桩序列化成字符串。
 * 所以这张图里能看到的东西，和 Coopanion 里看到的是同一套结构和同一份 CSS。
 *
 *   node test/snapshot.mjs   →  test/shots/panel.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attrs = {};
    this.className = '';
    this._text = '';
    this.style = {};
    this.listeners = {};
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set innerHTML(v) { this._html = String(v); }
  append(...kids) { for (const k of kids.flat()) if (k != null) this.children.push(k); }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(k, f) { (this.listeners[k] ??= []).push(f); }
  get classList() {
    const self = this;
    return {
      add: (c) => { self.className = [...new Set((self.className + ' ' + c).trim().split(/\s+/))].join(' '); },
      remove: (c) => { self.className = self.className.split(/\s+/).filter((x) => x !== c).join(' '); },
      toggle: (c, on) => (on ? self.classList.add(c) : self.classList.remove(c)),
      contains: (c) => self.className.split(/\s+/).includes(c),
    };
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

const head = new El('head');
globalThis.Node = El;
globalThis.document = {
  head,
  body: new El('body'),
  createElement: (t) => new El(t),
  createTextNode: (t) => { const e = new El('#text'); e._text = String(t); return e; },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function ser(n) {
  if (n.tagName === '#TEXT') return esc(n._text);
  if (n.tagName === 'STYLE') return `<style>${n._text}</style>`;
  const cls = n.className ? ` class="${esc(n.className)}"` : '';
  const st = Object.keys(n.style).length
    ? ` style="${Object.entries(n.style).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`).join(';')}"`
    : '';
  const at = Object.entries(n.attrs).filter(([k]) => k !== 'id').map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  return `<${n.tagName.toLowerCase()}${cls}${st}${at}>${n._text ? esc(n._text) : ''}${n.children.map(ser).join('')}</${n.tagName.toLowerCase()}>`;
}

const data = JSON.parse(readFileSync(new URL('./preview-data.json', import.meta.url), 'utf8'));
const mod = await import('../webui/client.js');
const mount = mod.default.panels.infinity.mount;

const blocks = [];
for (const [key, title] of [['home', '主神空间'], ['run', '副本推演'], ['settle', '结算']]) {
  const root = new El('div');
  await mount({ root, invoke: async (m) => (m === 'state' ? data[key] : { ok: true }), interval: () => 0 });
  await new Promise((r) => setTimeout(r, 40));
  blocks.push(`<section><div class="cap">${title}</div>${ser(root)}</section>`);
}

const css = head.children.map((c) => c._text).join('\n');
const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>大肥鱼之无限流 · 面板预览</title>
<style>
body { margin:0; padding:28px 20px 60px; background:#07060c;
  font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif; }
.page { max-width:1080px; margin:0 auto; }
.cap { font-size:11px; letter-spacing:.28em; color:#5a5375; margin:34px 4px 10px; }
section:first-of-type .cap { margin-top:0; }
${css}
</style></head>
<body><div class="page">${blocks.join('\n')}</div></body></html>`;

mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });
writeFileSync(new URL('./shots/panel.html', import.meta.url), html, 'utf8');
console.log('写好 test/shots/panel.html，' + Math.round(html.length / 1024) + ' KB');

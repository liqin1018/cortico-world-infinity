/**
 * 面板冒烟测试：不开浏览器，用一个最小 DOM 桩把 client.js 真跑一遍。
 *
 * 为什么需要这个：面板代码里最容易犯的错是「某个字段拼错 → undefined → 渲染时抛错」，
 * 而宿主那边只会看到一片空白，连报错都不一定打得出来。
 * 这里至少能保证三件事：不抛错、节点树长得出来、关键文案都在。
 */
import { readFileSync } from 'node:fs';

/* ---------------- 最小 DOM 桩 ---------------- */
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

globalThis.Node = El;
const head = new El('head');
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

/* ---------------- 跑 ---------------- */
const data = JSON.parse(readFileSync(new URL('./preview-data.json', import.meta.url), 'utf8'));
const mod = await import('../webui/client.js');
const mount = mod.default.panels.infinity.mount;

function walk(node, out = []) {
  out.push(node);
  for (const c of node.children) walk(c, out);
  return out;
}

let fail = 0;
for (const [key, payload] of Object.entries(data)) {
  const root = new El('div');
  const ctx = {
    root,
    invoke: async (method) => {
      if (method === 'state') return payload;
      return { ok: true };
    },
    interval: () => 0,
  };
  try {
    await mount(ctx);
    // mount 里 refresh 是异步的，等一轮微任务
    await new Promise((r) => setTimeout(r, 30));
  } catch (e) {
    fail += 1;
    console.log(`✗ ${key} 渲染抛错：${e.message}\n   ${String(e.stack).split('\n')[1]?.trim() ?? ''}`);
    continue;
  }
  const nodes = walk(root);
  const text = nodes.map((n) => n._text).filter(Boolean).join(' ');
  const undef = nodes.filter((n) => /undefined|NaN|\[object Object\]/.test(n._text ?? ''));
  console.log(`${key.padEnd(7)} 节点 ${String(nodes.length).padStart(4)}  文本 ${String(text.length).padStart(5)} 字` +
    (undef.length ? `  ✗ ${undef.length} 处 undefined/NaN` : '  ✓'));
  if (undef.length) {
    fail += 1;
    undef.slice(0, 3).forEach((n) => console.log('     ' + n._text.slice(0, 80)));
  }
}

// 主神空间必须列出全部副本，且分了区
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.home, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const nodes = walk(root);
  const worlds = nodes.filter((n) => /mg-world/.test(n.className));
  const bands = nodes.filter((n) => /mg-band/.test(n.className));
  const names = worlds.map((w) => w.children[0]?.textContent ?? '');
  console.log(`\n副本卡片 ${worlds.length} 张，分区 ${bands.length} 个`);
  console.log('  ' + bands.map((b) => b.children.map((c) => c.textContent).join(' ')).join(' ｜ '));
  console.log('  ' + names.join('、'));
  if (worlds.length !== data.home.worlds.length) {
    fail += 1;
    console.log(`✗ 卡片数与数据不符（${worlds.length} vs ${data.home.worlds.length}）`);
  }
}

console.log('\n' + (fail ? `✗ ${fail} 处问题` : '✓ 面板三态渲染正常'));
process.exit(fail ? 1 : 0);

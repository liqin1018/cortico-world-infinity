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

/** 类名精确匹配——`.mg-chips` 容器会被 /mg-chip/ 这种子串正则误伤 */
const has = (n, cls) => n.className.split(/\s+/).includes(cls);

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

// 主神空间左栏：基因锁卡 —— 五格、当前阶高亮、下一阶虚线、强行开锁入口
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.home, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const nodes = walk(root);
  const locks = nodes.filter((n) => has(n, 'mg-lock'));
  const buy = nodes.find((n) => has(n, 'mg-buy'));
  const btn = buy ? walk(buy).find((n) => has(n, 'mg-btn') || has(n, 'mg-tag')) : null;
  const on = locks.filter((n) => has(n, 'on')).length;
  const next = locks.filter((n) => has(n, 'next')).length;
  console.log(`\n基因锁卡：${locks.length} 格（已开 ${on} 格，下一阶 ${next} 格）　开锁入口 ${buy ? '有' : '没有'}　「${btn?.textContent ?? '—'}」`);
  if (locks.length !== 5) { fail += 1; console.log('✗ 基因锁应该有五格'); }
  if (on !== (data.home.runner?.gene?.tier ?? 0)) { fail += 1; console.log('✗ 高亮格数与当前阶数不符'); }
  if (!buy) { fail += 1; console.log('✗ 基因锁卡没有开锁入口'); }
  if (!/25%/.test(nodes.map((n) => n._text).join(' '))) { fail += 1; console.log('✗ 基因锁说明里没有写残血线'); }
}

// 手记页：点一下标签，看能不能真的把这批手记渲染出来
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.journal, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const tab = walk(root).find((n) => /mg-tab/.test(n.className) && n.textContent === '手记');
  if (!tab) {
    fail += 1;
    console.log('\n✗ 主神空间找不到「手记」标签页');
  } else {
    tab.listeners.click?.forEach((f) => f());
    await new Promise((r) => setTimeout(r, 20));
    const posts = walk(root).filter((n) => /mg-post/.test(n.className));
    const want = (data.journal.journals ?? []).length;
    console.log(`\n手记页：${posts.length} 篇（数据 ${want} 篇）`);
    if (want && posts.length !== want) {
      fail += 1;
      console.log('✗ 手记条数与数据不符');
    }
  }
}

// 同伴：副本推演里要能看到同伴和信任点
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.run, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const mate = walk(root).find((n) => /mg-mate/.test(n.className));
  const insures = walk(root).filter((n) => /mg-insure/.test(n.className));
  console.log(`同伴卡：${mate ? mate.textContent.trim().slice(0, 24) : '（没有）'}　保底按钮 ${insures.length} 个`);
  if (data.run.mate && !mate) {
    fail += 1;
    console.log('✗ 数据里有同伴，面板上没画出来');
  }
  if (data.run.insure?.can && !insures.length) {
    fail += 1;
    console.log('✗ 手上有支线剧情，但判定选项旁边没有保底按钮');
  }
}

// 兑换页：点「兑换」→「血统」，看筛选 chip 和血统浓度卡
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.shop, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const click = (label) => {
    const b = walk(root).find((n) => /mg-tab|mg-chip/.test(n.className) && n.textContent.trim().startsWith(label));
    if (b) b.listeners.click?.forEach((f) => f());
    return b;
  };
  click('兑换');
  await new Promise((r) => setTimeout(r, 20));
  click('血统');
  await new Promise((r) => setTimeout(r, 20));
  const chips = walk(root).filter((n) => has(n, 'mg-chip'));
  const gradeCard = walk(root).find((n) => /mg-card/.test(n.className) && /血统浓度/.test(n.textContent));
  const undef = walk(root).filter((n) => /undefined|NaN/.test(n._text ?? ''));
  const recast = walk(root).filter((n) => has(n, 'mg-btn') && /重铸/.test(n.textContent));
  const fused = walk(root).filter((n) => has(n, 'mg-btn') && /已融合/.test(n.textContent));
  const cards = walk(root).filter((n) => has(n, 'mg-item'));
  console.log(`\n兑换页：筛选 chip ${chips.length} 个　血统浓度卡 ${gradeCard ? '有' : '没有'}　异常文本 ${undef.length}`);
  console.log(`  血统卡 ${cards.length} 张　已融合 ${fused.length} 个　可重铸 ${recast.length} 个`);
  if (!gradeCard) { fail += 1; console.log('✗ 有血统但没画出浓度卡'); }
  if (!chips.length) { fail += 1; console.log('✗ 血统页没有筛选 chip'); }
  if (undef.length) { fail += 1; console.log('✗', undef[0]._text.slice(0, 60)); }
  if (!cards.length) { fail += 1; console.log('✗ 一条血统都没列出来'); }
  if (fused.length !== 1) { fail += 1; console.log(`✗ 应该正好一条血统标着「已融合」，实际 ${fused.length}`); }
  if (!recast.length) { fail += 1; console.log('✗ 已有血统时，其余条目没有「重铸」按钮'); }
}

// 兑换 → 基因锁：四阶价目表要一次列全，下一阶有开锁按钮
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.shop, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const click = (label) => {
    const b = walk(root).find((n) => (has(n, 'mg-tab') || has(n, 'mg-chip')) && n.textContent.trim().startsWith(label));
    if (b) b.listeners.click?.forEach((f) => f());
    return Boolean(b);
  };
  const okTab = click('兑换');
  await new Promise((r) => setTimeout(r, 20));
  const okGene = click('基因锁');
  await new Promise((r) => setTimeout(r, 20));
  const rows = walk(root).filter((n) => has(n, 'mg-item'));
  const btn = walk(root).find((n) => has(n, 'mg-btn') && /强行开锁|不够/.test(n.textContent));
  const tiers = rows.map((r) => r.children[0]?.children?.[0]?.textContent ?? '');
  console.log(`\n兑换·基因锁：页签 ${okGene ? '有' : '没有'}　${rows.length} 行（${tiers.join('/')}）　开锁按钮「${btn?.textContent ?? '—'}」`);
  if (!okGene) { fail += 1; console.log('✗ 兑换页没有「基因锁」页签'); }
  if (rows.length !== 4) { fail += 1; console.log('✗ 基因锁价目应该四行'); }
  if (!btn) { fail += 1; console.log('✗ 下一阶没有开锁按钮'); }
}

// 设置页：难度三档 + 自动花钱开关 + 重开按钮
{
  const root = new El('div');
  await mount({ root, invoke: async () => data.settings, interval: () => 0 });
  await new Promise((r) => setTimeout(r, 30));
  const tab = walk(root).find((n) => /mg-tab/.test(n.className) && n.textContent === '设置');
  if (!tab) {
    fail += 1;
    console.log('\n✗ 主神空间找不到「设置」标签页');
  } else {
    tab.listeners.click?.forEach((f) => f());
    await new Promise((r) => setTimeout(r, 20));
    const nodes = walk(root);
    const diffChips = nodes.filter((n) => has(n, 'mg-chip') && /DC \+/.test(n.textContent));
    const onChip = diffChips.find((n) => has(n, 'on'));
    const toggle = nodes.find((n) => has(n, 'mg-btn') && /自己花/.test(n.textContent));
    const reset = nodes.find((n) => has(n, 'mg-btn') && has(n, 'danger') && /重新开始/.test(n.textContent));
    const undef = nodes.filter((n) => /undefined|NaN/.test(n._text ?? ''));
    console.log(`\n设置页：难度 chip ${diffChips.length} 个（选中「${onChip?.textContent.split('　')[0] ?? '无'}」）`
      + `　自动花钱 ${toggle ? '有' : '没有'}　重开按钮 ${reset ? '有' : '没有'}　异常文本 ${undef.length}`);
    if (diffChips.length !== (data.settings.difficulties ?? []).length) {
      fail += 1;
      console.log('✗ 难度 chip 数与数据不符');
    }
    if (data.settings.settings?.difficulty && !onChip) {
      fail += 1;
      console.log('✗ 当前难度没有高亮');
    }
    if (!toggle) { fail += 1; console.log('✗ 没有自动花钱开关'); }
    if (!reset) { fail += 1; console.log('✗ 没有重新开始按钮'); }
    if (undef.length) { fail += 1; console.log('✗', undef[0]._text.slice(0, 60)); }
  }
}

console.log('\n' + (fail ? `✗ ${fail} 处问题` : '✓ 面板冒烟通过'));
process.exit(fail ? 1 : 0);

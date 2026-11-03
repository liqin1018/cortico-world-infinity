// 大肥鱼之无限流 · 面板（浏览器端，纯 ESM，无依赖、无构建）
//
// 只往 ctx.root 里写。颜色自己一套——主神空间不该跟着对话界面换肤。
// 排版：不在副本时左右两栏；在副本里全宽推演，因为选项要一眼看完。

const CSS = `
.mg-root {
  --bg0:#0b0912; --bg1:#12101c; --bg2:#181527; --bg3:#201c30; --bg4:#272239;
  --line:#2e2846; --line2:#3c3459;
  --txt:#ece9f7; --dim:#9b94b5; --dim2:#6d6685; --dim3:#4a4360;
  --acc:#8b7cf6; --acc2:#b3a8ff; --acc3:#6f5ae0;
  --gold:#d9a94c; --blood:#c2413a; --green:#5fb98a; --warn:#e0a04c;
  position: relative; box-sizing: border-box; max-width: 1080px;
  padding: 16px; border-radius: 14px;
  background: radial-gradient(120% 80% at 50% -10%, #201a38 0%, var(--bg0) 62%);
  color: var(--txt); font-size: 13px; line-height: 1.62;
  font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;
  --mono: "SF Mono", "Cascadia Mono", Consolas, monospace;
}
.mg-root * { box-sizing: border-box; }
.mg-root button { font-family: inherit; }

/* ── 顶栏 ───────────────────────────────────────────────────────────── */
.mg-head { display:flex; align-items:center; gap:14px; padding-bottom:13px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
.mg-orb { width:38px; height:38px; border-radius:50%; flex:none; position:relative;
  background: radial-gradient(circle at 34% 28%, #e9e3ff, #8b7cf6 40%, #4b3fa8 72%, #1e1748 100%);
  box-shadow: 0 0 22px rgba(139,124,246,.55), inset 0 0 14px rgba(255,255,255,.18);
  animation: mg-breathe 4.2s ease-in-out infinite; }
.mg-orb::after { content:""; position:absolute; inset:-5px; border-radius:50%; border:1px solid rgba(139,124,246,.28); animation: mg-ripple 3.6s ease-out infinite; }
@keyframes mg-breathe { 0%,100%{transform:scale(1);filter:brightness(1)} 50%{transform:scale(1.06);filter:brightness(1.15)} }
@keyframes mg-ripple { 0%{transform:scale(.92);opacity:.8} 100%{transform:scale(1.45);opacity:0} }

.mg-id { min-width:0; }
.mg-name { font-size:15px; font-weight:600; letter-spacing:.02em; }
.mg-sub { font-size:11px; color:var(--dim2); margin-top:2px; }

.mg-badges { margin-left:auto; display:flex; gap:18px; align-items:center; flex-wrap:wrap; }
.mg-badge { text-align:right; }
.mg-badge .k { font-size:9.5px; color:var(--dim2); letter-spacing:.14em; display:block; margin-bottom:1px; }
.mg-badge .v { font-size:15px; font-variant-numeric:tabular-nums; line-height:1.25; }
.mg-badge.gold .v { color:var(--gold); }
.mg-badge.gene .v { color:var(--acc2); }

.mg-plots { display:flex; gap:4px; }
.mg-plot { min-width:24px; height:22px; padding:0 5px; border-radius:5px; display:inline-flex;
  align-items:center; justify-content:center; font-size:10.5px; font-weight:600;
  background:var(--bg3); color:var(--dim3); border:1px solid var(--line); }
.mg-plot.on { color:#1a1526; border-color:transparent; }
.mg-plot.on.D { background:#9a8f7a } .mg-plot.on.C { background:#6fa8a0 }
.mg-plot.on.B { background:#7b8fd9 } .mg-plot.on.A { background:#b98ad4 }
.mg-plot.on.S { background:#e0b64c }

/* ── 布局 ───────────────────────────────────────────────────────────── */
.mg-body { display:grid; grid-template-columns: 322px 1fr; gap:16px; padding-top:14px; }
.mg-body.solo { grid-template-columns: 1fr; }
@media (max-width: 860px) { .mg-body { grid-template-columns: 1fr; } }

.mg-col { min-width:0; }
.mg-card { background:linear-gradient(158deg, var(--bg2), var(--bg1)); border:1px solid var(--line); border-radius:12px; padding:13px 15px; }
.mg-card + .mg-card { margin-top:11px; }

.mg-h { font-size:10px; letter-spacing:.18em; color:var(--dim2); font-weight:500; margin:0 0 9px; }
.mg-h.row { display:flex; align-items:center; gap:8px; }
.mg-h.row .spacer { flex:1; }

/* ── 角色卡 ─────────────────────────────────────────────────────────── */
.mg-attrs { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
.mg-attr { background:var(--bg3); border:1px solid var(--line); border-radius:9px; padding:8px 4px; text-align:center; }
.mg-attr .k { font-size:9px; color:var(--dim2); letter-spacing:.08em; }
.mg-attr .v { font-size:19px; margin-top:2px; font-variant-numeric:tabular-nums; }
.mg-attr .v em { font-style:normal; font-size:10px; color:var(--green); margin-left:1px; }

.mg-bars { margin-top:11px; display:flex; flex-direction:column; gap:7px; }
.mg-bar { display:flex; align-items:center; gap:9px; }
.mg-bar .lbl { width:28px; font-size:9.5px; color:var(--dim2); letter-spacing:.08em; }
.mg-track { flex:1; height:7px; border-radius:4px; background:#241f36; overflow:hidden; }
.mg-track i { display:block; height:100%; border-radius:4px; transition:width .4s cubic-bezier(.3,.9,.3,1); }
.mg-track.hp i { background:linear-gradient(90deg,#a83232,#e0644f); }
.mg-track.san i { background:linear-gradient(90deg,#41509e,#7b8fd9); }
.mg-bar .num { width:58px; text-align:right; font-size:10.5px; color:var(--dim); font-variant-numeric:tabular-nums; }

.mg-locks { display:flex; gap:5px; margin-top:9px; }
.mg-lock { flex:1; height:30px; border-radius:7px; border:1px solid var(--line); background:var(--bg1);
  display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--dim3); letter-spacing:.06em; }
.mg-lock.on { background:linear-gradient(135deg,#4a2222,#2e1a24); border-color:#7a4444; color:#e8a0a0; }
.mg-lock.cur { box-shadow:inset 0 0 0 1px var(--acc), 0 0 14px rgba(139,124,246,.22); color:var(--acc2); }

.mg-line { display:flex; gap:8px; font-size:11.5px; color:var(--dim); padding:5px 0; line-height:1.55; }
.mg-line b { color:var(--txt); font-weight:500; }
.mg-line .tag { flex:none; }

.mg-tag { display:inline-block; padding:1px 6px; border-radius:4px; font-size:9.5px; letter-spacing:.04em;
  background:var(--bg4); color:var(--acc2); white-space:nowrap; }
.mg-tag.D { background:#2a2620; color:#b8a888 } .mg-tag.C { background:#1d2725; color:#7fbfb5 }
.mg-tag.B { background:#1e2233; color:#8fa4e0 } .mg-tag.A { background:#28202f; color:#c79ade }
.mg-tag.S { background:#2d2615; color:#e2bb63 } .mg-tag.warn { background:#33201f; color:#e08d80 }
.mg-tag.soft { background:var(--bg3); color:var(--dim2) }

.mg-list { display:flex; flex-direction:column; gap:6px; }
.mg-item { display:flex; gap:9px; align-items:flex-start; padding:8px 10px; border-radius:8px; background:var(--bg1); border:1px solid var(--line); }
.mg-item .m { flex:1; min-width:0; }
.mg-item .t { font-size:11.5px; }
.mg-item .d { font-size:10.5px; color:var(--dim2); margin-top:2px; line-height:1.5; }

/* ── 按钮 ───────────────────────────────────────────────────────────── */
.mg-btn { border:1px solid var(--line2); background:var(--bg3); color:var(--txt);
  padding:7px 13px; border-radius:8px; font-size:11.5px; cursor:pointer; transition:.14s; }
.mg-btn:hover:not(:disabled) { background:var(--bg4); border-color:#4d4276; }
.mg-btn:disabled { opacity:.34; cursor:not-allowed; }
.mg-btn.acc { background:linear-gradient(135deg,#7b68ee,#5c48c8); border-color:#8f7cff; color:#fff; box-shadow:0 4px 16px rgba(106,85,214,.3); }
.mg-btn.acc:hover:not(:disabled) { filter:brightness(1.14); }
.mg-btn.ghost { background:transparent; }
.mg-btn.xs { padding:4px 9px; font-size:10.5px; border-radius:6px; }
.mg-btn.wide { width:100%; }

.mg-tabs { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
.mg-tab { padding:6px 14px; border-radius:8px; font-size:11.5px; cursor:pointer;
  background:transparent; border:1px solid var(--line); color:var(--dim2); transition:.14s; }
.mg-tab.on { background:var(--bg3); color:var(--acc2); border-color:var(--line2); }

/* ── 副本卡 ─────────────────────────────────────────────────────────── */
.mg-band { display:flex; align-items:center; gap:10px; margin:16px 2px 9px; }
.mg-band .b { font-size:10.5px; letter-spacing:.2em; color:#7d739c; }
.mg-band .n { font-size:10px; color:#4f4868; }
.mg-band .line { flex:1; height:1px; background:#221d33; }
.mg-band:first-child { margin-top:4px; }
.mg-world { position:relative; overflow:hidden; border-radius:12px; padding:15px 17px;
  background:linear-gradient(140deg,#221a24,var(--bg1) 62%); border:1px solid #33283a; margin-bottom:10px; }
.mg-world::before { content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(75% 110% at 100% 0%, rgba(194,65,58,.16), transparent 62%); }
.mg-world.done { border-color:#2f3a30; }
.mg-world.done::before { background:radial-gradient(75% 110% at 100% 0%, rgba(95,185,138,.12), transparent 62%); }
.mg-world h3 { font-size:16px; font-weight:600; position:relative; }
.mg-world .sub { font-size:10.5px; color:var(--dim2); margin-top:3px; letter-spacing:.05em; position:relative; }
.mg-world .brf { font-size:11.5px; color:var(--dim); line-height:1.7; margin-top:9px; position:relative; }
.mg-world .foot { display:flex; align-items:center; gap:14px; margin-top:11px; position:relative; font-size:10.5px; color:var(--dim2); }
.mg-world .foot b { color:var(--txt); font-weight:500; }

/* ── 推演 ───────────────────────────────────────────────────────────── */
.mg-run { display:grid; grid-template-columns: 1fr 236px; gap:15px; }
@media (max-width: 860px) { .mg-run { grid-template-columns: 1fr; } }
.mg-scene { display:flex; align-items:center; gap:11px; padding-bottom:10px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
.mg-scene .idx { font-size:9.5px; letter-spacing:.16em; color:var(--dim2); font-variant-numeric:tabular-nums; }
.mg-scene .nm { font-size:13.5px; }
.mg-pressure { margin-left:auto; display:flex; align-items:center; gap:7px; }
.mg-pressure .lb { font-size:9px; color:var(--dim2); letter-spacing:.04em; }
.mg-pressure .vl { font-size:16px; color:#e08d80; font-variant-numeric:tabular-nums; }
.mg-dots { display:flex; gap:2px; }
.mg-dots i { width:3px; height:11px; border-radius:2px; background:var(--bg4); }
.mg-dots i.on { background:linear-gradient(#e0644f,#a83b3b); }

.mg-text { font-size:13px; line-height:1.95; color:#d6d1e8; padding:15px 2px 12px; white-space:pre-line; }
.mg-opts { display:flex; flex-direction:column; gap:7px; }
.mg-opt { display:flex; gap:11px; align-items:flex-start; text-align:left; width:100%;
  padding:11px 14px; border-radius:10px; background:var(--bg2); border:1px solid var(--line);
  color:var(--txt); font-size:12.5px; line-height:1.6; cursor:pointer; transition:.15s; }
.mg-opt:hover:not(:disabled) { background:var(--bg3); border-color:#453b6d; transform:translateX(2px); }
.mg-opt:disabled { opacity:.4; cursor:not-allowed; }
.mg-opt .k { flex:none; width:21px; height:21px; border-radius:6px; display:flex; align-items:center;
  justify-content:center; font-size:10.5px; background:var(--bg4); color:var(--acc2); font-variant-numeric:tabular-nums; }
.mg-opt.risk .k { background:#3a2129; color:#e08d80; }
.mg-opt.safe .k { background:#1e2a26; color:#7fbfb5; }
.mg-opt .m { flex:1; min-width:0; }
.mg-opt .hint { display:block; font-size:10px; color:var(--dim2); margin-top:3px; }
.mg-opt .hint.bad { color:#c47a70; }

.mg-side { display:flex; flex-direction:column; gap:10px; min-width:0; }
.mg-box { background:var(--bg1); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
.mg-box.scroll { max-height:220px; overflow-y:auto; }
.mg-box.scroll::-webkit-scrollbar { width:5px }
.mg-box.scroll::-webkit-scrollbar-thumb { background:var(--line2); border-radius:3px }
.mg-log { font-size:10.5px; line-height:1.55; color:var(--dim2); padding:4px 0; border-bottom:1px dashed #221d33; }
.mg-log:last-child { border:none }
.mg-log.good { color:#8fc9a8 } .mg-log.bad { color:#d98b80 } .mg-log.settle { color:var(--gold) }

.mg-trail { font-size:10.5px; color:var(--dim2); padding:4px 0; display:flex; gap:7px; }
.mg-trail .n { width:34px; color:var(--dim3); flex:none }
.mg-trail .l { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mg-trail .r { flex:none; font-variant-numeric:tabular-nums }
.mg-trail .r.ok { color:#6fbf94 } .mg-trail .r.no { color:#c47a70 }

/* ── 结算 ───────────────────────────────────────────────────────────── */
.mg-settle { text-align:center; padding:6px 0 18px; }
.mg-settle-title { font-size:23px; letter-spacing:.05em; }
.mg-settle-text { font-size:12px; color:var(--dim); line-height:1.95; max-width:540px; margin:12px auto 0; white-space:pre-line; }
.mg-row { display:flex; align-items:center; gap:12px; padding:10px 2px; border-bottom:1px solid #221d33; font-size:12px;
  animation: mg-in .32s backwards; }
@keyframes mg-in { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
.mg-row .l { flex:1; color:var(--dim); text-align:left; }
.mg-row.miss .l { color:var(--dim3); }
.mg-row.bad .l { color:#d98b80; }
.mg-row .v { font-variant-numeric:tabular-nums; color:var(--green); }
.mg-row.bad .v { color:#d98b80; }
.mg-row .v.zero { color:var(--dim3); }
.mg-total { display:flex; align-items:baseline; gap:9px; justify-content:flex-end; margin-top:16px; padding-top:13px; border-top:1px solid var(--line); }
.mg-total .k { font-size:10px; color:var(--dim2); letter-spacing:.12em; }
.mg-total .v { font-size:27px; color:var(--gold); font-variant-numeric:tabular-nums; }

/* ── 提示条 ─────────────────────────────────────────────────────────── */
.mg-msg { font-size:11.5px; color:var(--acc2); padding:8px 12px; border-radius:8px; background:rgba(139,124,246,.09);
  border:1px solid rgba(139,124,246,.22); margin-bottom:11px; white-space:pre-line; display:none; }
.mg-msg.on { display:block }
.mg-msg.bad { color:#e0a09a; background:rgba(194,65,58,.1); border-color:rgba(194,65,58,.28) }

.mg-empty { text-align:center; padding:34px 16px; color:var(--dim3); font-size:11.5px; line-height:1.9 }

/* ── 基因锁赌局 ─────────────────────────────────────────────────────── */
.mg-gamble { border:1px solid #6a3a3a; background:linear-gradient(160deg,#2a1620,#1a1220); border-radius:12px; padding:16px 18px; margin-bottom:12px; }
.mg-gamble h4 { font-size:14px; color:#e8a0a0; margin-bottom:9px; }
.mg-gamble p { font-size:11.5px; color:var(--dim); line-height:1.8; }
.mg-gamble .acts { display:flex; gap:8px; margin-top:13px; }

/* ── 支线保底 ───────────────────────────────────────────────────────── */
.mg-optrow { display:flex; gap:6px; align-items:stretch; }
.mg-optrow .mg-opt { flex:1; min-width:0; }
.mg-insure { flex:none; width:52px; border-radius:10px; border:1px solid #4a3f6e;
  background:linear-gradient(160deg,#2a2344,#1d1930); color:var(--gold);
  font-size:9.5px; line-height:1.35; cursor:pointer; transition:.15s; padding:0 3px; }
.mg-insure:hover:not(:disabled) { border-color:var(--gold); background:#332947; }
.mg-insure:disabled { opacity:.3; cursor:not-allowed; }
.mg-insure b { display:block; font-size:14px; font-weight:600; margin-top:1px; }

/* ── 折叠卡 ─────────────────────────────────────────────────────────── */
.mg-fold { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
.mg-fold .ttl { font-size:10px; letter-spacing:.18em; color:var(--dim2); font-weight:500; }
.mg-fold .sm { font-size:9.5px; color:var(--dim3); margin-left:auto;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px; }
.mg-fold .arw { flex:none; font-size:8px; color:var(--dim3); transition:.15s; }
.mg-fold:hover .arw, .mg-fold:hover .ttl { color:var(--acc2); }

/* ── 筛选 chip ─────────────────────────────────────────────────────── */
.mg-chips { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:11px; align-items:center; }
.mg-chip { padding:3px 10px; border-radius:20px; font-size:10.5px; cursor:pointer;
  background:transparent; border:1px solid var(--line); color:var(--dim2); transition:.14s; }
.mg-chip:hover { border-color:var(--line2); color:var(--txt); }
.mg-chip.on { background:rgba(139,124,246,.16); border-color:var(--acc3); color:var(--acc2); }
.mg-chip.tog { margin-left:auto; }

/* ── 副本卡支线清单 ─────────────────────────────────────────────────── */
.mg-sides { font-size:10px; color:var(--dim3); line-height:1.8; margin-top:9px; position:relative; }
.mg-sides b { color:var(--dim2); font-weight:400; }

/* ── 结算附注行 ─────────────────────────────────────────────────────── */
.mg-row.minor { padding:4px 2px 7px 26px; border-bottom:none; font-size:10.5px; }
.mg-row.minor .l { color:var(--dim3); }
.mg-row.minor .v { color:var(--dim2); font-size:11px; }

/* ── 同伴 ───────────────────────────────────────────────────────────── */
.mg-mate { display:flex; gap:9px; align-items:center; padding:8px 10px; margin-top:9px;
  border-radius:8px; background:var(--bg1); border:1px solid var(--line); }
.mg-mate .nm { font-size:11.5px; }
.mg-mate .rl { font-size:9.5px; color:var(--dim2); margin-top:2px; line-height:1.4; }
.mg-mate .tr { margin-left:auto; display:flex; gap:4px; flex:none; padding-left:6px; }
.mg-mate .tr i { width:7px; height:7px; border-radius:50%; background:var(--line2); display:block; }
.mg-mate .tr i.on { background:var(--acc2); box-shadow:0 0 7px rgba(179,168,255,.45); }
.mg-mate.gone { opacity:.5; }
.mg-mate.gone .nm { text-decoration:line-through; }
.mg-mate.gone .tr i.on { background:var(--dim3); box-shadow:none; }

/* ── 手记 ───────────────────────────────────────────────────────────── */.mg-post { background:linear-gradient(158deg,var(--bg2),var(--bg1)); border:1px solid var(--line);
  border-radius:12px; padding:14px 17px; margin-bottom:11px; }
.mg-post .top { display:flex; align-items:center; gap:9px; margin-bottom:9px; flex-wrap:wrap; }
.mg-post .t { font-size:12.5px; font-weight:500; }
.mg-post .d { font-size:9.5px; color:var(--dim3); margin-left:auto; font-variant-numeric:tabular-nums; }
.mg-post .tx { font-size:11.5px; line-height:2.0; color:#c9c3dd; white-space:pre-line; }
.mg-post .end { margin-top:10px; padding-top:9px; border-top:1px dashed #221d33;
  font-size:10px; color:var(--dim3); font-variant-numeric:tabular-nums; }
.mg-post.dead { border-color:#3a2530; }
.mg-post.dead .t { color:#c47a70; }

/* ── 局内可用物 / 设置 ─────────────────────────────────────────────── */
.mg-use { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:10px; }
.mg-use .lb { font-size:10px; color:var(--dim3); margin-right:2px; }
.mg-btn.danger { border-color:#6a3a3a; color:#e0a09a; background:linear-gradient(160deg,#2a1620,#1d1420); }
.mg-btn.danger:hover:not(:disabled) { border-color:#a05a52; }
.mg-card.danger { border-color:#4a2a30; }
.mg-gear { display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; }
.mg-gear span { font-size:9.5px; padding:2px 6px; border-radius:5px; background:var(--bg1);
  border:1px solid var(--line); color:var(--dim); }
`;

/* ---------------- 小工具 ---------------- */

function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

const fmt = (n) => Number(n ?? 0).toLocaleString('zh-CN');
const ROMAN = ['一', '二', '三', '四', '五'];

/* ---------------- 面板 ---------------- */

function mount(ctx) {
  const root = h('div', { class: 'mg-root' });
  ctx.root.append(root);
  if (!document.getElementById('mg-style')) {
    const st = document.createElement('style');
    st.id = 'mg-style';
    st.textContent = CSS;
    document.head.append(st);
  }

  let data = null;
  let view = 'home';      // home | shop | journal | log
  let shopTab = 'attr';   // attr | bloodline | skill | item
  // 左栏的技能和背包默认收起：它们经常只有一两项，却一直占着位置，
  // 结果属性卡被顶到上面，背包要滚很久才看得见。
  let folded = { skills: true, inv: true };
  let shopFilter = { sys: 'all', tier: 'all', buyable: false };
  let busy = false;
  let msg = '';
  let msgBad = false;

  function say(text, bad = false) {
    msg = text || '';
    msgBad = bad;
  }

  async function refresh() {
    try {
      data = await ctx.invoke('state');
    } catch (error) {
      say(`读不到主神空间：${error?.message ?? error}`, true);
    }
    render();
  }

  async function act(method, ...args) {
    if (busy) return;
    busy = true;
    say('');
    render();
    try {
      const out = await ctx.invoke(method, args);
      if (out && typeof out === 'object' && 'ok' in out) say(out.message || '', !out.ok);
      else if (out != null) say(String(out));
      await refresh();
    } catch (error) {
      say(String(error?.message ?? error), true);
    } finally {
      busy = false;
      render();
    }
  }

  /* ---------------- 顶栏 ---------------- */
  function renderHead(d) {
    const r = d.runner;
    const sub = [
      r.bloodline ? `${r.bloodline.name}（${r.bloodline.tier}${r.bloodline.grade > 0 ? ` ${r.bloodline.grade} 层` : ''}）` : '无血统',
      `技能 ${r.skills.length}`,
      d.run && !d.run.settled ? `${d.run.title} 第 ${d.run.turn}/${d.run.turns} 回合` : '在主神空间',
    ].join(' · ');

    return h('div', { class: 'mg-head' },
      h('div', { class: 'mg-orb' }),
      h('div', { class: 'mg-id' },
        h('div', { class: 'mg-name', text: r.name }),
        h('div', { class: 'mg-sub', text: sub }),
      ),
      h('div', { class: 'mg-badges' },
        h('div', { class: 'mg-badge gene' },
          h('span', { class: 'k', text: '基因锁' }),
          h('span', { class: 'v', text: `${r.gene.tier} 阶` }),
        ),
        h('div', { class: 'mg-badge' },
          h('span', { class: 'k', text: '心魔' }),
          h('span', { class: 'v', text: `${r.gene.karma}/${r.gene.karmaCap}`, style: r.gene.karma > 0 ? { color: '#d98b80' } : null }),
        ),
        h('div', { class: 'mg-badge gold' },
          h('span', { class: 'k', text: '奖励点' }),
          h('span', { class: 'v', text: fmt(d.wallet.points) }),
        ),
        h('div', { class: 'mg-plots' },
          ['D', 'C', 'B', 'A', 'S'].map((t) => {
            const n = d.wallet.plots[t] ?? 0;
            return h('span', { class: `mg-plot ${n > 0 ? 'on ' + t : ''}`, text: n > 0 ? `${t}${n}` : t });
          }),
        ),
      ),
    );
  }

  /* ---------------- 角色卡 ---------------- */
  function renderCard(d) {
    const r = d.runner;
    return h('div', {},
      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '属性' }),
        h('div', { class: 'mg-attrs' },
          r.attrs.map((a) => h('div', { class: 'mg-attr', title: a.bonus ? `基础 ${a.base}，血统 ${a.bonus > 0 ? '+' : ''}${a.bonus}` : '' },
            h('div', { class: 'k', text: a.label }),
            h('div', { class: 'v' }, String(a.value), a.bonus ? h('em', { text: `${a.bonus > 0 ? '+' : ''}${a.bonus}` }) : null),
          )),
        ),
        h('div', { class: 'mg-bars' },
          h('div', { class: 'mg-bar' },
            h('span', { class: 'lbl', text: '生命' }),
            h('div', { class: 'mg-track hp' }, h('i', { style: { width: `${Math.min(100, (r.hp / Math.max(1, r.hpMax)) * 100)}%` } })),
            h('span', { class: 'num', text: `${r.hp}/${r.hpMax}` }),
          ),
          h('div', { class: 'mg-bar' },
            h('span', { class: 'lbl', text: '理智' }),
            h('div', { class: 'mg-track san' }, h('i', { style: { width: `${Math.min(100, (r.san / Math.max(1, r.sanMax)) * 100)}%` } })),
            h('span', { class: 'num', text: `${r.san}/${r.sanMax}` }),
          ),
        ),
      ),

      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h row' }, '基因锁', h('span', { class: 'spacer' }),
          h('span', { class: 'mg-tag soft', text: `承载上限 ${r.gene.cap} 阶` })),
        h('div', { class: 'mg-locks' },
          [1, 2, 3, 4, 5].map((i) => h('div', {
            class: `mg-lock ${r.gene.tier >= i ? 'on' : ''} ${r.gene.tier + 1 === i ? 'cur' : ''}`,
            text: `${ROMAN[i - 1]}阶`,
          })),
        ),
        h('div', { class: 'mg-line', style: { marginTop: '8px' } },
          h('span', { text: r.gene.tier === 0
            ? '还没开锁。第一次濒死时主神会给一次机会——那不是奖励，是赌。'
            : `已开到 ${r.gene.tier} 阶。心魔 ${r.gene.karma}/${r.gene.karmaCap}，装满就入魔。` }),
        ),
      ),

      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '血统' }),
        r.bloodline
          ? h('div', {},
            h('div', { class: 'mg-line' },
              h('span', { class: 'mg-tag ' + r.bloodline.tier, text: r.bloodline.tier }),
              h('span', { class: 'mg-tag soft', text: r.bloodline.sys }),
              r.bloodline.grade > 0 ? h('span', { class: 'mg-tag warn', text: `浓度 ${r.bloodline.grade}/${r.bloodline.gradeMax}` }) : null,
              h('b', { text: r.bloodline.name }),
            ),
            h('div', { class: 'mg-line' }, h('span', {}, h('b', { text: '能力　' }), r.bloodline.ability)),
            h('div', { class: 'mg-line', style: { color: '#b98a80' } }, h('span', {}, h('b', { text: '代价　' }), r.bloodline.cost)),
          )
          : h('div', { class: 'mg-line' }, h('span', { text: '身上还没有血统。去兑换里挑一个——这一步不可逆。' })),
      ),

      r.skills.length ? h('div', { class: 'mg-card' },
        h('div', { class: 'mg-fold', onclick: () => { folded.skills = !folded.skills; render(); } },
          h('span', { class: 'ttl', text: `技能 ${r.skills.length}` }),
          folded.skills ? h('span', { class: 'sm', text: r.skills.map((s) => s.name).join(' · ') }) : null,
          h('span', { class: 'arw', text: folded.skills ? '▸' : '▾' }),
        ),
        folded.skills ? null : h('div', { class: 'mg-list', style: { marginTop: '10px' } },
          r.skills.map((s) => h('div', { class: 'mg-item' },
            h('div', { class: 'm' },
              h('div', { class: 't' }, s.name, ' ', h('span', { class: 'mg-tag ' + s.tier, text: s.tier }), ' ', h('span', { class: 'mg-tag soft', text: s.type })),
              h('div', { class: 'd', text: s.desc }),
            ),
          ))),
      ) : null,

      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-fold', onclick: () => { folded.inv = !folded.inv; render(); } },
          h('span', { class: 'ttl', text: `背包 ${r.inv.reduce((a, b) => a + b.n, 0)}` }),
          folded.inv && r.inv.length
            ? h('span', { class: 'sm', text: r.inv.map((it) => `${it.name}×${it.n}`).join(' · ') })
            : null,
          h('span', { class: 'arw', text: folded.inv ? '▸' : '▾' }),
        ),
        folded.inv ? null : (r.inv.length
          ? h('div', { class: 'mg-list', style: { marginTop: '10px' } }, r.inv.map((it) => h('div', { class: 'mg-item' },
            h('div', { class: 'm' },
              h('div', { class: 't' }, `${it.name} ×${it.n}`, ' ', h('span', { class: 'mg-tag ' + it.tier, text: it.tier })),
              h('div', { class: 'd', text: it.desc }),
            ),
          )))
          : h('div', { class: 'mg-empty', style: { padding: '14px' }, text: '背包是空的。下一局你会需要它。' })),
      ),
    );
  }

  /* ---------------- 主神空间 ---------------- */
  function renderHome(d) {
    const locked = d.runner.gene.karma >= d.runner.gene.karmaCap;
    return h('div', {},
      h('div', { class: 'mg-h', text: '可进入的副本' }),
      locked ? h('div', { class: 'mg-msg on bad', style: { marginBottom: '12px' },
        text: '心魔已经满了（3/3），主神不会放你进任何世界。先去兑换里净化。' }) : null,

      ...(() => {
        // 十个副本平铺会变成一条看不见底的列表，所以按分区折成三组。
        // 组内按评级从轻到重，让「下一步该打哪个」一眼看得出来。
        const ord = { D: 0, C: 1, B: 2, A: 3, S: 4 };
        const card = (w) => h('div', { class: `mg-world ${w.cleared ? 'done' : ''}` },
          h('h3', {}, w.title, ' ', h('span', { class: 'mg-tag ' + w.rating, text: w.rating })),
          h('div', { class: 'sub', text: `${w.subtitle}　·　${w.turns} 回合${w.mate ? `　·　同伴 ${w.mate.name}` : ''}` }),
          h('div', { class: 'brf', text: w.brief }),
          // 进副本之前该知道这四条叫什么、值多少——尤其「有没有 B 级剧情」直接决定去不去。
          w.sideList?.length ? h('div', { class: 'mg-sides' },
            h('b', { text: '支线　' }),
            w.sideList.map((sd) => `${sd.desc}${sd.plot ? `（${sd.plot}）` : ''}`).join('　·　'),
          ) : null,
          h('div', { class: 'foot' },
            h('span', {}, '主线保底 ', h('b', { text: fmt(w.main) })),
            w.cleared ? h('span', { class: 'mg-tag', style: { color: '#7fbfb5', background: '#1d2725' }, text: '通关过' }) : null,
            h('span', { style: { marginLeft: 'auto' } },
              h('button', {
                class: 'mg-btn acc xs',
                disabled: busy || !!d.run || locked,
                text: d.run ? '副本中' : '进入',
                onclick: () => act('enter', w.id),
              }),
            ),
          ),
        );

        const bandNames = [...new Set(d.worlds.map((w) => w.band || '新手'))];
        return bandNames.flatMap((band) => {
          const list = d.worlds.filter((w) => (w.band || '新手') === band)
            .sort((a, b) => (ord[a.rating] ?? 9) - (ord[b.rating] ?? 9));
          if (!list.length) return [];
          const done = list.filter((w) => w.cleared).length;
          return [
            h('div', { class: 'mg-band' },
              h('span', { class: 'b', text: band }),
              h('span', { class: 'n', text: `${done}/${list.length} 通关` }),
              h('span', { class: 'line' }),
            ),
            ...list.map(card),
          ];
        });
      })(),

      h('div', { class: 'mg-card', style: { marginTop: '14px' } },
        h('div', { class: 'mg-h', text: '这个世界怎么玩' }),
        h('div', { class: 'mg-line' }, h('span', {},
          '进副本是一回合一次选择：带判定的要掷 D100，加属性×2 对 DC。',
          '失败不等于死，默认是掉血、掉理智、丢线索——只有明确标了致命的那几处会碰死亡判定。')),
        h('div', { class: 'mg-line' }, h('span', {},
          '活到最后一回合才有主线点数。中途死了会被抹杀：本局收益清零，复活一次。',
          '前两次会触发「主神怜悯」，只清点数不抹杀。')),
        h('div', { class: 'mg-line' }, h('span', {},
          '支线剧情（D/C/B/A/S）比点数稀有，只能靠改变原剧情拿到——救一个本该死的人、放走一个本该发生的结局。')),
      ),

      h('div', { class: 'mg-card', style: { marginTop: '11px' } },
        h('div', { class: 'mg-h', text: '她会不会自己走' }),
        h('div', { class: 'mg-line' }, h('span', {
          text: d.perm.autoRun
            ? '会自动：没人看着的时候，她会自己进副本、自己选动作。回来看到的是进展，不是空白。'
            : '不自动：她等你决定。关掉之后，桌面上的她就只是坐在那里。',
        })),
        h('div', { class: 'mg-line' }, h('span', {
          text: d.perm.allowSpend
            ? '兑换：允许她自己花点数。换血统不可逆，介意的话去设置里关掉。'
            : '兑换：只认你点。她自己伸不到手。',
        })),
      ),
    );
  }

  /* ---------------- 兑换 ---------------- */

  /** 血统浓度卡：买过血统之后，唯一还能往上走的路。 */
  function renderGrade(s) {
    const g = s.grade;
    if (!g || !g.owned) return null;
    if (g.grade >= g.max) {
      return h('div', { class: 'mg-card', style: { marginBottom: '12px' } },
        h('div', { class: 'mg-h row' }, '血统浓度', h('span', { class: 'spacer' }),
          h('span', { class: 'mg-tag warn', text: `已到顶 ${g.max}/${g.max}` })),
        h('div', { class: 'mg-line' }, h('span', { text: '三层都叠满了。再往上不是人，是别的东西。' })),
      );
    }
    return h('div', { class: 'mg-card', style: { marginBottom: '12px' } },
      h('div', { class: 'mg-h row' }, '血统浓度', h('span', { class: 'spacer' }),
        h('span', { class: 'mg-tag soft', text: `${g.grade} / ${g.max} 层` })),
      h('div', { class: 'mg-line' }, h('span', {
        text: '每叠一层：血统给的属性 +50%，能承载的基因锁 +1 阶；代价是理智上限 −10、心魔能装的空间 −1 级。不能撤销。',
      })),
      h('button', {
        class: 'mg-btn ' + (g.can ? 'acc' : ''), style: { marginTop: '9px' },
        disabled: busy || !g.can,
        text: `叠到第 ${g.next} 层（${fmt(g.points)} 点${g.plot ? ' + ' + g.plot : ''}）`,
        onclick: () => {
          if (!confirm(`把血统浓度叠到第 ${g.next} 层？\n理智上限 −10，心魔上限 −1。不可撤销。`)) return;
          act('do', 'grade');
        },
      }),
    );
  }

  function renderShop(d) {
    const s = d.shop;
    const tabs = [
      ['attr', '属性'],
      ['bloodline', '血统'],
      ['skill', '技能'],
      ['item', '道具'],
    ];

    const bar = h('div', { class: 'mg-tabs' }, tabs.map(([k, label]) =>
      h('button', {
        class: `mg-tab ${shopTab === k ? 'on' : ''}`,
        text: label,
        onclick: () => { shopTab = k; render(); },
      })));

    let body = null;

    if (shopTab === 'attr') {
      body = h('div', { class: 'mg-list' }, s.attr.map((a) => h('div', { class: 'mg-item' },
        h('div', { class: 'm' },
          h('div', { class: 't' }, `${a.label}　${a.cur} / ${a.max}`),
          h('div', { class: 'd', text: '影响：' + ({
            str: '近战、破拆、挣脱', agi: '闪避、潜行、先手',
            con: '生命上限、抗性', int: '破解、医药、推演', per: '侦查、识破、听声',
          }[a.key] ?? '') }),
        ),
        h('div', { style: { textAlign: 'right', flex: 'none' } },
          h('div', { style: { color: a.can ? 'var(--gold)' : 'var(--dim3)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' },
            text: a.cost == null ? '已满' : fmt(a.cost) }),
          h('button', {
            class: 'mg-btn xs acc', style: { marginTop: '4px' },
            disabled: busy || !a.can, text: a.cost == null ? '满' : '+1',
            onclick: () => act('do', 'attr', a.key),
          }),
        ),
      )));

      if (s.purify.karma > 0) {
        body.append(h('div', { class: 'mg-card', style: { marginTop: '12px' } },
          h('div', { class: 'mg-h', text: '净化心魔' }),
          h('div', { class: 'mg-line' }, h('span', {
            text: `身上有 ${s.purify.karma} 级心魔。装满 ${s.purify.cap} 级会入魔：桌宠变暗、进不了任何副本。`
              + `净化要 ${fmt(s.purify.cost)} 点，代价是理智掉到六成。`,
          })),
          h('button', {
            class: 'mg-btn', style: { marginTop: '8px' },
            disabled: busy || !s.purify.can, text: `净化（${fmt(s.purify.cost)} 点）`,
            onclick: () => act('do', 'purify'),
          }),
        ));
      }
    }

    if (shopTab === 'bloodline') {
      const sysList = [...new Set(s.bloodlines.map((b) => b.sys))];
      // 152 条血统平铺着读不完，先按等级分区，再按体系筛。
      const tiers = ['D', 'C', 'B', 'A', 'S'];
      const tierChips = h('div', { class: 'mg-chips' },
        h('button', {
          class: `mg-chip ${shopFilter.tier === 'all' ? 'on' : ''}`,
          text: `全部 ${s.bloodlines.length}`,
          onclick: () => { shopFilter.tier = 'all'; render(); },
        }),
        ...tiers.map((t) => h('button', {
          class: `mg-chip ${shopFilter.tier === t ? 'on' : ''}`,
          text: `${t} ${s.bloodlines.filter((b) => b.tier === t).length}`,
          onclick: () => { shopFilter.tier = t; render(); },
        })),
        h('button', {
          class: `mg-chip tog ${shopFilter.buyable ? 'on' : ''}`,
          text: '只看买得起',
          onclick: () => { shopFilter.buyable = !shopFilter.buyable; render(); },
        }),
      );
      const chips = h('div', { class: 'mg-chips' },
        h('button', {
          class: `mg-chip ${shopFilter.sys === 'all' ? 'on' : ''}`,
          text: '全体系',
          onclick: () => { shopFilter.sys = 'all'; render(); },
        }),
        ...sysList.map((sys) => h('button', {
          class: `mg-chip ${shopFilter.sys === sys ? 'on' : ''}`,
          text: `${sys} ${s.bloodlines.filter((b) => b.sys === sys).length}`,
          onclick: () => { shopFilter.sys = sys; render(); },
        })),
      );

      const list = s.bloodlines.filter((b) => (shopFilter.sys === 'all' || b.sys === shopFilter.sys)
        && (shopFilter.tier === 'all' || b.tier === shopFilter.tier)
        && (!shopFilter.buyable || b.can || b.owned));

      body = h('div', {},
        renderGrade(s),
        tierChips,
        chips,
        h('div', { class: 'mg-line', style: { marginBottom: '8px' } },
          h('span', { text: d.runner.bloodline
            ? `列出 ${list.length} 条。买不起的也列着——价钱和代价先看清楚，再决定攒多久。想换另一条走「重铸」：价钱一点五倍，浓度清零，旧的血回不来。`
            : `列出 ${list.length} 条。买不起的也列着——价钱和代价先看清楚，再决定攒多久。一个人只能有一条血统。` })),
        list.length
          ? h('div', { class: 'mg-list' }, list.map((b) => h('div', { class: 'mg-item', style: { flexDirection: 'column', alignItems: 'stretch', gap: '6px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } },
              h('span', { style: { fontSize: '12.5px', fontWeight: '600' }, text: b.name }),
              h('span', { class: 'mg-tag ' + b.tier, text: b.tier }),
              h('span', { class: 'mg-tag soft', text: b.sys }),
              h('span', { class: 'mg-tag soft', text: `承载 ${b.geneCap} 阶` }),
              h('span', { style: { marginLeft: 'auto', color: b.can ? 'var(--gold)' : 'var(--dim3)', fontSize: '11.5px', fontVariantNumeric: 'tabular-nums' } },
                `${fmt(b.price)}${b.plot ? ' + ' + b.plot : ''}`),
              h('button', {
                class: 'mg-btn xs ' + (b.can ? 'acc' : ''), style: { marginLeft: '8px' },
                disabled: busy || !b.can,
                text: b.owned ? '已融合' : b.can ? (b.swap ? '重铸' : '融合') : '不足',
                onclick: () => {
                  const q = b.swap
                    ? `剥离重铸成「${b.name}」？\n价钱：${fmt(b.price)}${b.plot ? ' + ' + b.plot : ''}（一点五倍）\n浓度会清零，旧的血统不会回来。\n代价：${b.cost}`
                    : `融合「${b.name}」？\n代价：${b.cost}\n一个人只能有一条血统，之后想换只能重铸。`;
                  if (!confirm(q)) return;
                  act('do', 'bloodline', b.id, b.swap ? 'swap' : '');
                },
              }),
            ),
            h('div', { style: { fontSize: '11px', color: 'var(--dim)', lineHeight: '1.6' }, text: b.ability }),
            h('div', { style: { fontSize: '10.5px', color: '#b98a80', lineHeight: '1.5' }, text: `代价：${b.cost}` }),
            h('div', { style: { fontSize: '10px', color: 'var(--dim3)' },
              text: Object.entries(b.attrs).map(([k, v]) => `${({ str: '力量', agi: '敏捷', con: '体质', int: '智力', per: '感知' })[k]}+${v}`).join('　') }),
          )))
          : h('div', { class: 'mg-empty', text: '这个筛选条件下没有东西。' }),
      );
    }

    if (shopTab === 'skill') {
      body = h('div', { class: 'mg-list' }, s.skills.map((k) => h('div', { class: 'mg-item', style: { flexDirection: 'column', alignItems: 'stretch', gap: '5px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } },
          h('span', { style: { fontSize: '12.5px', fontWeight: '600' }, text: k.name }),
          h('span', { class: 'mg-tag ' + k.tier, text: k.tier }),
          h('span', { class: 'mg-tag soft', text: k.type }),
          h('span', { style: { marginLeft: 'auto', color: k.can ? 'var(--gold)' : 'var(--dim3)', fontSize: '11.5px', fontVariantNumeric: 'tabular-nums' } },
            `${fmt(k.price)}${k.plot ? ' + ' + k.plot : ''}`),
          h('button', {
            class: 'mg-btn xs ' + (k.can ? 'acc' : ''), style: { marginLeft: '8px' },
            disabled: busy || !k.can, text: k.owned ? '已掌握' : k.can ? '学' : '不足',
            onclick: () => act('do', 'skill', k.id),
          }),
        ),
        h('div', { style: { fontSize: '11px', color: 'var(--dim)', lineHeight: '1.6' }, text: k.desc }),
      )));
    }

    if (shopTab === 'item') {
      body = h('div', { class: 'mg-list' }, s.items.map((it) => h('div', { class: 'mg-item' },
        h('div', { class: 'm' },
          h('div', { class: 't' }, it.name, ' ', h('span', { class: 'mg-tag ' + it.tier, text: it.tier }),
            ' ', h('span', { class: 'mg-tag soft', text: it.type }),
            it.have ? h('span', { style: { color: 'var(--dim2)', fontSize: '10.5px' }, text: `　持有 ${it.have}` }) : null),
          h('div', { class: 'd', text: it.desc }),
        ),
        h('div', { style: { textAlign: 'right', flex: 'none' } },
          h('div', { style: { color: it.can ? 'var(--gold)' : 'var(--dim3)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }, text: fmt(it.price) }),
          h('button', {
            class: 'mg-btn xs acc', style: { marginTop: '4px' }, disabled: busy || !it.can, text: '买',
            onclick: () => act('do', 'item', it.id),
          }),
        ),
      )));
    }

    return h('div', {}, bar, body);
  }

  /* ---------------- 履历 ---------------- */
  function renderLog(d) {
    return h('div', {},
      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '战绩' }),
        h('div', { class: 'mg-line' }, h('span', {}, '进过 ', h('b', { text: String(d.meta.runs) }), ' 次副本，活着出来 ',
          h('b', { text: String(d.meta.cleared) }), ' 次，被抹杀 ', h('b', { text: String(d.meta.failed) }), ' 次。')),
        h('div', { class: 'mg-line' }, h('span', {}, '最高单次 ', h('b', { text: fmt(d.meta.bestPoints) }), ' 点。击杀记录 ',
          h('b', { text: String(d.stats.kills ?? 0) }), ' 个。')),
      ),
      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '最近发生的事' }),
        d.log.length
          ? h('div', {}, d.log.map((l) => h('div', { class: `mg-log ${l.kind}` }, l.text)))
          : h('div', { class: 'mg-empty', text: '还没有记录。' }),
      ),
    );
  }

  /* ---------------- 手记 ---------------- */
  function renderJournal(d) {
    const posts = d.journals ?? [];
    if (!posts.length) {
      return h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '轮回手记' }),
        h('div', { class: 'mg-empty', text: '还没有手记。打完第一局，这里会有她自己写的一段话。' }),
      );
    }
    return h('div', {},
      h('div', { class: 'mg-card', style: { marginBottom: '12px' } },
        h('div', { class: 'mg-h', text: '轮回手记' }),
        h('div', { class: 'mg-line' }, h('span', {
          text: `进过 ${d.meta.runs} 次副本，留下 ${posts.length} 篇。她写得不勤，但每一篇都是真的。`,
        })),
      ),
      ...posts.map((p) => h('div', { class: `mg-post ${p.alive ? '' : 'dead'}` },
        h('div', { class: 'top' },
          h('span', { class: 't', text: p.title }),
          h('span', { class: 'mg-tag soft', text: p.ending }),
          h('span', { class: 'd', text: (p.at ?? '').slice(0, 10) }),
        ),
        h('div', { class: 'tx', text: p.text }),
        h('div', { class: 'end', text: p.alive
          ? `+${fmt(p.points)} 点 · 走了 ${p.turns} 回合`
          : `被抹杀 · 走了 ${p.turns} 回合` }),
      )),
    );
  }

  /* ---------------- 推演 ---------------- */
  function renderRun(d) {
    const r = d.run;

    if (r.settled && r.report) return renderSettle(d);

    const dots = [];
    for (let i = 0; i < r.turns; i += 1) dots.push(h('i', { class: i < r.turn ? 'on' : '' }));

    const opts = r.opts.map((o) => {
      const risk = o.kind === 'check' && o.dc >= 60;
      const hint = o.kind === 'check'
        ? `${o.attrLabel} 判定 · DC ${o.dc}（${o.dcLabel}）`
        : (o.note || '不用判定');
      const btn = h('button', {
        class: `mg-opt ${risk ? 'risk' : o.kind === 'flat' ? 'safe' : ''}`,
        disabled: busy || !o.ok,
        onclick: () => act('pick', o.i),
      },
        h('span', { class: 'k', text: String(o.i) }),
        h('span', { class: 'm' }, o.label,
          h('span', { class: `hint ${o.ok ? '' : 'bad'}`, text: o.ok ? hint : `${hint}　—— ${o.reason}` }),
        ),
      );
      // 保底只对判定有意义。没有支线剧情、或者这条本来就不判定，就别多画一个按不动的按钮。
      if (o.kind !== 'check' || !d.insure?.can) return h('div', { class: 'mg-optrow' }, btn);
      return h('div', { class: 'mg-optrow' }, btn,
        h('button', {
          class: 'mg-insure',
          title: `判定没过时自动重掷一次，取较好的结果，扣 1 个 ${d.insure.tier} 级支线剧情。过了不扣，大失败保不了。`,
          disabled: busy || !o.ok,
          onclick: () => act('pick', o.i, true),
        }, '保底', h('b', { text: d.insure.tier })),
      );
    });

    const main = h('div', {},
      h('div', { class: 'mg-scene' },
        h('span', { class: 'idx', text: `第 ${r.turn} / ${r.turns} 回合` }),
        h('span', { class: 'nm', text: r.scene }),
        h('div', { class: 'mg-pressure' },
          h('span', { class: 'lb', text: r.pressure.label }),
          h('span', { class: 'vl', text: String(r.pressure.left) }),
          h('div', { class: 'mg-dots' }, dots),
        ),
      ),
      h('div', { class: 'mg-text', text: r.text }),

      // 背包里的东西现在能自己用。血少了打一针，理智低了吃一片。
      d.usable.length ? h('div', { class: 'mg-use' },
        h('span', { class: 'lb', text: '能用' }),
        ...d.usable.map((u) => h('button', {
          class: 'mg-btn xs',
          disabled: busy,
          title: u.desc,
          text: `${u.name}${u.n == null ? '' : ` ×${u.n}`}${u.heal ? ` +${u.heal}` : u.san ? ` +${u.san}` : ''}`,
          onclick: () => act('use', u.id),
        })),
        r.gear ? h('span', { class: 'mg-gear' },
          r.gear.dodge ? h('span', { text: `闪避 ${r.gear.dodge}` }) : null,
          r.gear.reroll ? h('span', { text: `重掷 ${r.gear.reroll}` }) : null,
          r.gear.autoPass ? h('span', { text: `改判 ${r.gear.autoPass}` }) : null,
          r.gear.revive ? h('span', { text: `复活 ${r.gear.revive}` }) : null,
          r.gear.armor ? h('span', { text: `护甲 ${r.gear.armor}` }) : null,
        ) : null,
      ) : null,

      r.geneOffer ? renderGamble(r.geneOffer) : null,

      h('div', { class: 'mg-opts' }, opts),

      h('div', { style: { display: 'flex', gap: '8px', marginTop: '13px', flexWrap: 'wrap' } },
        h('span', { style: { fontSize: '10.5px', color: 'var(--dim2)', alignSelf: 'center' } },
          `支线 ${r.sides.length} 条 · 主线 ${fmt(d.worlds.find((w) => w.id === r.worldId)?.main ?? 0)} 点`),
        h('span', { style: { flex: '1' } }),
        h('button', {
          class: 'mg-btn ghost xs', disabled: busy, text: '撤退（判失败，保住命）',
          onclick: () => { if (confirm('提前撤退会判定主线失败，点数清零。确定？')) act('flee'); },
        }),
      ),
    );

    const side = h('div', { class: 'mg-side' },
      h('div', { class: 'mg-box' },
        h('div', { class: 'mg-h', text: '状态' }),
        h('div', { class: 'mg-bar' },
          h('span', { class: 'lbl', text: '生命' }),
          h('div', { class: 'mg-track hp' }, h('i', { style: { width: `${Math.min(100, (d.runner.hp / Math.max(1, d.runner.hpMax)) * 100)}%` } })),
          h('span', { class: 'num', text: `${d.runner.hp}/${d.runner.hpMax}` }),
        ),
        h('div', { class: 'mg-bar', style: { marginTop: '5px' } },
          h('span', { class: 'lbl', text: '理智' }),
          h('div', { class: 'mg-track san' }, h('i', { style: { width: `${Math.min(100, (d.runner.san / Math.max(1, d.runner.sanMax)) * 100)}%` } })),
          h('span', { class: 'num', text: `${d.runner.san}/${d.runner.sanMax}` }),
        ),
        h('div', { style: { fontSize: '10px', color: 'var(--dim3)', marginTop: '7px' },
          text: `基因锁 ${d.runner.gene.tier} 阶 · 心魔 ${d.runner.gene.karma}/${d.runner.gene.karmaCap} · ${fmt(d.wallet.points)} 点` }),
        d.mate && d.mate.joined
          ? h('div', { class: `mg-mate ${d.mate.alive ? '' : 'gone'}` },
            h('div', {},
              h('div', { class: 'nm', text: d.mate.name }),
              h('div', { class: 'rl', text: d.mate.alive
                ? `${d.mate.role}　·　信任 ${d.mate.trust}/3`
                : (d.mate.how || '没能出来') }),
            ),
            h('div', { class: 'tr' }, [1, 2, 3].map((i) => h('i', { class: i <= d.mate.trust ? 'on' : '' }))),
          )
          : null,
      ),

      h('div', { class: 'mg-box scroll' },
        h('div', { class: 'mg-h', text: '走过的' }),
        r.trail.length
          ? r.trail.map((t) => h('div', { class: 'mg-trail' },
            h('span', { class: 'n', text: `第${t.turn}` }),
            h('span', { class: 'l', text: t.label, title: `${t.scene}｜${t.label}${t.roll ? `（${t.roll} vs ${t.dc}）` : ''}` }),
            t.roll ? h('span', { class: `r ${t.success ? 'ok' : 'no'}`, text: t.success ? '过' : '折' }) : h('span', { class: 'r', text: '—' }),
          ))
          : h('div', { style: { fontSize: '10.5px', color: 'var(--dim3)' }, text: '还没走。' }),
      ),

      h('div', { class: 'mg-box scroll' },
        h('div', { class: 'mg-h', text: '记录' }),
        d.log.slice(0, 10).map((l) => h('div', { class: `mg-log ${l.kind}` }, l.text)),
      ),
    );

    return h('div', { class: 'mg-run' }, main, side);
  }

  function renderGamble(offer) {
    return h('div', { class: 'mg-gamble' },
      h('h4', { text: '生命归零。要不要开锁？' }),
      h('p', { text: `主神给了一次机会：${offer.name}（${offer.desc}）。` }),
      h('p', { text: `成功率 ${Math.round(offer.chance * 100)}%。成了判定 +${offer.gain * 2}，失败心魔 +${offer.karma}。` }),
      offer.overCap ? h('p', { style: { color: '#c47a70' }, text: `注意：当前血统只能承载 ${offer.cap} 阶，这一阶的成功率已经砍半。` }) : null,
      h('div', { class: 'acts' },
        h('button', { class: 'mg-btn', disabled: busy, text: '不开。认命', onclick: () => act('gene', 'no') }),
        h('button', { class: 'mg-btn acc', disabled: busy, text: '开', onclick: () => act('gene', 'yes') }),
      ),
    );
  }

  /* ---------------- 结算 ---------------- */
  function renderSettle(d) {
    const r = d.run;
    const rep = r.report;
    if (!rep) return h('div', { class: 'mg-empty', text: '结算数据丢了。回主神空间重来一局吧。' });

    const rows = rep.rows.map((row, i) => {
      const cls = `${row.bad ? 'bad' : row.miss ? 'miss' : ''}${row.minor ? ' minor' : ''}`;
      const v = row.points ? `${row.points > 0 ? '+' : ''}${fmt(row.points)}` : '—';
      return h('div', { class: `mg-row ${cls}`, style: { animationDelay: `${i * 70}ms` } },
        h('span', { class: 'l' }, row.label, row.plot ? h('span', { class: 'mg-tag ' + row.plot, style: { marginLeft: '7px' }, text: `${row.plot} 级` }) : null),
        h('span', { class: `v ${row.points ? '' : 'zero'}` }, v),
      );
    });

    const trail = (r.trail ?? []).map((t) => h('div', { class: 'mg-trail' },
      h('span', { class: 'n', text: `第${t.turn}` }),
      h('span', { class: 'l', text: t.label, title: t.scene }),
      t.roll ? h('span', { class: `r ${t.success ? 'ok' : 'no'}`, text: t.success ? '过' : '折' }) : h('span', { class: 'r', text: '—' }),
    ));

    return h('div', {},
      h('div', { class: 'mg-settle' },
        h('div', { class: 'mg-settle-title', text: rep.ending.title }),
        h('div', { class: 'mg-settle-text', text: rep.ending.text }),
      ),
      h('div', { style: { maxWidth: '620px', margin: '0 auto' } },
        rows,
        h('div', { class: 'mg-total' },
          h('span', { class: 'k', text: '本次结算' }),
          h('span', { class: 'v', text: fmt(rep.points) }),
        ),
        trail.length ? h('div', { style: { marginTop: '22px' } },
          h('div', { class: 'mg-h', text: '这一局怎么走过来的' }),
          h('div', { class: 'mg-box' }, trail),
        ) : null,
        h('div', { style: { display: 'flex', gap: '9px', justifyContent: 'flex-end', marginTop: '20px' } },
          h('button', { class: 'mg-btn', disabled: busy, text: '去看兑换', onclick: () => { act('leave').then(() => { view = 'shop'; render(); }); } }),
          h('button', { class: 'mg-btn acc', disabled: busy, text: '回主神空间', onclick: () => act('leave') }),
        ),
      ),
    );
  }

  /* ---------------- 设置 ---------------- */
  function renderSettings(d) {
    const st = d.settings ?? { difficulty: 'normal', autoSpend: true };
    return h('div', {},
      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '难度' }),
        h('div', { class: 'mg-line' },
          h('span', { text: '难度决定两件事：判定 DC 抬多少、失败时伤害乘多少。'
            + '高级副本另外还有按生命上限算的保底伤害——强化到多少，都会被咬掉一块。' })),
        h('div', { class: 'mg-chips', style: { marginTop: '10px' } },
          (d.difficulties ?? []).map((x) => h('button', {
            class: `mg-chip ${st.difficulty === x.id ? 'on' : ''}`,
            text: `${x.label}　DC +${x.dc}　伤害 ×${x.hazard}`,
            onclick: () => act('setting', 'difficulty', x.id),
          }))),
      ),

      h('div', { class: 'mg-card' },
        h('div', { class: 'mg-h', text: '她自己花钱' }),
        h('div', { class: 'mg-line' },
          h('span', { text: '开着的时候，她打完一局回主神空间会自己买：先净化心魔，'
            + '再换血统、升浓度、学技能，最后把剩下的零钱全塞进最低的那项属性。' })),
        h('button', {
          class: `mg-btn ${st.autoSpend ? 'acc' : ''}`,
          style: { marginTop: '10px' },
          disabled: busy,
          text: st.autoSpend ? '正在自己花 · 点一下关掉' : '停下了 · 点一下让她自己花',
          onclick: () => act('setting', 'autoSpend', !st.autoSpend),
        }),
      ),

      h('div', { class: 'mg-card danger' },
        h('div', { class: 'mg-h', text: '重新开始' }),
        h('div', { class: 'mg-line' },
          h('span', { text: '清空这一份存档：属性回到 10，血统、技能、点数、手记、通关记录全部归零。'
            + '难度和上面的开关会留着。不能撤销。' })),
        h('button', {
          class: 'mg-btn danger', style: { marginTop: '10px' }, disabled: busy, text: '重新开始',
          onclick: () => {
            if (!confirm('确定要重开吗？\n属性、血统、技能、点数、手记、通关记录都会清空，不能撤销。')) return;
            act('reset');
          },
        }),
      ),
    );
  }

  /* ---------------- 主渲染 ---------------- */
  function render() {
    if (!data) {
      root.replaceChildren(h('div', { class: 'mg-empty', text: '正在连主神……' }));
      return;
    }

    const inRun = !!data.run;

    const msgEl = h('div', { class: `mg-msg ${msg ? 'on' : ''} ${msgBad ? 'bad' : ''}`, text: msg });

    let body;
    if (inRun) {
      body = h('div', { class: 'mg-body solo' }, renderRun(data));
    } else {
      const right = (() => {
        if (view === 'shop') return renderShop(data);
        if (view === 'log') return renderLog(data);
        if (view === 'journal') return renderJournal(data);
        if (view === 'settings') return renderSettings(data);
        return renderHome(data);
      })();

      body = h('div', { class: 'mg-body' },
        h('div', { class: 'mg-col' }, renderCard(data)),
        h('div', { class: 'mg-col' },
          h('div', { class: 'mg-tabs' },
            h('button', { class: `mg-tab ${view === 'home' ? 'on' : ''}`, text: '副本', onclick: () => { view = 'home'; render(); } }),
            h('button', { class: `mg-tab ${view === 'shop' ? 'on' : ''}`, text: '兑换', onclick: () => { view = 'shop'; render(); } }),
            h('button', { class: `mg-tab ${view === 'journal' ? 'on' : ''}`, text: '手记', onclick: () => { view = 'journal'; render(); } }),
            h('button', { class: `mg-tab ${view === 'log' ? 'on' : ''}`, text: '履历', onclick: () => { view = 'log'; render(); } }),
            h('button', { class: `mg-tab ${view === 'settings' ? 'on' : ''}`, text: '设置', onclick: () => { view = 'settings'; render(); } }),
          ),
          right,
        ),
      );
    }

    root.replaceChildren(renderHead(data), msgEl, body);
  }

  refresh();
  if (ctx.interval) ctx.interval(refresh, 20000);
}

export default {
  panels: {
    infinity: { mount },
  },
};

/**
 * 副本写法的小工具。抽出来是因为副本要拆成多个文件，
 * 每个文件都得有 roll / flat，放在 worlds.js 里会变成循环依赖。
 */

export const A = ['str', 'agi', 'con', 'int', 'per'];

/** 选项工厂：省掉一堆重复字段，也保证每个选项都有 kind。 */
export function opt(label, extra = {}) {
  return { label, ...extra };
}

/** 判定选项：属性 + DC + 成败两支。 */
export function roll(label, attr, dc, pass, fail, extra = {}) {
  if (!A.includes(attr)) throw new Error('未知属性：' + attr);
  return { label, attr, dc, pass, fail, ...extra };
}

/** 无判定选项：直接生效。 */
export function flat(label, effect, extra = {}) {
  return { label, effect, ...extra };
}

/**
 * 同伴专属选项的门槛。
 *
 * 写成 cond 而不是给选项加新字段，是因为 optionList 只认 cond 一条通路。
 * 多开一条，就多一个「面板上能点、工具里报错」的机会。
 */
export function bond(min, hint) {
  return {
    cond: (s) => Boolean(s.mate?.alive) && (s.mate.trust ?? 0) >= min,
    condHint: hint ?? `需要同伴信任 ≥ ${min}`,
  };
}

/** 评级从轻到重。字符串直接比大小会把 A 排到最前面——那是错的。 */
export const RATING_ORDER = { D: 0, C: 1, B: 2, A: 3, S: 4 };

export function byRating(list) {
  return [...list].sort((a, b) => (RATING_ORDER[a.rating] ?? 9) - (RATING_ORDER[b.rating] ?? 9));
}

/**
 * 结算自检。副本一多，最容易犯的错是「节点数和回合数对不上」——
 * nodeOf 里有个 Math.min 兜着，不会崩，但最后几回合会一直重复同一个场景，
 * 而且没人看得出来。所以每个副本在装配时先自检一遍。
 */
export function audit(w) {
  const errs = [];
  if (!w.id || !w.title) errs.push('缺 id 或 title');
  if (!w.nodes || w.nodes.length !== w.turns) {
    errs.push(`节点数 ${w.nodes?.length} ≠ 回合数 ${w.turns}`);
  }
  for (const [i, n] of (w.nodes ?? []).entries()) {
    if (!n.scene || !n.text) errs.push(`第 ${i + 1} 节点缺 scene 或 text`);
    if (typeof n.opts !== 'function') errs.push(`第 ${i + 1} 节点的 opts 不是函数`);
  }
  if (!w.main?.desc || !Number.isFinite(w.main?.points)) errs.push('main 不完整');
  if (!Array.isArray(w.sides) || !w.sides.length) errs.push('sides 为空');
  if (!Array.isArray(w.endings) || !w.endings.length) errs.push('endings 为空');
  if (typeof w.assess !== 'function') errs.push('缺 assess');
  if (!w.pressure?.label) errs.push('缺 pressure');
  if (w.mate) {
    const m = w.mate;
    if (!m.id || !m.name) errs.push('mate 缺 id 或 name');
    if (!Number.isFinite(m.joinTurn)) errs.push('mate 缺 joinTurn');
    else if (m.joinTurn < 1 || m.joinTurn > w.turns) errs.push(`mate.joinTurn ${m.joinTurn} 超出 ${w.turns} 回合`);
    if (!Number.isFinite(m.trust)) errs.push('mate 缺 trust');
    if (!Number.isFinite(m.bonus?.points)) errs.push('mate 缺 bonus.points');
  }
  if (errs.length) throw new Error(`副本「${w.title ?? w.id}」自检失败：${errs.join('；')}`);
  return w;
}

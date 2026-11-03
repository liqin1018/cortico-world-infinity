/**
 * 技能与道具。
 *
 * 定价三条：D≈500 / C≈1300 / B≈4000 / A≈10000；支线剧情是「凭证」，等级必须与物品等级相同。
 * 能被队友替代的效果便宜（破门），独占信息或改写结果的效果最贵（剧本干涉、命匣）。
 *
 * hook 是引擎真正读的字段，不是文案：
 *   attr      —— 判定加值
 *   dodge     —— 每副本免疫 N 次伤害
 *   heal      —— 局内可使用，恢复 N 点生命（次数见 charges）
 *   breach    —— 可以当破拆包用 N 次
 *   reveal    —— 面板直接显示每个选项的隐藏条件
 *   preview   —— 面板提前显示下一个场景的选项
 *   reroll    —— 每副本自动重掷 N 次失败判定
 *   autoPass  —— 每副本把 N 次失败改判为成功（剧本干涉）
 *   sanHalf   —— 理智损失减半
 *   revive    —— 生命归零时自动复活（次数）
 *   armor     —— 受到的伤害每次减 N
 *   sanShield —— 下一次理智损失降为 1（次数）
 */

export const SKILLS = [
  { id: 'brawl',      name: '基础格斗专精', tier: 'D', price: 500,  plot: 'D', type: '被动', desc: '力量判定 +10。徒手伤害 +2。', hook: { attr: { str: 10 } } },
  { id: 'dodge',      name: '急停闪避',     tier: 'D', price: 400,  plot: 'D', type: '被动', desc: '每副本 3 次，把一次伤害完全躲掉。', hook: { dodge: 3 } },
  { id: 'firstaid',   name: '现场急救',     tier: 'D', price: 600,  plot: 'D', type: '主动', desc: '每副本 2 次，恢复 30 生命。局内用 mg_do action=use 触发。', hook: { heal: 30, charges: 2 } },
  { id: 'gadget',     name: '器物直觉',     tier: 'D', price: 450,  plot: 'D', type: '被动', desc: '智力判定 +10。破解机械、读终端、关阀门都用它。', hook: { attr: { int: 10 } } },
  { id: 'breacher',   name: '破门术',       tier: 'C', price: 1200, plot: 'C', type: '主动', desc: '每副本 1 次，当破拆包用，强制开一扇门。', hook: { breach: 1 } },
  { id: 'holdbreath', name: '屏息',         tier: 'C', price: 1100, plot: 'C', type: '被动', desc: '敏捷判定 +25，潜行、躲藏、先手都吃这个。', hook: { attr: { agi: 25 } } },
  { id: 'insight',    name: '识破',         tier: 'C', price: 1300, plot: 'C', type: '被动', desc: '智力判定 +12，并在面板上显示每个选项的隐藏条件。', hook: { attr: { int: 12 }, reveal: 1 } },
  { id: 'tactics',    name: '战术推演',     tier: 'C', price: 1500, plot: 'C', type: '被动', desc: '面板提前看到下一个场景的选项，方便判断值不值得走。', hook: { preview: 2 } },
  { id: 'ammo',       name: '弹药专家',     tier: 'C', price: 1100, plot: 'C', type: '被动', desc: '感知判定 +12。远程、射击、找弹匣都归它。', hook: { attr: { per: 12 } } },
  { id: 'stealth',    name: '静默行动',     tier: 'C', price: 1200, plot: 'C', type: '被动', desc: '敏捷判定 +15，动作不发出声音。', hook: { attr: { agi: 15 } } },
  { id: 'afterimage', name: '残影步',       tier: 'B', price: 4000, plot: 'B', type: '被动', desc: '敏捷判定 +20，每副本额外 1 次闪避。', hook: { attr: { agi: 20 }, dodge: 1 } },
  { id: 'fieldmedic', name: '战地医师',     tier: 'B', price: 3500, plot: 'B', type: '主动', desc: '每副本 1 次，把生命从 0 拉回 30。', hook: { heal: 30, revive: 1 } },
  { id: 'soulresist', name: '灵魂抗性',     tier: 'B', price: 3800, plot: 'B', type: '被动', desc: '理智损失减半。', hook: { sanHalf: true } },
  { id: 'rulesense',  name: '规则嗅觉',     tier: 'B', price: 4200, plot: 'B', type: '被动', desc: '提前看到下一个场景的选项，并显示隐藏条件。', hook: { preview: 1, reveal: 1 } },
  { id: 'onemore',    name: '一次机会',     tier: 'A', price: 10000, plot: 'A', type: '被动', desc: '每局 1 次，失败的判定自动重掷。', hook: { reroll: 1 } },
  { id: 'script',     name: '剧本干涉',     tier: 'A', price: 14000, plot: 'A', type: '被动', desc: '每局 1 次，把一次失败的判定直接改判为成功。', hook: { autoPass: 1 } },
];

export const ITEMS = [
  // ── 消耗 ─────────────────────────────────────────────────────────
  { id: 'medkit',     name: '急救针',     tier: 'D', price: 300,  type: '消耗', desc: '恢复 25 生命。局内用 mg_do action=use。', hook: { heal: 25 }, stack: 5 },
  { id: 'sedative',   name: '镇定剂',     tier: 'D', price: 250,  type: '消耗', desc: '恢复 15 理智。', hook: { san: 15 }, stack: 5 },
  { id: 'flare',      name: '照明棒',     tier: 'D', price: 200,  type: '消耗', desc: '照亮一处，驱散黑暗惩罚，也能看清暗处的东西。', hook: { light: true }, stack: 5 },
  { id: 'bandage',    name: '止血带',     tier: 'D', price: 150,  type: '消耗', desc: '恢复 10 生命。便宜，但救不了大出血。', hook: { heal: 10 }, stack: 9 },
  { id: 'breach',     name: '破拆包',     tier: 'C', price: 1800, plot: 'C', type: '消耗', desc: '破坏一处封锁结构。比不上破门术，但谁都能用。', hook: { breach: true }, stack: 3 },
  { id: 'antidote',   name: '广谱解药',   tier: 'C', price: 900,  plot: 'C', type: '消耗', desc: '解一次感染、毒素或变异。用掉就没了。', hook: { cure: true }, stack: 2 },
  { id: 'anchor',     name: '锚点符',     tier: 'C', price: 900,  plot: 'C', type: '消耗', desc: '标记一个位置，可强返一次，脱离战线。', hook: { escape: true }, stack: 2 },
  { id: 'filter',     name: '认知滤网',   tier: 'C', price: 1500, plot: 'C', type: '消耗', desc: '本副本内，一次理智损失降为 1。', hook: { sanShield: 1 }, stack: 2 },
  { id: 'timeanchor', name: '时间锚',     tier: 'B', price: 6000, plot: 'B', type: '消耗', desc: '每副本 1 次，失败的判定自动重掷。', hook: { reroll: 1 }, stack: 1 },

  // ── 装备 ─────────────────────────────────────────────────────────
  { id: 'charm',      name: '护身符',     tier: 'D', price: 500,  type: '装备', desc: '每次受到的伤害 −1。', hook: { armor: 1 } },
  { id: 'vest',       name: '防弹背心',   tier: 'C', price: 1600, plot: 'C', type: '装备', desc: '每次受到的伤害 −3。', hook: { armor: 3 } },
  { id: 'plate',      name: '合金护板',   tier: 'B', price: 5000, plot: 'B', type: '装备', desc: '每次受到的伤害 −6，敏捷判定 −5。', hook: { armor: 6, attr: { agi: -5 } } },
  { id: 'soullamp',   name: '魂灯',       tier: 'B', price: 4200, plot: 'B', type: '装备', desc: '生命归零时自动复活一次，回到 20 生命。', hook: { revive: 20 } },
  { id: 'fatebox',    name: '命匣',       tier: 'A', price: 15000, plot: 'A', type: '装备', desc: '生命归零时自动复活一次，回到 50 生命。', hook: { revive: 50 } },
  { id: 'shard',      name: '主神碎片',   tier: 'S', price: 50000, plot: 'S', type: '唯一', desc: '每局 1 次，把一次失败的判定改判为成功。', hook: { autoPass: 1 } },

  // ── 任务道具：买不到，只在副本里拿得到 ──────────────────────────
  { id: 'sample',       name: 'T 病毒样本', tier: 'C', price: 0, type: '任务', desc: '不占背包格。只在对应副本里有意义。', hook: {} },
  { id: 'embryo',       name: '胚胎罐',     tier: 'C', price: 0, type: '任务', desc: '纳德利打算带出岛的东西。罐子上有一层白霜，里面在动。', hook: {} },
  { id: 'necronomicon', name: '亡灵圣经',   tier: 'A', price: 0, type: '任务', desc: '会自己翻页的书。翻到哪一页，取决于它想让你看见什么。', hook: {} },
  { id: 'goldbook',     name: '太阳金经',   tier: 'A', price: 0, type: '任务', desc: '唯一能杀死伊莫顿的东西。念的时候不能念错一个字。', hook: {} },
  { id: 'ring',         name: '至尊魔戒',   tier: 'S', price: 0, type: '任务', desc: '它在找它的主人。它不着急，它有很多时间。', hook: {} },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((s) => [s.id, s]));

/** 所有能买的东西（含技能、道具、装备），兑换页和自动消费共用一张表。 */
export const GEAR_LIST = [
  ...SKILLS.map((s) => ({ ...s, kind: 'skill' })),
  ...ITEMS.filter((i) => i.price > 0).map((i) => ({ ...i, kind: 'item' })),
];

/** 结算时把 hook 里的属性修正汇总成一张表，引擎每次判定前查一次。 */
export function skillAttrBonus(skillIds, attrKey) {
  let n = 0;
  for (const id of skillIds) {
    const s = SKILL_BY_ID[id];
    if (s?.hook?.attr?.[attrKey]) n += s.hook.attr[attrKey];
  }
  return n;
}

/** 装备（买断、不消耗）带来的属性修正。 */
export function itemAttrBonus(inv, attrKey) {
  let n = 0;
  for (const id of Object.keys(inv ?? {})) {
    const it = ITEM_BY_ID[id];
    if (it?.hook?.attr?.[attrKey]) n += it.hook.attr[attrKey];
  }
  return n;
}

export function hasSkill(skillIds, id) {
  return skillIds.includes(id);
}

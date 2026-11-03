/**
 * 引擎：纯函数 + 对 state 的就地修改。不碰文件、不碰宿主、不碰时间戳以外的外部世界。
 *
 * 所有状态变更都走 applyEffect 一个入口。这条纪律的理由很实际：
 * 后期数值一定会乱，只有唯一入口才查得出「这 300 点是谁加的」。
 */
import { makeDice, hashString, d100Check } from './rng.js';
import { BY_ID } from './content/worlds.js';
import { BLOODLINE_BY_ID } from './content/bloodlines.js';
import { SKILL_BY_ID, ITEM_BY_ID, skillAttrBonus, itemAttrBonus } from './content/items.js';

export const ATTR_LABEL = { str: '力量', agi: '敏捷', con: '体质', int: '智力', per: '感知' };
export const ATTR_KEYS = ['str', 'agi', 'con', 'int', 'per'];

/* ---------------- 难度 ---------------- */

/**
 * 难度：判定基准往上抬多少、挨打时伤害乘多少。
 *
 * 只靠降奖励是压不住难度的——真正的问题是「不花钱也能一路走完」。
 * 所以这里两个旋钮一起拧：DC 抬起来，伤害乘上去。
 * 评级越高抬得越多：D 级是教学关，A 级本来就该打不过。
 */
export const DIFFICULTY = {
  easy: { label: '轻松', dc: 0, hazard: 1.0 },
  normal: { label: '标准', dc: 4, hazard: 1.15 },
  hard: { label: '残酷', dc: 9, hazard: 1.45 },
};

export const RATING_DC = { D: 0, C: 2, B: 4, A: 7 };
export const RATING_HAZARD = { D: 1.0, C: 1.1, B: 1.5, A: 1.55 };

/**
 * 高级副本的失败伤害有下限：按生命上限的百分比算。
 *
 * 没有这一条，属性一高生命池就跟着涨，A 级副本的「重伤 20 点」变成擦伤，
 * 强化到最后又回到「怎么打都不死」。有了它，A 级的一次失手永远是四分之一条命——
 * 你变强了，副本没有变弱。
 */
export const RATING_MIN_DMG = { D: 0, C: 0, B: 0, A: 0.05 };

/** 理智也有下限。恐怖副本吓的是人，不是血量——强化到 40 智力也照样会被吓疯。 */
export const RATING_MIN_SAN = { D: 0, C: 0, B: 0, A: 0.04 };

export function difficultyOf(state) {
  return DIFFICULTY[state?.settings?.difficulty] ?? DIFFICULTY.normal;
}

/** 这个副本的判定要加多少 DC。面板和掷骰必须用同一个数。 */
export function dcOffsetOf(state) {
  const w = worldOf(state);
  if (!w) return 0;
  return difficultyOf(state).dc + (RATING_DC[w.rating] ?? 0);
}

/** 伤害倍率。理智不乘——恐惧是心理层面的事，另外算。 */
export function hazardOf(state) {
  const w = worldOf(state);
  if (!w) return 1;
  return difficultyOf(state).hazard * (RATING_HAZARD[w.rating] ?? 1);
}

/* ---------------- 血统浓度 ---------------- */

/**
 * 血统能往上叠三层。
 *
 * 原本一条血统是一次性选择——买错了就是买错了，而且到后期点数没处花。
 * 进阶让「买错」变成「要花更多钱走远」，同时把血统和基因锁的绑定做实：
 * 每叠一层，能承载的基因锁上限 +1，但心魔能装的空间 -1，理智上限 -10。
 *
 * 也就是说，往上走的每一步都是拿人换力量。这符合原作，也符合这个世界的定价逻辑。
 */
export const GRADE_MAX = 3;

/** 从当前浓度升到下一级的价格。按血统本身等级分——A 级进阶当然更贵。 */
export const GRADE_PRICE = {
  D: [8000, 20000, 45000],
  C: [12000, 30000, 65000],
  B: [20000, 50000, 110000],
  A: [32000, 80000, 180000],
  S: [50000, 120000, 260000],
};

export function gradeOf(state) {
  const g = Math.round(Number(state.runner.bloodlineGrade ?? 0));
  return Number.isFinite(g) ? Math.max(0, Math.min(GRADE_MAX, g)) : 0;
}

/** 属性放大：每多一层浓度，血统给的那部分 +50%。 */
export function gradeScale(state) {
  return 1 + 0.5 * gradeOf(state);
}

/** 心魔能装几级。浓度越高，越装不下——满 3 级入魔，这里降到 1 就意味着一失手就满。 */
export function karmaCap(state) {
  const g = gradeOf(state);
  if (g >= 3) return 1;
  if (g >= 1) return 2;
  return 3;
}

/** 下一层要多少钱、要哪个等级的支线剧情。到顶了返回 null。 */
export function gradeCost(state) {
  const bl = bloodlineOf(state);
  if (!bl) return null;
  const g = gradeOf(state);
  if (g >= GRADE_MAX) return null;
  const table = GRADE_PRICE[bl.tier] ?? GRADE_PRICE.C;
  return { next: g + 1, points: table[g], plot: bl.plot, tier: bl.tier };
}

/* ---------------- 派生值 ---------------- */

export function bloodlineOf(state) {
  const id = state.runner.bloodline;
  return id ? BLOODLINE_BY_ID[id] ?? null : null;
}

export function attrsOf(state) {
  const base = { ...state.runner.attrs };
  const bl = bloodlineOf(state);
  if (bl) {
    const s = gradeScale(state);
    for (const [k, v] of Object.entries(bl.attrs)) base[k] = (base[k] ?? 0) + Math.round(v * s);
  }
  // 装备也有属性修正（合金护板：敏捷 −5）。以前只认技能，护甲类的代价等于白写。
  for (const k of ATTR_KEYS) {
    const n = itemAttrBonus(state.runner.inv, k);
    if (n) base[k] = (base[k] ?? 0) + n;
  }
  return base;
}

/* ---------------- 每局的道具与技能次数 ---------------- */

/**
 * 开一局时把这些「次数」算出来：闪避几次、急救几次、能复活几次。
 *
 * 以前这些 hook 只是数据，引擎从来没读过——买了急停闪避、魂灯、战地医师，
 * 效果都是零。次数集中在这里算一次，applyEffect 里扣。
 */
export function gearInit(state) {
  const g = {
    dodge: 0, heal: 0, breach: 0, reroll: 0, autoPass: 0,
    revive: 0, reviveHp: 0, sanShield: 0, armor: 0,
  };
  for (const id of state.runner.skills ?? []) {
    const h = SKILL_BY_ID[id]?.hook ?? {};
    if (h.dodge) g.dodge += h.dodge;
    if (h.heal) g.heal += h.charges ?? 1;
    if (h.breach) g.breach += h.breach;
    if (h.reroll) g.reroll += h.reroll;
    if (h.autoPass) g.autoPass += h.autoPass;
    if (h.revive) {
      g.revive += 1;
      g.reviveHp = Math.max(g.reviveHp, h.revive);
    }
  }
  for (const [id, n] of Object.entries(state.runner.inv ?? {})) {
    const it = ITEM_BY_ID[id];
    const h = it?.hook ?? {};
    if (it?.type === '装备' && n > 0) {
      if (h.armor) g.armor += h.armor;
      if (h.revive) {
        g.revive += 1;
        g.reviveHp = Math.max(g.reviveHp, h.revive);
      }
    }
  }
  return g;
}

/** 惰性初始化：老存档里正在跑的那一局没有 gear 字段。 */
export function gearOf(state) {
  if (!state.run) return null;
  if (!state.run.gear) state.run.gear = gearInit(state);
  return state.run.gear;
}

export function maxHp(state) {
  const a = attrsOf(state);
  const bl = bloodlineOf(state);
  const bonus = bl ? Math.round((bl.hpBonus ?? 0) * gradeScale(state)) : 0;
  return Math.max(10, a.con * 10 + bonus);
}

export function maxSan(state) {
  const a = attrsOf(state);
  const bl = bloodlineOf(state);
  // 浓度每上一层，理智上限再扣 10——这是进阶真正的代价，比点数贵。
  const pen = (bl?.sanPenalty ?? 0) - 10 * gradeOf(state);
  return Math.max(20, a.int * 8 + 20 + state.runner.gene.tier * 5 + pen);
}

export function geneCapOf(state) {
  const bl = bloodlineOf(state);
  // 封在 4 而不是 5：引擎里 GENE_TIERS 只做到四阶，五阶是版本末期内容。
  // 显示一个开不到的数字只会让人以为哪里坏了。
  return Math.min(4, (bl ? bl.geneCap : 1) + gradeOf(state));
}

export function norm(state) {
  const mh = maxHp(state);
  const ms = maxSan(state);
  // 下限必须是 0，不能是 1。
  // 写成 Math.max(1, ...) 的时候，每次判定结束都会把 0 血抬回 1 血——
  // 结果是伤害再多也死不了，濒死、开锁、抹杀这一整条链全是死代码。
  state.runner.hp = Math.max(0, Math.min(state.runner.hp, mh));
  state.runner.san = Math.max(0, Math.min(state.runner.san, ms));
  return state;
}

/* ---------------- 副本视图 ---------------- */

/** 副本数据只认这个视图，不认识 state 的其它字段。 */
export function viewOf(state) {
  return {
    flags: state.run?.flags ?? {},
    // 破门术这类技能在内容里被当成「一件破拆包」来查，所以并进 inv 里。
    inv: { ...(state.runner.inv ?? {}), breach: invCount(state, 'breach') },
    turn: state.run?.turn ?? 0,
    runner: state.runner,
    wallet: state.wallet,
    gene: state.runner.gene,
    mate: state.run?.mate ?? null,
  };
}

/* ---------------- 同伴 ---------------- */

export const MATE_TRUST_MAX = 3;

/** 挡刀消耗的信任。写死在这里——它是平衡参数，不该散到内容里被逐个改写。 */
export const GUARD_COST = 2;

/** 这个副本配的同伴是谁。没配就是 null。 */
export function mateOf(state) {
  return worldOf(state)?.mate ?? null;
}

/**
 * 到点就把同伴放进来。
 *
 * 单独一个函数、而不是塞进 startRun：有些同伴不是一进副本就在的——
 * 咒怨里的理佳要等你先让她进门。joinWhen 不成立就一直等到成立。
 */
export function maybeJoinMate(state) {
  if (!state.run || state.run.mate) return null;
  const def = mateOf(state);
  if (!def) return null;
  if (state.run.turn < def.joinTurn) return null;
  if (typeof def.joinWhen === 'function' && !def.joinWhen(viewOf(state))) return null;

  // 他记不记得你。救出来过的人一见面就把信任给足，被丢下过的人不会。
  const mem = state.meta.mateMemory?.[def.id];
  let base = def.trust ?? 1;
  let memory = 'none';
  if (mem?.saved > 0) { base += 1; memory = 'saved'; }
  else if (mem?.lost > 0) { base -= 1; memory = 'lost'; }

  state.run.mate = {
    id: def.id,
    name: def.name,
    trust: Math.max(0, Math.min(MATE_TRUST_MAX, base)),
    alive: true,
    joinedAt: state.run.turn,
    how: null,
    guardUsed: 0,
    memory,
    seen: mem?.met ?? 0,
  };
  pushLog(state, 'good', memory === 'saved'
    ? `${def.name} 跟上了你——他记得你`
    : memory === 'lost'
      ? `${def.name} 跟上了你，但没有看你`
      : `${def.name} 跟上了你`);
  return state.run.mate;
}

/**
 * 濒死时同伴替你挡一下。
 *
 * 这是「信任」唯一真正值钱的地方：它买的不是加成，是一次不死。
 * 一局一次——第二次他也会怕。
 */
export function mateGuard(state) {
  if (!state.run || state.runner.hp > 0) return null;
  const m = state.run.mate;
  if (!m?.alive || m.trust < GUARD_COST) return null;
  if (m.guardUsed > 0) return null;

  m.guardUsed += 1;
  m.trust = Math.max(0, m.trust - GUARD_COST);
  state.runner.hp = 1;
  state.run.flags.__mateGuard = (state.run.flags.__mateGuard ?? 0) + 1;
  const left = m.trust <= 0;
  if (left) {
    m.alive = false;
    m.how = '信任耗尽';
  }
  pushLog(state, 'good', `${m.name} 替你挡了一下`);
  return {
    name: m.name,
    left,
    line: `${m.name}把你推开，自己顶了上去。`
      + (left ? '回来的时候还在笑，但手一直在抖。那之后没有再跟你说话。' : '伤得不轻，但还站得住。'),
  };
}

/** 这一局的同伴最后怎么了。结算和面板都读这一个口径。 */
export function mateOutcome(state) {
  const def = mateOf(state);
  if (!def) return null;
  const m = state.run?.mate;
  if (!m) return { status: 'none', id: def.id, name: def.name };
  if (!m.alive) return { status: 'lost', id: m.id, name: m.name, how: m.how };
  const ok = typeof def.survives === 'function' ? def.survives(viewOf(state)) : true;
  return ok
    ? { status: 'alive', id: m.id, name: m.name, trust: m.trust }
    : { status: 'lost', id: m.id, name: m.name, how: '没能跟上来' };
}

/* ---------------- 开局 ---------------- */

export function startRun(state, worldId) {
  const w = BY_ID[worldId];
  if (!w) throw new Error('没有这个副本：' + worldId);
  const seed = (hashString(`${state.seed}:${worldId}:${state.meta.runs}`) >>> 0);
  state.run = {
    worldId,
    turn: 1,
    seed,
    flags: {},
    trail: [],
    log: [],
    startedAt: new Date().toISOString(),
    hpStart: maxHp(state),
    sanStart: maxSan(state),
    geneOfferAt: null,
    deaths: 0,
    mate: null,
    gear: null,
    settled: false,
  };
  state.run.gear = gearInit(state);
  state.runner.hp = maxHp(state);
  state.runner.san = maxSan(state);
  maybeJoinMate(state);
  pushLog(state, 'run', `进入副本：${w.title}`);
  return w;
}

export function worldOf(state) {
  return state.run ? BY_ID[state.run.worldId] ?? null : null;
}

export function nodeOf(state) {
  const w = worldOf(state);
  if (!w) return null;
  const i = Math.min(state.run.turn - 1, w.nodes.length - 1);
  return w.nodes[i];
}

/* ---------------- 选项 ---------------- */

function invCount(state, id) {
  let n = Number(state.runner.inv?.[id] ?? 0);
  // 破门术：技能可以顶一件破拆包。这是内容里 cond 查 s.inv.breach 时也要成立的那一条。
  if (id === 'breach' && state.run) n += state.run.gear?.breach ?? 0;
  return n;
}

/**
 * 列选项。cond 里可能查道具、查 flag，所以这里要把「能不能选」算出来，
 * 面板据此把按钮置灰——比让玩家点了再报错好。
 */
export function optionList(state) {
  const node = nodeOf(state);
  if (!node) return [];
  const v = viewOf(state);
  const offset = dcOffsetOf(state);
  return node.opts(v).map((o, i) => {
    const needItem = o.effect?.use ?? o.use ?? null;
    const dc = o.dc == null ? null : o.dc + offset;
    let ok = true;
    let reason = '';
    // 先看道具：缺具体的名字比「条件不足」有用得多。
    if (needItem && invCount(state, needItem) <= 0) {
      ok = false;
      reason = `缺 ${ITEM_BY_ID[needItem]?.name ?? needItem}`;
    }
    if (ok && typeof o.cond === 'function' && !o.cond(v)) {
      ok = false;
      reason = o.condHint ?? '条件不足';
    }
    return {
      index: i,
      label: o.label,
      kind: o.attr ? 'check' : 'flat',
      attr: o.attr ?? null,
      attrLabel: o.attr ? ATTR_LABEL[o.attr] : null,
      // 面板上显示的 DC 必须是真要掷的那个数，否则「DC45」写着、实际在按 57 判，
      // 玩家会觉得骰子有问题。
      dc,
      dcLabel: dc == null ? null : dc >= 60 ? '困难' : dc >= 45 ? '普通' : '容易',
      note: o.note ?? null,
      need: needItem ? (ITEM_BY_ID[needItem]?.name ?? needItem) : null,
      ok,
      reason,
      raw: o,
    };
  });
}

/* ---------------- 效果 ---------------- */

/**
 * 唯一的状态变更入口。
 * 支持：hp san point plot flag flags flag2 item use kill karma loyal note
 */
export function applyEffect(state, eff, out = []) {
  if (!eff) return out;

  if (typeof eff.flag === 'string') state.run.flags[eff.flag] = true;
  if (typeof eff.flag2 === 'string') state.run.flags[eff.flag2] = true;
  if (eff.flags && typeof eff.flags === 'object') Object.assign(state.run.flags, eff.flags);

  if (Number.isFinite(eff.hp) && eff.hp !== 0) {
    let v = eff.hp;
    const g = state.run ? gearOf(state) : null;
    if (v < 0 && g) {
      // 难度倍率 → 评级保底伤害 → 护甲 → 闪避。顺序不能反：先算真实的伤，
      // 再让护甲吃掉一部分，最后才是闪避——否则闪避会把已经减到 1 的伤害也吞掉，等于白送。
      const raw = -v;
      v = -Math.max(1, Math.round(raw * hazardOf(state)));
      const rating = worldOf(state)?.rating;
      const floor = Math.round(maxHp(state) * (RATING_MIN_DMG[rating] ?? 0));
      if (raw >= 8 && floor > -v) v = -floor;
      if (g.armor > 0) v = Math.min(-1, v + g.armor);
      if (g.dodge > 0 && -v >= 10) {
        g.dodge -= 1;
        out.push(`闪开（还剩 ${g.dodge} 次）`);
        v = 0;
      }
    }
    if (v !== 0) {
      state.runner.hp = Math.max(0, state.runner.hp + v);
      out.push(`生命 ${v > 0 ? '+' : ''}${v}`);
    }
    // 魂灯 / 命匣 / 战地医师：生命见底的那一下自动拉回来。
    if (g && state.runner.hp <= 0 && g.revive > 0) {
      g.revive -= 1;
      state.runner.hp = Math.max(1, g.reviveHp || 20);
      out.push(`复活，回到 ${state.runner.hp} 生命`);
    }
  }
  if (Number.isFinite(eff.san) && eff.san !== 0) {
    let v = eff.san;
    if (v < 0) {
      const g = state.run ? gearOf(state) : null;
      if (g && g.sanShield > 0) {
        g.sanShield -= 1;
        v = -1;
        out.push('认知滤网生效');
      } else if (state.runner.skills.includes('soulresist')) {
        v = Math.ceil(v / 2);
      }
      // 恐怖副本的理智下限：吓一跳也要掉到肉里。
      const rawSan = Math.abs(eff.san);
      const sanFloor = Math.round(maxSan(state) * (RATING_MIN_SAN[worldOf(state)?.rating] ?? 0));
      if (rawSan >= 6 && sanFloor > -v) v = -sanFloor;
    }
    state.runner.san = Math.max(0, state.runner.san + v);
    out.push(`理智 ${v > 0 ? '+' : ''}${v}`);
  }
  if (Number.isFinite(eff.point) && eff.point !== 0) {
    state.wallet.points = Math.max(0, state.wallet.points + eff.point);
    out.push(`奖励点 ${eff.point > 0 ? '+' : ''}${eff.point}`);
  }
  if (eff.plot) {
    const t = eff.plot;
    state.wallet.plots[t] = (state.wallet.plots[t] ?? 0) + 1;
    out.push(`${t} 级支线剧情 +1`);
  }
  if (typeof eff.item === 'string') {
    addItem(state, eff.item, 1);
    out.push(`获得 ${ITEM_BY_ID[eff.item]?.name ?? eff.item}`);
  }
  if (typeof eff.use === 'string') {
    const held = Number(state.runner.inv?.[eff.use] ?? 0);
    if (held > 0) {
      state.runner.inv[eff.use] = held - 1;
      if (state.runner.inv[eff.use] <= 0) delete state.runner.inv[eff.use];
      out.push(`消耗 ${ITEM_BY_ID[eff.use]?.name ?? eff.use}`);
    } else if (eff.use === 'breach' && (state.run.gear?.breach ?? 0) > 0) {
      // 没带破拆包，但有破门术：扣技能次数，不扣道具。
      state.run.gear.breach -= 1;
      out.push('消耗 破门术');
    }
  }
  if (typeof eff.kill === 'string') {
    state.run.flags.__kills = state.run.flags.__kills ?? [];
    state.run.flags.__kills.push(eff.kill);
    state.stats.kills = (state.stats.kills ?? 0) + 1;
    out.push(`击杀：${eff.kill}`);
  }
  if (Number.isFinite(eff.karma) && eff.karma !== 0) {
    const cap = karmaCap(state);
    state.runner.gene.karma = Math.max(0, Math.min(cap, state.runner.gene.karma + eff.karma));
    out.push(`心魔侵蚀 ${eff.karma > 0 ? '+' : ''}${eff.karma}（上限 ${cap}）`);
  }
  if (Number.isFinite(eff.trust) && eff.trust !== 0 && state.run?.mate) {
    const m = state.run.mate;
    const before = m.trust;
    m.trust = Math.max(0, Math.min(MATE_TRUST_MAX, m.trust + eff.trust));
    const delta = m.trust - before;
    if (delta !== 0) out.push(`${m.name}的信任 ${delta > 0 ? '+' : ''}${delta}`);
    if (m.alive && m.trust <= 0) {
      m.alive = false;
      m.how = '信任耗尽';
      out.push(`${m.name}不再跟着你了`);
    }
  }
  if (typeof eff.mateDown === 'string' && state.run?.mate?.alive) {
    const m = state.run.mate;
    m.alive = false;
    m.how = eff.mateDown;
    out.push(`${m.name}没能跟上来`);
  }
  return out;
}

export function addItem(state, id, n = 1) {
  const def = ITEM_BY_ID[id];
  const cap = def?.stack ?? 9;
  state.runner.inv[id] = Math.min(cap, (state.runner.inv[id] ?? 0) + n);
}

/* ---------------- 支线剧情：保底 ---------------- */

export const PLOT_ORDER = ['D', 'C', 'B', 'A', 'S'];

/** 手头最便宜的那一档支线剧情。押注按这个扣，不让玩家拿 A 级去保一次 DC45。 */
export function cheapestPlot(state) {
  for (const t of PLOT_ORDER) {
    if ((state.wallet.plots[t] ?? 0) > 0) return t;
  }
  return null;
}

export function spendPlot(state) {
  const t = cheapestPlot(state);
  if (!t) return null;
  state.wallet.plots[t] -= 1;
  return t;
}

export function canInsure(state) {
  return cheapestPlot(state) !== null;
}

/* ---------------- 选一个 ---------------- */

export function pickOption(state, index, opts = {}) {
  const list = optionList(state);
  const item = list[index];
  if (!item) return { ok: false, error: '没有这个选项' };
  if (!item.ok) return { ok: false, error: item.reason || '现在选不了' };

  const o = item.raw;
  const dice = makeDice((state.run.seed + state.run.turn * 7919 + index * 131) >>> 0);
  const a = attrsOf(state);
  const result = {
    ok: true,
    label: o.label,
    kind: item.kind,
    lines: [],
    roll: null,
    success: true,
    insure: null,
    insureBlocked: false,
    scene: nodeOf(state)?.scene ?? '',
    turn: state.run.turn,
  };

  if (o.attr) {
    const bonus = checkBonus(state, o.attr);
    const dc = o.dc + dcOffsetOf(state);
    let r = d100Check(dice, a[o.attr] ?? 10, dc, bonus);
    let spent = null;
    let blocked = false;

    // 保底：只有「没过」才扣钱重掷，「大失败」连押的资格都没有，「过了」什么也没发生。
    // 这样它是一张保命符，不是一次加价赌——支线剧情本来就一局最多一两个。
    if (opts.insure) {
      if (r.crit === 'fail') {
        blocked = true;
      } else if (!r.success) {
        const tier = spendPlot(state);
        if (tier) {
          spent = tier;
          const d2 = makeDice((state.run.seed + state.run.turn * 7919 + index * 131 + 3571) >>> 0);
          const r2 = d100Check(d2, a[o.attr] ?? 10, dc, bonus);
          // 取两次里较好的那一次：这个价钱买的是保险，不是让你再赌一把。
          if (r2.total > r.total) r = r2;
        }
      }
    }

    // 买过的技能和道具在这里兑现：剧本干涉直接改判，一次机会/时间锚重掷。
    // 必须放在保底之后——先花玩家自己的选择，再动被动。
    let auto = null;
    if (!r.success) {
      const g = gearOf(state);
      if (g?.autoPass > 0) {
        g.autoPass -= 1;
        r = { ...r, success: true };
        auto = '剧本干涉';
      } else if (r.crit !== 'fail' && (g?.reroll ?? 0) > 0) {
        g.reroll -= 1;
        const d3 = makeDice((state.run.seed + state.run.turn * 7919 + index * 131 + 6131) >>> 0);
        const r3 = d100Check(d3, a[o.attr] ?? 10, dc, bonus);
        if (r3.total > r.total) r = r3;
        auto = '重掷';
      }
    }

    r.insured = spent;
    r.auto = auto;
    result.roll = r;
    result.success = r.success;
    result.insure = spent;
    result.insureBlocked = blocked;
    result.auto = auto;

    const eff = r.success ? o.pass : o.fail;
    applyEffect(state, eff ?? {}, result.lines);
    if (spent) result.lines.unshift(`押上 ${spent} 级支线剧情，重掷 ${r.roll}`);
    if (auto) result.lines.unshift(`${auto}：${r.success ? '改判为过' : '还是没过'}`);
    if (r.crit === 'success') result.lines.push('大成功');
    if (r.crit === 'fail') result.lines.push('大失败');
  } else {
    applyEffect(state, o.effect ?? {}, result.lines);
  }

  result.hp = state.runner.hp;
  result.san = state.runner.san;
  result.hpMax = maxHp(state);
  result.sanMax = maxSan(state);

  state.run.trail.push({
    turn: state.run.turn,
    scene: result.scene,
    label: o.label,
    success: result.success,
    kind: item.kind,
    roll: result.roll ? `${result.roll.roll}+${result.roll.attrMod}${result.roll.bonus ? '+' + result.roll.bonus : ''}=${result.roll.total}` : null,
    dc: result.roll?.dc ?? null,
    insure: result.insure,
  });

  pushLog(state, result.success ? 'good' : 'bad',
    `第 ${state.run.turn} 回合 · ${result.scene}｜${o.label}${result.roll ? `（${result.roll.total} vs ${result.roll.dc}）` : ''}`);

  norm(state);
  return result;
}

/* ---------------- 回合推进 ---------------- */

export function advance(state) {
  const w = worldOf(state);
  // 每个回合都在消耗你：跑动、脱水、没睡好。评级越高磨得越快。
  // 没有这一条，副本里的伤害就只有「判定失败」那几下，带两支急救针就能全吃掉。
  const chip = { D: 0, C: 1, B: 3, A: 3 }[w.rating] ?? 0;
  if (chip > 0) applyEffect(state, { hp: -chip }, []);
  state.run.turn += 1;
  state.stats.deepestTurn = Math.max(state.stats.deepestTurn ?? 0, state.run.turn);
  maybeJoinMate(state);
  return state.run.turn > w.turns;
}

/* ---------------- 濒死 / 基因锁 ---------------- */

export const GENE_TIERS = {
  1: { name: '一阶', chance: 0.6, gain: 8, karma: 1, desc: '激发潜能' },
  2: { name: '二阶', chance: 0.45, gain: 10, karma: 1, desc: '掌控身体' },
  3: { name: '三阶', chance: 0.3, gain: 12, karma: 2, desc: '模拟思维' },
  4: { name: '四阶', chance: 0.15, gain: 15, karma: 3, desc: '心灵之光' },
};

/** 该不该给她一次开锁的机会：生命见底、还没到顶、本局没开过。 */
export function shouldOfferGene(state) {
  if (!state.run) return false;
  if (state.runner.hp > 0) return false;
  if (state.runner.gene.tier >= 4) return false;
  if (state.run.geneOfferAt === state.run.turn) return false;
  return true;
}

export function geneOffer(state) {
  const next = state.runner.gene.tier + 1;
  const row = GENE_TIERS[next];
  if (!row) return null;
  const cap = geneCapOf(state);
  const penalty = next > cap ? 0.5 : 0;
  return {
    tier: next,
    name: row.name,
    desc: row.desc,
    chance: Math.max(0.05, row.chance - penalty),
    gain: row.gain,
    karma: row.karma,
    overCap: next > cap,
    cap,
  };
}

/** 开锁。返回结果，调用方决定要不要推事件。 */
export function attemptGene(state, accept) {
  const offer = geneOffer(state);
  if (!offer) return { ok: false, error: '现在没有开锁的机会' };
  state.run.geneOfferAt = state.run.turn;

  if (!accept) {
    state.runner.hp = 0;
    return { ok: true, accepted: false, lines: ['没有开锁。'] };
  }

  const dice = makeDice((state.run.seed + state.run.turn * 104729 + 17) >>> 0);
  const roll = dice.d100();
  const passed = roll <= Math.round(offer.chance * 100);
  const lines = [];

  if (passed) {
    state.runner.gene.tier = offer.tier;
    state.runner.hp = 1;
    state.run.flags.__geneBoost = (state.run.flags.__geneBoost ?? 0) + offer.gain;
    lines.push(`基因锁 ${offer.name} · 解锁`, `本副本判定 +${offer.gain * 2}`);
  } else {
    // 失败就是死。以前这里写的是 hp = 1 ——那等于「赌输也白送一条命」，
    // 于是濒死 → 赌 → 失败 → 回 1 血 → 下回合再赌，永远死不了。
    // 副本难度的所有调整都被这一行抵消掉了。
    state.runner.gene.karma = Math.min(karmaCap(state), state.runner.gene.karma + offer.karma);
    state.runner.hp = 0;
    lines.push(`基因锁 ${offer.name} · 失败`, `心魔侵蚀 +${offer.karma}`);
  }
  pushLog(state, passed ? 'good' : 'bad', `濒死开锁：${offer.name} ${passed ? '成功' : '失败'}（骰 ${roll}）`);
  return { ok: true, accepted: true, passed, roll, chance: offer.chance, tier: offer.tier, name: offer.name, lines };
}

/**
 * 判定加成：基因锁爆发 + 同伴默契 + 技能。
 *
 * 注意：pickOption 必须走这个函数。之前它直接调 skillAttrBonus，
 * 结果基因锁开出来的「判定 +gain*2」从来没生效过——存档里有 __geneBoost，
 * 判定时没人读。副作用是基因锁看起来只值那一点血量，实际不是。
 */
export function checkBonus(state, attr) {
  const boost = (state.run?.flags?.__geneBoost ?? 0) * 2;
  const def = mateOf(state);
  const m = state.run?.mate;
  let bondBonus = 0;
  if (def?.bond && m?.alive && def.bond.attr === attr && m.trust >= (def.bond.min ?? 2)) {
    bondBonus = def.bond.bonus ?? 0;
  }
  return boost + bondBonus + skillAttrBonus(state.runner.skills, attr);
}

/* ---------------- 结算 ---------------- */

export function settleRun(state) {
  const w = worldOf(state);
  const alive = state.runner.hp > 0 && state.runner.san > 0;
  const rows = [];
  let total = 0;
  const plots = {};
  let rank = 'failed';

  if (alive) {
    rows.push({ kind: 'main', label: `主线 · ${w.main.desc}`, points: w.main.points, plot: null });
    total += w.main.points;
    rank = 'cleared';
  } else {
    rows.push({ kind: 'main', label: '主线 · 没有走出来', points: 0, plot: null, bad: true });
  }

  const hit = alive ? w.assess(viewOf(state)) : [];
  const hitSet = new Set(hit);
  for (const side of w.sides) {
    if (hitSet.has(side.id)) {
      rows.push({ kind: 'side', label: `支线 · ${side.desc}`, points: side.points, plot: side.plot });
      total += side.points;
      if (side.plot) plots[side.plot] = (plots[side.plot] ?? 0) + 1;
    } else {
      rows.push({ kind: 'side', label: `未达成 · ${side.desc}`, points: 0, plot: null, miss: true });
    }
  }

  // 同伴：活着带出来才算数。他死在剧情里（matt_dies 那种）由 mate.survives 判掉，
  // 不看 mate.alive —— 那个字段只管挡刀和信任耗尽。
  const mate = mateOutcome(state);
  if (mate && mate.status !== 'none') {
    if (mate.status === 'alive' && alive && w.mate?.bonus) {
      // minor：面板把它排成上一行的附注，不再单独占一条主账。
      // 两份奖励都照给，只是不该看起来像收了两笔钱。
      rows.push({ kind: 'mate', label: `同伴 · ${mate.name} 一起出来了`, points: w.mate.bonus.points, plot: w.mate.bonus.plot ?? null, minor: true });
      total += w.mate.bonus.points;
      if (w.mate.bonus.plot) plots[w.mate.bonus.plot] = (plots[w.mate.bonus.plot] ?? 0) + 1;
    } else if (mate.status === 'alive') {
      // 你死了他活着：这一栏不结账，只记一句。替人算别人的生死不归主神管。
      rows.push({ kind: 'mate', label: `同伴 · ${mate.name} 还活着，你没看到他走出去`, points: 0, plot: null, miss: true, minor: true });
    } else {
      rows.push({ kind: 'mate', label: `同伴 · ${mate.name} 没能出来${mate.how ? `（${mate.how}）` : ''}`, points: 0, plot: null, bad: true, minor: true });
    }
  }

  for (const p of w.penalties(viewOf(state)) ?? []) {
    rows.push({ kind: 'penalty', label: `惩罚 · ${p.label}`, points: p.points, plot: null, bad: true });
    total += p.points;
  }

  total = Math.max(0, total);

  const ending = (w.endings.find((e) => e.when(state.run.flags)) ?? w.endings.at(-1));

  return {
    rank,
    alive,
    rows,
    points: total,
    plots,
    ending: { title: ending.title, text: ending.text },
    worldTitle: w.title,
    turns: state.run.turn,
    hp: state.runner.hp,
    hpMax: maxHp(state),
    san: state.runner.san,
    sanMax: maxSan(state),
    mate,
  };
}

/** 把结算落到存档。返回要告诉主人的那几行。 */
export function commitRun(state, report) {
  const lines = [];
  state.meta.runs += 1;

  // 这个副本进过几次。手记里那句「第 N 次」读的是它，不是总次数——
  // 「第 15 次进蜂巢」和「第 3 次进蜂巢」是两种心情。
  const wid = state.run?.worldId;
  if (wid) {
    state.meta.worldRuns = state.meta.worldRuns ?? {};
    state.meta.worldRuns[wid] = (state.meta.worldRuns[wid] ?? 0) + 1;
  }

  // 同伴记忆：他记住的是「你救过我」，还是「你把我留在那儿」。
  const mid = report.mate?.id;
  if (mid && report.mate.status !== 'none') {
    const mem = (state.meta.mateMemory ??= {});
    const rec = mem[mid] ?? { met: 0, saved: 0, lost: 0 };
    rec.met += 1;
    if (report.mate.status === 'alive') rec.saved += 1;
    else rec.lost += 1;
    mem[mid] = rec;
  }

  if (report.alive) {
    state.meta.cleared += 1;
    state.wallet.points += report.points;
    for (const [t, n] of Object.entries(report.plots)) state.wallet.plots[t] = (state.wallet.plots[t] ?? 0) + n;
    state.meta.bestPoints = Math.max(state.meta.bestPoints ?? 0, report.points);
    lines.push(`拿到 ${report.points} 点奖励点`);
    for (const [t, n] of Object.entries(report.plots)) lines.push(`${t} 级支线剧情 ×${n}`);
  } else {
    state.meta.failed += 1;
    // 主神怜悯：前两次被抹杀改为「扣光点数并放回」。新手第一次死不该直接卸载。
    if (!state.meta.mercyUsed && state.meta.runs <= 2) {
      state.meta.mercyUsed = true;
      state.wallet.points = 0;
      lines.push('主神怜悯：这一次没有抹杀你，只是把点数清空了');
    } else {
      state.wallet.points = 0;
      lines.push('被抹杀。复活用了 1 个副本，本局收益清零');
    }
  }

  state.run.settled = true;
  pushLog(state, 'settle', `${report.worldTitle}｜${report.ending.title}｜${report.alive ? '+' + report.points : '抹杀'}`);
  norm(state);
  return lines;
}

export function clearRun(state) {
  state.run = null;
  norm(state);
  return state;
}

/* ---------------- 兑换 ---------------- */

export function attrCost(cur) {
  if (cur < 15) return 500;
  if (cur < 20) return 900;
  if (cur < 30) return 1600 + (cur - 20) * 400;
  // 31–40：给后期一个「钱多到没处花」的去处。贵得没有性价比，
  // 但它是唯一能用点数换到的东西，这就是它存在的理由。
  return 4000 + (cur - 30) * 500;
}

export const ATTR_MAX = 40;

export function buyAttr(state, key) {
  const cur = state.runner.attrs[key];
  if (!ATTR_KEYS.includes(key)) return { ok: false, message: '没有这个属性' };
  if (cur >= ATTR_MAX) return { ok: false, message: `已经到上限 ${ATTR_MAX} 了` };
  const cost = attrCost(cur);
  if (state.wallet.points < cost) return { ok: false, message: `差 ${cost - state.wallet.points} 点` };
  state.wallet.points -= cost;
  state.runner.attrs[key] = cur + 1;
  if (key === 'con') state.runner.hp = Math.min(maxHp(state), state.runner.hp + 10);
  if (key === 'int') state.runner.san = Math.min(maxSan(state), state.runner.san + 8);
  norm(state);
  return { ok: true, message: `${ATTR_LABEL[key]} +1（现在 ${cur + 1}）` };
}

/**
 * 换一条血统的价格倍率。
 *
 * 第一次融合是「主神给你灌一条」，换一条是「把原来那条从血里剥出来再灌」——
 * 多出来的一半是手术费。旧的不退，浓度也清零：你换掉的东西不会回来。
 */
export const SWAP_MULT = 1.5;

/** 血统实价。swapping 时按 SWAP_MULT 上浮，抹到百位。 */
export function bloodlinePrice(bl, swapping = false) {
  if (!swapping) return bl.price;
  return Math.round((bl.price * SWAP_MULT) / 100) * 100;
}

export function buyBloodline(state, id, opts = {}) {
  const bl = BLOODLINE_BY_ID[id];
  if (!bl) return { ok: false, message: '没有这个血统' };
  const had = state.runner.bloodline;
  if (had === id) return { ok: false, message: `身上已经是${bl.name}了。要更强只能往上叠浓度。` };

  const swapping = !!had;
  if (swapping && opts.swap !== true) {
    return {
      ok: false,
      message: `身上已经有一个血统了。换一条走「剥离重铸」：价钱 ×${SWAP_MULT}，浓度清零，旧的那条回不来。`,
    };
  }

  const price = bloodlinePrice(bl, swapping);
  if (state.wallet.points < price) return { ok: false, message: `点数差 ${price - state.wallet.points}` };
  if (bl.plot && (state.wallet.plots[bl.plot] ?? 0) < 1) return { ok: false, message: `缺 1 个 ${bl.plot} 级支线剧情` };

  state.wallet.points -= price;
  if (bl.plot) state.wallet.plots[bl.plot] -= 1;
  state.runner.bloodline = id;
  state.runner.bloodlineGrade = 0;
  norm(state);

  const oldName = swapping ? (BLOODLINE_BY_ID[had]?.name ?? '旧血统') : '';
  return {
    ok: true,
    message: swapping
      ? `剥掉了${oldName}，灌进 ${bl.name}。浓度从零开始。副作用是：${bl.cost}`
      : `融合了 ${bl.name}。副作用是：${bl.cost}`,
  };
}

/**
 * 往上叠一层血统浓度。
 *
 * 这不是换血统，是让身上这一条更浓。所以它不会给你新的能力描述，
 * 只会让原来那一条更重：属性更高、能承载的基因锁更高、理智更低、心魔更浅。
 */
export function gradeBloodline(state) {
  const bl = bloodlineOf(state);
  if (!bl) return { ok: false, message: '身上还没有血统，没什么可叠的。' };
  const cost = gradeCost(state);
  if (!cost) return { ok: false, message: '已经到第三层了。再往上就不是人，是别的东西。' };
  if (state.wallet.points < cost.points) {
    return { ok: false, message: `差 ${cost.points - state.wallet.points} 点` };
  }
  if (cost.plot && (state.wallet.plots[cost.plot] ?? 0) < 1) {
    return { ok: false, message: `缺 1 个 ${cost.plot} 级支线剧情` };
  }

  const beforeSan = maxSan(state);
  const beforeCap = geneCapOf(state);
  state.wallet.points -= cost.points;
  if (cost.plot) state.wallet.plots[cost.plot] -= 1;
  state.runner.bloodlineGrade = cost.next;
  norm(state);

  return {
    ok: true,
    message: `${bl.name} 浓度升到第 ${cost.next} 层。`
      + `理智上限 ${beforeSan} → ${maxSan(state)}，`
      + `基因锁承载 ${beforeCap} → ${geneCapOf(state)} 阶，`
      + `心魔只能装 ${karmaCap(state)} 级。`,
  };
}

export function buySkill(state, id) {
  const sk = SKILL_BY_ID[id];
  if (!sk) return { ok: false, message: '没有这个技能' };
  if (state.runner.skills.includes(id)) return { ok: false, message: '已经会了' };
  if (state.wallet.points < sk.price) return { ok: false, message: `点数差 ${sk.price - state.wallet.points}` };
  if (sk.plot && (state.wallet.plots[sk.plot] ?? 0) < 1) return { ok: false, message: `缺 1 个 ${sk.plot} 级支线剧情` };
  state.wallet.points -= sk.price;
  if (sk.plot) state.wallet.plots[sk.plot] -= 1;
  state.runner.skills.push(id);
  return { ok: true, message: `学会了 ${sk.name}` };
}

export function buyItem(state, id, n = 1) {
  const it = ITEM_BY_ID[id];
  if (!it) return { ok: false, message: '没有这个道具' };
  if (it.price <= 0) return { ok: false, message: '这东西买不到' };
  const cost = it.price * n;
  if (state.wallet.points < cost) return { ok: false, message: `点数差 ${cost - state.wallet.points}` };
  if (it.plot && (state.wallet.plots[it.plot] ?? 0) < 1) return { ok: false, message: `缺 1 个 ${it.plot} 级支线剧情` };
  state.wallet.points -= cost;
  if (it.plot) state.wallet.plots[it.plot] -= 1;
  addItem(state, id, n);
  return { ok: true, message: `买了 ${it.name} ×${n}` };
}

/**
 * 主动用掉一件消耗品，或者用一次主动技能。
 *
 * 以前背包里的急救针只能靠剧情选项消耗，玩家自己没法在「还剩 12 血」的时候打一针。
 * 这个函数就是那根针。
 */
export function useGear(state, key) {
  const inRun = Boolean(state.run && !state.run.settled);

  const sk = SKILL_BY_ID[key];
  if (sk) {
    if (!state.runner.skills.includes(key)) return { ok: false, message: `没学「${sk.name}」` };
    if (!inRun) return { ok: false, message: '技能要在副本里用。' };
    const go = gearOf(state);
    const h = sk.hook ?? {};
    if (!h.heal) return { ok: false, message: `「${sk.name}」是被动，不用手动点。` };
    if (go.heal <= 0) return { ok: false, message: `「${sk.name}」这一局用完了。` };
    go.heal -= 1;
    const before = state.runner.hp;
    state.runner.hp = Math.min(maxHp(state), state.runner.hp + h.heal);
    pushLog(state, 'good', `${sk.name}：生命 ${before} → ${state.runner.hp}`);
    return { ok: true, message: `${sk.name}：生命 ${before} → ${state.runner.hp}（这局还剩 ${go.heal} 次）` };
  }

  const it = ITEM_BY_ID[key];
  if (!it) return { ok: false, message: '没有这件东西' };
  const held = Number(state.runner.inv?.[key] ?? 0);
  if (held <= 0) return { ok: false, message: `背包里没有${it.name}` };

  const h = it.hook ?? {};
  if (it.type === '装备') return { ok: false, message: `${it.name}是装备，带在身上就生效。` };
  if (it.type === '任务') return { ok: false, message: `${it.name}不能这么用。` };
  if (!inRun) return { ok: false, message: `${it.name}要进了副本再用。` };

  const take = () => {
    state.runner.inv[key] -= 1;
    if (state.runner.inv[key] <= 0) delete state.runner.inv[key];
  };

  if (h.heal) {
    const before = state.runner.hp;
    state.runner.hp = Math.min(maxHp(state), state.runner.hp + h.heal);
    take();
    pushLog(state, 'good', `${it.name}：生命 ${before} → ${state.runner.hp}`);
    return { ok: true, message: `${it.name}：生命 ${before} → ${state.runner.hp}` };
  }
  if (h.san) {
    const before = state.runner.san;
    state.runner.san = Math.min(maxSan(state), state.runner.san + h.san);
    take();
    pushLog(state, 'good', `${it.name}：理智 ${before} → ${state.runner.san}`);
    return { ok: true, message: `${it.name}：理智 ${before} → ${state.runner.san}` };
  }
  if (h.sanShield) {
    const go = gearOf(state);
    go.sanShield += h.sanShield;
    take();
    return { ok: true, message: `带上了${it.name}。下一次理智损失会降为 1。` };
  }
  if (h.reroll) {
    const go = gearOf(state);
    go.reroll += h.reroll;
    take();
    return { ok: true, message: `设好了${it.name}。下一次失败的判定会自动重掷。` };
  }
  if (h.light) {
    take();
    return { ok: true, message: `点了一根${it.name}。这一处暗下来了，也看清了。` };
  }
  return { ok: false, message: `${it.name}要在剧情选项里用。` };
}

/** 净化心魔：点数 + 一次「心魔战」的抽象化——这里只结算代价。 */
export function purify(state) {  if (state.runner.gene.karma <= 0) return { ok: false, message: '身上没有心魔' };
  const cost = 3000 * state.runner.gene.karma;
  if (state.wallet.points < cost) return { ok: false, message: `净化 ${state.runner.gene.karma} 级心魔要 ${cost} 点，还差 ${cost - state.wallet.points}` };
  state.wallet.points -= cost;
  const before = state.runner.gene.karma;
  state.runner.gene.karma = 0;
  state.runner.san = Math.max(1, Math.floor(maxSan(state) * 0.6));
  return { ok: true, message: `净化掉了 ${before} 级心魔，代价是 ${cost} 点。理智掉到六成。` };
}

/* ---------------- 日志 ---------------- */

export function pushLog(state, kind, text) {
  state.log.push({ at: new Date().toISOString(), kind, text });
  if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
}

/**
 * 大肥鱼之无限流 · 主神空间（单机）。
 *
 * 做一件事：让桌宠在桌面待机时蹲在主神空间，进副本就是一场回合制推演，
 * 掷骰、选行动、算能不能活着回来；活着回来有点数和支线剧情，换血统和基因锁。
 *
 * 不联网、不找别的桌宠、没有服务器——所有结算都在本机按规则算。
 *
 * 两条纪律，写在最前面免得后面忘记：
 * 1. 数值只走 engine 的 applyEffect 一个入口，这里不许直接改 runner.hp。
 * 2. 面板和工具读到的是同一份 payload，不许在两边各算一遍。
 */
import { fileURLToPath } from 'node:url';
import { TOOL_SPECS, TOOL_SUMMARIES, EVENT_DESCRIPTIONS } from './tools.js';
import { WORLD_LIST, BY_ID } from './content/worlds.js';
import { byRating, RATING_ORDER } from './content/kit.js';
import { BLOODLINES, BLOODLINE_BY_ID } from './content/bloodlines.js';
import { SKILLS, ITEMS, SKILL_BY_ID, ITEM_BY_ID } from './content/items.js';
import {
  ATTR_KEYS, ATTR_LABEL, attrsOf, maxHp, maxSan, bloodlineOf, geneCapOf, norm,
  startRun, worldOf, nodeOf, optionList, pickOption, advance,
  shouldOfferGene, geneOffer, attemptGene, settleRun, commitRun, clearRun,
  buyAttr, buyBloodline, buySkill, buyItem, purify, attrCost, pushLog, ATTR_MAX, useGear,
  gradeBloodline, gradeOf, gradeCost, karmaCap, GRADE_MAX, DIFFICULTY,
  SWAP_MULT, bloodlinePrice,
  mateGuard, mateOutcome, mateOf, canInsure, cheapestPlot, maybeJoinMate,
} from './engine.js';
import { loadState, saveState, statePath, JOURNAL_KEEP, createState } from './state.js';
import { writeJournal } from './journal.js';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./prompt/ENV_PROMPT.md', import.meta.url));
const uid = 'infinity';
const PANEL_ID = 'infinity';
const TICK_MS = 30_000;

const clampInt = (v, min, max, fb) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

/** 配置组。键名带 worlds.<uid>. 前缀，框架按这个归属。 */
const CONFIG_GROUP = {
  id: `world:${uid}`,
  owner: `world:${uid}`,
  schema: {
    type: 'object',
    title: '大肥鱼之无限流',
    description: '她被主神选中了。这里调：要不要让她自己去跑副本、多久走一步、什么时候开口、'
      + '允不允许她自己花点数。改完下一步动作就生效，不用重启。',
    properties: {
      [`worlds.${uid}.autoRun`]: {
        type: 'boolean',
        title: '她自己往前走',
        'x-hot': true,
        description: '打开后，她会在没人看着的时候自己进副本、自己选动作。关掉她就等你决定。'
          + '默认开——关着的桌宠不会自己做事。',
      },
      [`worlds.${uid}.autoMinutes`]: {
        type: 'number',
        title: '多久走一步',
        minimum: 3,
        maximum: 240,
        'x-suffix': '分钟',
        'x-hot': true,
        description: '默认 30。想立刻看一轮完整循环，先填 3；太密的话「进副本」这件事就没有分量了。',
      },
      [`worlds.${uid}.allowSpend`]: {
        type: 'boolean',
        title: '允许她自己花点数',
        'x-hot': true,
        description: '关掉的话，兑换只能由你在面板上点。默认开——但换血统是不可逆的，'
          + '不想让她自己定终身的话就把这个关掉。',
      },
      [`worlds.${uid}.autoSpend`]: {
        type: 'boolean',
        title: '让她自己把点数花掉',
        'x-hot': true,
        description: '默认开。她按自己的顺序买：先净化心魔，再换血统、升浓度、学技能，'
          + '最后把剩下的零钱全塞进最低的那项属性。关掉的话点数会一直攒着。',
      },
      [`worlds.${uid}.difficulty`]: {
        type: 'string',
        title: '难度',
        description: 'easy 轻松 / normal 标准（默认）/ hard 残酷。'
          + '影响两件事：判定 DC 抬多少、失败时伤害乘多少。高级副本另有保底伤害，'
          + '强化到多少都会被咬掉一块。改完下一回合就生效。',
      },
      [`worlds.${uid}.notify`]: {
        type: 'string',
        title: '什么时候开口',
        'x-options': 'notify',
        description: '默认只在要紧的事上说一句：开出基因锁、拿到大额奖励、被抹杀。',
      },
    },
  },
};

export class InfinityWorld {
  constructor(ctx) {
    // 框架按实例 id 归属工具与事件，必须等于定义的 id，否则挂载时直接判加载失败。
    this.id = uid;
    this.ctx = ctx;
    this.file = statePath(ctx.dataDir);
    this.state = null;
    this.host = null;
    this.timer = null;
    this.busy = false;
  }

  /* ---------------- 生命周期 ---------------- */

  ensure() {
    if (!this.state) {
      this.state = loadState(this.file, { botName: this.ctx.botName });
      norm(this.state);
    }
    return this.state;
  }

  save() {
    try {
      saveState(this.file, this.state);
    } catch (error) {
      this.host?.log?.warn?.(`infinity: 存档没写下去：${error?.message ?? error}`);
    }
  }

  async start(host) {
    this.host = host;
    this.ensure();
    // 配置里写了难度就以配置为准——主人改设置面板时，存档里的旧值不该压过它。
    const d = this.cfg('difficulty', null);
    if (d && DIFFICULTY[d]) this.state.settings.difficulty = d;
    // 老存档里可能有一局正停在半路，而那时还没有同伴这个字段。
    // 在这里补一次，免得升级之后那一局永远等不到人。
    maybeJoinMate(this.state);
    this.save();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => { void this.tick(); }, TICK_MS);
    this.timer.unref?.();
    await this.tick();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.host = null;
  }

  /** 每半分钟看一眼：该不该她自己走一步。 */
  async tick() {
    if (this.busy || !this.state) return;
    this.busy = true;
    try {
      await this.autoStep();
    } catch (error) {
      this.host?.log?.warn?.(`infinity: 自动推演出错：${error?.message ?? error}`);
    } finally {
      this.busy = false;
    }
  }

  cfg(key, fallback) {
    const v = this.ctx.cfg?.[key];
    return v === undefined || v === null ? fallback : v;
  }

  /* ---------------- 自动推进 ---------------- */

  /**
   * 她自己走一步。
   *
   * 只做「一步」，不跑完整局——一整局十几回合，一口气跑完主人回来只看到结果，
   * 中间那些「差点死了」就全没了。慢一点，回来才有话讲。
   */
  async autoStep() {
    const s = this.ensure();
    if (!this.cfg('autoRun', true)) return;

    const gapMs = clampInt(this.cfg('autoMinutes', 30), 3, 240, 30) * 60_000;
    const last = s.auto?.lastAt ? Date.parse(s.auto.lastAt) : 0;
    if (!last) {
      // 第一次启动：只记下计时起点。刚装上就在主人还没打开面板的时候
      // 自己进副本，会让人以为这是个已经替他玩了一半的东西。
      s.auto = { lastAt: new Date().toISOString(), steps: 0 };
      this.save();
      return;
    }
    if (Date.now() - last < gapMs) return;

    // 上一局结算完，让它先在面板上留一个间隔，再自己回主神空间。
    // 以前这里直接 return，结果她打完一局就永远停在结算页——
    // 既不会继续进副本，也永远不会去花钱。
    if (s.run?.settled) {
      this.leave();
      const bought = this.autoShop(s);
      s.auto = { lastAt: new Date().toISOString(), steps: (s.auto?.steps ?? 0) + 1 };
      this.save();
      if (bought.length) {
        await this.push({
          type: 'infinity.shop',
          text: `（她自己去了兑换处：${bought.join('；')}）`,
          meta: { event: 'shop', bought },
        });
      }
      return;
    }

    // 不在副本里：先把手上的点数花掉，再挑一个副本进
    if (!s.run) {
      this.autoShop(s);
      const pick = this.autoPickWorld(s);
      if (!pick) return;
      startRun(s, pick);
      s.auto = { lastAt: new Date().toISOString(), steps: (s.auto?.steps ?? 0) + 1 };
      this.save();
      await this.push({
        type: 'infinity.run',
        text: `（她自己进了副本「${BY_ID[pick].title}」：${BY_ID[pick].brief}`,
        meta: { event: 'enter', world: pick },
      });
      return;
    }

    // 在副本里：先处理濒死，再选一个动作
    if (shouldOfferGene(s)) {
      const offer = geneOffer(s);
      // 她自己会赌。这是这个世界的味道：明知道会失败，还是会赌。
      const out = attemptGene(s, true);
      s.auto = { lastAt: new Date().toISOString(), steps: (s.auto?.steps ?? 0) + 1 };
      this.save();
      await this.push({
        type: 'infinity.gene',
        text: `（她在濒死时开了${offer?.name ?? '基因锁'}：${out.passed ? `成了，属性爆发 +${offer.gain}` : `没成，心魔涨到 ${s.runner.gene.karma}/${karmaCap(s)}`}。`
          + '骰子落下去了，这件事没有第二次。）',
        meta: { passed: out.passed, tier: offer?.tier },
      });
      await this.afterStep(s);
      return;
    }

    // 先看要不要打针吃药，再决定这一步怎么走。
    if (this.autoUse(s)) this.save();
    const list = optionList(s);
    const usable = list.filter((o) => o.ok);
    if (!usable.length) return;
    const chosen = this.autoChoose(usable);
    const res = pickOption(s, chosen.index);
    s.auto = { lastAt: new Date().toISOString(), steps: (s.auto?.steps ?? 0) + 1 };
    this.save();
    await this.afterStep(s);
  }

  /**
   * 自动挑副本：挑「没通关过的最低评级」。
   * 不能按数组顺序取，也不能按字符串比评级——'A' < 'B' < 'C' < 'D'，
   * 直接比大小会把 A 级排在第一个，新人第一次自动推进就被扔进最高难度。
   */
  autoPickWorld(s) {
    if (s.runner.gene.karma >= karmaCap(s)) return null; // 入魔状态，先净化
    const cleared = s.meta.clearedWorlds ?? [];
    const fresh = byRating(WORLD_LIST.filter((w) => !cleared.includes(w.id)));
    if (fresh.length) return fresh[0].id;
    // 全通关了：去刷一个能赢的，别让她一遍遍死在 A 级里
    const grindable = WORLD_LIST.filter((w) => w.rating !== 'A' && w.rating !== 'S');
    return (grindable.at(-1) ?? WORLD_LIST[0]).id;
  }

  /**
   * 血少了打针，理智低了吃药。
   *
   * 背包里的急救针以前只能靠剧情选项消耗，她自己不会用——带着两支针死在半路。
   * 这一步不占回合：打完针还得继续选动作。
   */
  autoUse(s) {
    if (!s.run || s.run.settled) return null;
    const hpPct = s.runner.hp / Math.max(1, maxHp(s));
    const sanPct = s.runner.san / Math.max(1, maxSan(s));

    // 先救命，再救理智——理智归零也是死，但血先见底的时候没时间想。
    if (hpPct <= 0.45) {
      if ((s.runner.inv.medkit ?? 0) > 0) return useGear(s, 'medkit');
      if (s.runner.skills.includes('firstaid')) {
        const r = useGear(s, 'firstaid');
        if (r.ok) return r;
      }
    }
    if (sanPct <= 0.4) {
      if ((s.runner.inv.sedative ?? 0) > 0) return useGear(s, 'sedative');
      if ((s.runner.inv.filter ?? 0) > 0) return useGear(s, 'filter');
    }
    return null;
  }

  /** 自动选：优先无判定，其次 DC 最低。像一个不擅长赌博的人会做的选择。 */
  autoChoose(list) {
    const flat = list.filter((o) => o.kind === 'flat');
    if (flat.length && Math.random() < 0.45) return flat[Math.floor(Math.random() * flat.length)];
    const checks = list.filter((o) => o.kind === 'check').sort((a, b) => a.dc - b.dc);
    if (checks.length) return checks[0];
    return list[0];
  }

  /** 允不允许她自己花点数。设置里关了就不花。 */
  autoSpendOn(s) {
    if (this.cfg('autoSpend', true) === false) return false;
    return s.settings?.autoSpend !== false;
  }

  /**
   * 她自己的消费顺序。
   *
   * 以前这里什么都不做——她赢了点数，攒着，攒到一万多，然后继续用 10 点属性
   * 去撞 A 级副本。问题不在难度，在于钱从来没有变成属性。
   *
   * 顺序是有讲究的：先买能让她活下来的（净化、血统），再买越打越强的（浓度、技能），
   * 最后把零钱塞进最便宜的那项属性——保证「尽量花光」。
   */
  autoShop(s) {
    if (!this.autoSpendOn(s)) return [];
    if (s.run && !s.run.settled) return [];
    const bought = [];
    const can = (n) => s.wallet.points >= n;
    const plotOk = (t) => !t || (s.wallet.plots[t] ?? 0) > 0;
    const note = (line) => {
      bought.push(line);
      pushLog(s, 'good', line);
    };

    // 1. 心魔：满了就进不了副本，先净化。这条最优先，否则下面的钱都白花。
    for (let i = 0; i < 4 && s.runner.gene.karma > 0; i += 1) {
      if (!can(3000 * s.runner.gene.karma)) break;
      const r = purify(s);
      if (!r.ok) break;
      note('净化了心魔');
    }

    // 2. 补给：急救针和镇定剂各留两支。这条排在血统前面——把家底全砸进血统、
    //    下一局连一针都掏不出来，是最蠢的死法。这两样一共才 200 点。
    for (const [id, want] of [['medkit', 2], ['sedative', 2]]) {
      const it = ITEM_BY_ID[id];
      const have = s.runner.inv[id] ?? 0;
      if (have >= want) continue;
      const n = Math.min(want - have, Math.floor(s.wallet.points / it.price));
      if (n <= 0) continue;
      const r = buyItem(s, id, n);
      if (r.ok) note(`补了 ${it.name} ×${n}`);
    }

    // 3. 血统：买得起里面最强的一条。它决定基因锁能承载到几阶。
    if (!s.runner.bloodline) {
      const pick = BLOODLINES
        .filter((b) => can(b.price) && plotOk(b.plot))
        .sort((a, b) => ((RATING_ORDER[b.tier] ?? 0) - (RATING_ORDER[a.tier] ?? 0)) || (b.price - a.price))[0];
      if (pick) {
        const r = buyBloodline(s, pick.id);
        if (r.ok) note(`融合了 ${pick.name}（${pick.tier}）`);
      }
    }

    // 4. 血统浓度：能升就升。这是后期最大的一笔开销。
    for (let i = 0; i < GRADE_MAX; i += 1) {
      const c = gradeCost(s);
      if (!c || !can(c.points) || !plotOk(c.plot)) break;
      const r = gradeBloodline(s);
      if (!r.ok) break;
      note(`血统浓度升到第 ${c.next} 层`);
    }

    // 5. 技能：买没学过的、买得起里最贵的那个。
    for (let i = 0; i < 8; i += 1) {
      const pick = SKILLS
        .filter((k) => !s.runner.skills.includes(k.id) && can(k.price) && plotOk(k.plot))
        .sort((a, b) => b.price - a.price)[0];
      if (!pick) break;
      const r = buySkill(s, pick.id);
      if (!r.ok) break;
      note(`学会了 ${pick.name}`);
    }

    // 6. 零钱：全塞进当前最低的那项属性。总有地方放得下。
    for (let i = 0; i < 240; i += 1) {
      const open = ATTR_KEYS.filter((k) => s.runner.attrs[k] < ATTR_MAX);
      if (!open.length) break;
      const k = open.sort((a, b) => s.runner.attrs[a] - s.runner.attrs[b])[0];
      if (!can(attrCost(s.runner.attrs[k]))) break;
      const r = buyAttr(s, k);
      if (!r.ok) break;
    }

    if (!bought.length) return [];
    this.save();
    return bought;
  }

  /** 一步走完之后：该结算就结算、该推事件就推。 */
  async afterStep(s) {
    // 理智崩溃
    if (s.runner.san <= 0 && !s.run.settled) {
      await this.finishRun(false, '理智归零');
      return;
    }
    // 生命归零：先看同伴肯不肯替你挡一下，再谈开锁。
    // 顺序不能反——有人愿意替你死，比赌自己能不能活更该先发生。
    if (s.runner.hp <= 0 && !s.run.settled) {
      const guard = mateGuard(s);
      if (guard) {
        s.auto = { lastAt: new Date().toISOString(), steps: (s.auto?.steps ?? 0) + 1 };
        this.save();
        await this.push({
          type: 'infinity.mate',
          text: `（${guard.line}生命被拽回 1 点。）`,
          meta: { event: guard.left ? 'leave' : 'guard', from: guard.name },
        });
        await this.afterStep(s);
        return;
      }
      if (shouldOfferGene(s)) return; // 等主人/她自己决定
      await this.finishRun(false, '生命归零');
      return;
    }
    const done = advance(s);
    this.save();
    if (done) await this.finishRun(true, '');
  }

  /* ---------------- 结算 ---------------- */

  /**
   * 结算 + 落账 + 写手记。
   *
   * 抽出来是因为 flee 和「开锁之后正好走完」这两条路原来各自抄了一遍结算，
   * 结果只有 finishRun 那条会写手记——撤退的局在手记里就凭空消失了。
   */
  settleNow(s) {
    const report = settleRun(s);
    const lines = commitRun(s, report);
    s.run.report = report;
    s.run.settled = true;
    if (!s.meta.clearedWorlds) s.meta.clearedWorlds = [];
    if (report.alive && !s.meta.clearedWorlds.includes(s.run.worldId)) {
      s.meta.clearedWorlds.push(s.run.worldId);
    }
    // 手记必须在 commitRun 之后写：那时候 meta.runs 才是「第几次」。
    if (!Array.isArray(s.journals)) s.journals = [];
    const entry = writeJournal(s, report);
    if (entry) {
      s.journals.push(entry);
      if (s.journals.length > JOURNAL_KEEP) s.journals.splice(0, s.journals.length - JOURNAL_KEEP);
    }
    return { report, lines, entry };
  }

  async finishRun(madeIt, reason) {
    const s = this.ensure();
    if (!s.run || s.run.settled) return null;
    if (!madeIt) {
      s.runner.hp = 0;
      s.runner.san = Math.max(0, s.runner.san);
    }
    const { report, lines } = this.settleNow(s);
    this.save();

    const head = report.alive
      ? `（${report.worldTitle} 出来了。${report.ending.title}。${lines.join('，')}。`
      : `（${report.worldTitle} 没走出来${reason ? '：' + reason : ''}。${lines.join('，')}。`;

    await this.push({
      type: 'infinity.run',
      text: `${head}现在奖励点 ${s.wallet.points}。）`,
      meta: { event: 'settle', alive: report.alive, points: report.points },
    });
    return report;
  }

  async push(event) {
    try {
      await this.host?.pushEvent({ origin: 'internal', ...event });
    } catch (error) {
      this.host?.log?.warn?.(`infinity: 事件没推出去：${error?.message ?? error}`);
    }
  }

  /* ---------------- 文本：给模型看 ---------------- */

  /** 一行兜底状态，prompt 里用。 */
  headLine(s = this.ensure()) {
    const parts = [`生命 ${s.runner.hp}/${maxHp(s)}`, `理智 ${s.runner.san}/${maxSan(s)}`, `${s.wallet.points} 点`];
    if (s.runner.gene.tier > 0) parts.push(`基因锁 ${s.runner.gene.tier} 阶`);
    if (s.runner.gene.karma > 0) parts.push(`心魔 ${s.runner.gene.karma}/${karmaCap(s)}`);
    if (s.run) parts.push(`${BY_ID[s.run.worldId]?.title ?? '副本'} 第 ${s.run.turn} 回合`);
    return parts.join(' · ');
  }

  statusText() {
    const s = this.ensure();
    const a = attrsOf(s);
    const bl = bloodlineOf(s);
    const base = s.runner.attrs;
    const L = [];

    L.push(`轮回者：${s.runner.name}`);
    L.push(
      '属性：' + ATTR_KEYS.map((k) => `${ATTR_LABEL[k]} ${a[k]}${a[k] !== base[k] ? `(+${a[k] - base[k]})` : ''}`).join('　'),
    );
    L.push(`生命 ${s.runner.hp}/${maxHp(s)}　理智 ${s.runner.san}/${maxSan(s)}`);
    L.push(
      `基因锁：${s.runner.gene.tier === 0 ? '没开' : s.runner.gene.tier + ' 阶'}`
      + `（心魔 ${s.runner.gene.karma}/${karmaCap(s)}，当前血统承载上限 ${geneCapOf(s)} 阶）`,
    );
    const g = gradeOf(s);
    L.push(`血统：${bl
      ? `${bl.name}（${bl.tier}${g > 0 ? ` · 浓度 ${g}/${GRADE_MAX}` : ''}）— ${bl.ability} 代价：${bl.cost}`
      : '没有'}`);
    if (s.run?.mate) {
      const m = s.run.mate;
      L.push(`同伴：${m.name}（信任 ${m.trust}/3${m.alive ? '' : `，${m.how ?? '已经不在了'}`}）`);
    } else if (s.run) {
      const def = mateOf(s);
      if (def) L.push(`同伴：${def.name}还没跟上（第 ${def.joinTurn} 回合起）`);
    }
    L.push(
      `技能：${s.runner.skills.map((id) => SKILL_BY_ID[id]?.name ?? id).join('、') || '无'}`,
    );
    const inv = Object.entries(s.runner.inv).filter(([, n]) => n > 0)
      .map(([id, n]) => `${ITEM_BY_ID[id]?.name ?? id}×${n}`);
    L.push(`背包：${inv.join('、') || '空'}`);
    const plots = Object.entries(s.wallet.plots).filter(([, n]) => n > 0)
      .map(([t, n]) => `${t}×${n}`).join(' ');
    L.push(`奖励点 ${s.wallet.points}　支线剧情 ${plots || '无'}`);

    if (!s.run) {
      L.push('');
      // 按评级分档、每档一行——十行并一行折行会断在条目中间，没法读。
      // 这个字符串每次 mg_status 都要付一遍钱，所以仍然保持紧凑。
      const cleared = s.meta.clearedWorlds ?? [];
      const bandOf = (x) => x.band ?? '新手';
      const brief = (x) => `${x.id} ${x.title}(${x.rating}/${x.turns}${cleared.includes(x.id) ? ' 通关' : ''})`;
      for (const b of [...new Set(WORLD_LIST.map(bandOf))]) {
        L.push(`${b}：` + byRating(WORLD_LIST.filter((x) => bandOf(x) === b)).map(brief).join('　'));
      }
      L.push('要进去就 mg_run action=enter world=副本代号，比如 world=re2。');
      return L.join('\n');
    }

    const w = worldOf(s);
    const node = nodeOf(s);
    const list = optionList(s);
    L.push('');
    if (s.run.settled) {
      const r = s.run.report;
      L.push(`【已结算】${w.title} · ${r?.ending?.title ?? ''}`);
      if (r) {
        for (const row of r.rows) L.push(`- ${row.label}${row.points ? `　${row.points > 0 ? '+' : ''}${row.points}` : ''}`);
        L.push(`合计 ${r.points} 点`);
      }
      L.push('要回主神空间就 mg_run action=leave');
      return L.join('\n');
    }

    const left = w.turns - s.run.turn + 1;
    L.push(`【副本中】${w.title}（${w.rating} 级）　第 ${s.run.turn}/${w.turns} 回合　${w.pressure.label} 还剩 ${left}`);
    L.push(`${node.scene}`);
    L.push(node.text);
    L.push('');
    L.push('现在能选的：');
    for (const o of list) {
      const dc = o.kind === 'check' ? `${o.attrLabel} DC${o.dc}（${o.dcLabel}）` : '不用判定';
      const tail = o.ok ? (o.note ? `　— ${o.note}` : '') : `　—— 现在选不了：${o.reason}`;
      L.push(`${o.index + 1}. ${o.label}　[${dc}]${tail}`);
    }
    if (shouldOfferGene(s)) {
      const offer = geneOffer(s);
      L.push('');
      L.push(`⚠ 生命归零。主神给了一次开锁机会：${offer.name}（${offer.desc}）`
        + `成功率 ${Math.round(offer.chance * 100)}%，成了判定 +${offer.gain * 2}，`
        + `失败心魔 +${offer.karma}。用 mg_run action=gene accept=yes/no 决定。`);
    }
    const tier = cheapestPlot(s);
    if (tier) {
      L.push('');
      L.push(`手里有 ${tier} 级支线剧情。要保底就 mg_run action=pick index=N insure=yes ——`
        + `没过自动重掷一次取较好的结果，扣 1 个 ${tier}；过了不扣，大失败保不了。`);
    }
    L.push('');
    L.push('选一个：mg_run action=pick index=N。打不过想跑：action=flee。');
    return L.join('\n');
  }

  chronicleText(limitArg) {
    const s = this.ensure();
    const limit = clampInt(limitArg, 1, 20, 8);
    const L = [];
    L.push(`一共进过 ${s.meta.runs} 次副本，活着出来 ${s.meta.cleared} 次，被抹杀 ${s.meta.failed} 次。`);
    L.push(`最高单次收获 ${s.meta.bestPoints ?? 0} 点。`);

    const lastPost = s.journals?.at(-1);
    if (lastPost) {
      L.push('');
      L.push(`最近一篇手记（${lastPost.at.slice(0, 10)} · ${lastPost.title}）：`);
      L.push(lastPost.text);
    }

    if (s.run?.trail?.length) {
      L.push('');
      L.push(`这一局（${worldOf(s)?.title}）走过的地方：`);
      for (const t of s.run.trail.slice(-limit)) {
        L.push(`第 ${t.turn} 回合 · ${t.scene}｜${t.label}`
          + (t.roll ? `（${t.roll} vs ${t.dc}，${t.success ? '过' : '没过'}）` : ''));
      }
    }

    const logs = s.log.filter((l) => l.kind === 'settle').slice(-limit).reverse();
    if (logs.length) {
      L.push('');
      L.push('以前的结算：');
      for (const l of logs) L.push(`- ${l.text}`);
    }
    if (!s.run?.trail?.length && !logs.length) L.push('\n还没打过。');
    return L.join('\n');
  }

  /** 翻手记原文。她自己的口气，不是履历表。 */
  journalText(limitArg) {
    const s = this.ensure();
    const limit = clampInt(limitArg, 1, 5, 1);
    const posts = (s.journals ?? []).slice(-limit).reverse();
    if (!posts.length) return '还没有写过手记。第一局打完就有了。';
    return posts
      .map((p) => `${p.at.slice(0, 10)}　${p.title}　「${p.ending}」\n${p.text}`)
      .join('\n\n——\n\n');
  }

  /* ---------------- 动作 ---------------- */

  enter(worldId) {
    const s = this.ensure();
    if (s.run) return { ok: false, message: `还在「${worldOf(s)?.title}」里，先打完或者 flee 出来。` };
    if (s.runner.gene.karma >= karmaCap(s)) {
      return { ok: false, message: `心魔已经满了（${s.runner.gene.karma}/${karmaCap(s)}），进副本会被直接判定入魔。先去面板上净化。` };
    }
    const id = String(worldId ?? '').trim().toLowerCase();
    const w = BY_ID[id];
    if (!w) {
      return { ok: false, message: `没有这个副本。能去的是：${WORLD_LIST.map((x) => `${x.id}（${x.title}）`).join('、')}` };
    }
    startRun(s, id);
    s.auto = { lastAt: new Date().toISOString(), steps: (s.auto?.steps ?? 0) + 1 };
    this.save();
    return { ok: true, message: this.statusText(), world: id, title: w.title };
  }

  async pick(index, insure = false) {
    const s = this.ensure();
    if (!s.run) return { ok: false, message: '现在不在副本里。先 mg_run action=enter。' };
    if (s.run.settled) return { ok: false, message: '这一局已经结算了，先 action=leave 回主神空间。' };
    const i = clampInt(index, 1, 4, 1) - 1;
    const res = pickOption(s, i, { insure: Boolean(insure) });
    if (!res.ok) return { ok: false, message: res.error };

    this.save();
    const head = res.roll
      ? `掷 ${res.roll.roll} + ${res.roll.attrMod}${res.roll.bonus ? ` + ${res.roll.bonus}` : ''} = ${res.roll.total}，对 DC${res.roll.dc} —— ${res.success ? '过' : '没过'}。`
      : '';

    return await this.afterPick(s, res, head);
  }

  /** 选完之后统一处理：文字拼装 + 濒死/结算分叉。 */
  async afterPick(s, res, head) {
    const parts = [];
    parts.push(`第 ${res.turn} 回合 · ${res.scene}`);
    parts.push(`你选了：${res.label}`);
    if (head) parts.push(head);
    if (res.lines.length) parts.push(res.lines.join('，'));
    parts.push(`生命 ${res.hp}/${res.hpMax}　理智 ${res.san}/${res.sanMax}`);

    // 理智崩溃：直接判失败
    if (s.runner.san <= 0) {
      const report = await this.finishRun(false, '理智归零');
      parts.push('');
      parts.push(`理智归零。这一局到此为止：${report?.ending?.title ?? ''}`);
      return { ok: true, message: parts.join('\n'), settled: true, report };
    }

    // 生命归零：先看同伴肯不肯替你挡，再谈开锁
    if (s.runner.hp <= 0) {
      const guard = mateGuard(s);
      if (guard) {
        parts.push('');
        parts.push(guard.line);
        parts.push(`生命 1/${maxHp(s)}　${guard.left ? `${guard.name}不在了` : `同伴信任 ${s.run.mate.trust}/3`}`);
        await this.push({ type: 'infinity.mate', text: `（${guard.line}）`, meta: { event: guard.left ? 'leave' : 'guard', from: guard.name } });
        const done = advance(s);
        this.save();
        if (done) {
          const report = await this.finishRun(true, '');
          parts.push('');
          parts.push(`走完了。${report?.ending?.title ?? ''}：${report?.ending?.text ?? ''}`);
          parts.push(`拿到 ${report?.points ?? 0} 点。action=leave 回主神空间。`);
          return { ok: true, message: parts.join('\n'), settled: true, report };
        }
        return { ok: true, message: parts.join('\n') + '\n\n' + this.nextPreview(s) };
      }

      if (shouldOfferGene(s)) {
        const offer = geneOffer(s);
        parts.push('');
        parts.push(`⚠ 生命归零。主神的声音在耳边：要不要赌一次 ${offer.name}？`
          + `成功率 ${Math.round(offer.chance * 100)}%，成了判定 +${offer.gain * 2}，失败心魔 +${offer.karma}。`
          + '用 mg_run action=gene accept=yes/no 决定。');
        return { ok: true, message: parts.join('\n'), pendingGene: true, offer };
      }
      const report = await this.finishRun(false, '生命归零');
      parts.push('');
      parts.push(`生命归零。这一局到此为止：${report?.ending?.title ?? ''}`);
      return { ok: true, message: parts.join('\n'), settled: true, report };
    }

    const done = advance(s);
    this.save();
    if (done) {
      const report = await this.finishRun(true, '');
      parts.push('');
      parts.push(`走完了。${report?.ending?.title ?? ''}：${report?.ending?.text ?? ''}`);
      parts.push(`拿到 ${report?.points ?? 0} 点。action=leave 回主神空间。`);
      return { ok: true, message: parts.join('\n'), settled: true, report };
    }
    return { ok: true, message: parts.join('\n') + '\n\n' + this.nextPreview(s) };
  }

  /** 下一回合的预览。分开一个函数，因为 enter / pick / gene 都要拼这一段。 */
  nextPreview(s) {
    const node = nodeOf(s);
    const list = optionList(s);
    const w = worldOf(s);
    const L = ['', `— 第 ${s.run.turn}/${w.turns} 回合 · ${node.scene} —`, node.text, '', '能选的：'];
    for (const o of list) {
      const dc = o.kind === 'check' ? `${o.attrLabel} DC${o.dc}（${o.dcLabel}）` : '不用判定';
      L.push(`${o.index + 1}. ${o.label}　[${dc}]${o.ok ? '' : `　—— ${o.reason}`}`);
    }
    return L.join('\n');
  }

  async gene(accept) {
    const s = this.ensure();
    if (!s.run) return { ok: false, message: '现在不在副本里。' };
    if (!shouldOfferGene(s)) return { ok: false, message: '现在没有开锁的机会。' };
    const yes = accept !== 'no' && accept !== false;
    const out = attemptGene(s, yes);
    this.save();
    if (!yes) {
      const report = await this.finishRun(false, '放弃开锁');
      return {
        ok: true,
        message: `你没有开锁。手环上那行字灭了。\n这一局到此为止：${report?.ending?.title ?? ''}`,
        settled: true,
        report,
      };
    }
    const parts = [...out.lines];
    parts.push(`生命 ${s.runner.hp}/${maxHp(s)}　心魔 ${s.runner.gene.karma}/${karmaCap(s)}`);
    await this.push({
      type: 'infinity.gene',
      text: `（她在濒死时开了${out.name}：${out.passed ? '成了，属性爆发' : `没成，心魔涨到 ${s.runner.gene.karma}/${karmaCap(s)}`}。骰子落下去了，这件事没有第二次。）`,
      meta: { passed: out.passed, tier: out.tier },
    });
    const done = advance(s);
    this.save();
    if (done) {
      const { report } = this.settleNow(s);
      this.save();
      parts.push('');
      parts.push(`走完了。${report.ending.title}。拿到 ${report.points} 点。`);
      return { ok: true, message: parts.join('\n'), settled: true, report };
    }
    return { ok: true, message: parts.join('\n') + '\n\n' + this.nextPreview(s) };
  }

  flee() {
    const s = this.ensure();
    if (!s.run) return { ok: false, message: '现在不在副本里。' };
    if (s.run.settled) return { ok: false, message: '已经结算了，action=leave 就好。' };
    s.runner.hp = 0;
    s.run.fled = true;
    const { report } = this.settleNow(s);
    this.save();
    return {
      ok: true,
      message: `你提前撤了。主神判定主线失败：${report.ending.title}。点数清零，命保住了。\n`
        + '（撤退不是免费的——它只是比被抹杀便宜。）',
      settled: true,
      report,
    };
  }

  leave() {
    const s = this.ensure();
    if (!s.run) return { ok: false, message: '本来就不在副本里。' };
    if (!s.run.settled) return { ok: false, message: '这一局还没打完，不能直接走。要放弃就 action=flee。' };
    clearRun(s);
    this.save();
    return { ok: true, message: `回到主神空间。${this.statusText()}` };
  }

  /* ---------------- 兑换 ---------------- */

  resolveKey(list, key) {
    const k = String(key ?? '').trim();
    if (!k) return null;
    const lower = k.toLowerCase();
    return (
      list.find((x) => x.id === lower)
      ?? list.find((x) => x.name === k)
      ?? list.find((x) => x.name.includes(k) || k.includes(x.name))
      ?? null
    );
  }

  doAction(action, key, n, tag) {
    const s = this.ensure();

    // 用东西不进兑换：这个动作在副本里也能做，所以放在「副本里不能兑换」之前。
    if (action === 'use') {
      const def = this.resolveKey([...SKILLS, ...ITEMS], key);
      if (!def) return { ok: false, message: `背包里没有「${key}」。` };
      const r = useGear(s, def.id);
      this.save();
      return { ok: r.ok, message: r.message };
    }

    if (s.run && !s.run.settled) {
      return { ok: false, message: '副本里做不了兑换，先出来。' };
    }
    if (!this.cfg('allowSpend', true)) {
      return { ok: false, denied: true, message: '主人还没让我自己花点数。想兑换的话在面板上点，或者去设置里把「允许她自己花点数」打开。' };
    }

    if (action === 'purify') {
      const r = purify(s);
      this.save();
      return { ok: r.ok, message: r.message };
    }

    if (action === 'attr') {
      const k = String(key ?? '').trim().toLowerCase();
      const map = { 力量: 'str', 敏捷: 'agi', 体质: 'con', 智力: 'int', 感知: 'per' };
      const real = ATTR_KEYS.includes(k) ? k : map[String(key ?? '').trim()];
      if (!real) return { ok: false, message: '属性要填 str/agi/con/int/per，或者力量/敏捷/体质/智力/感知。' };
      const r = buyAttr(s, real);
      this.save();
      return { ok: r.ok, message: r.message };
    }

    if (action === 'grade') {
      if (!s.runner.bloodline) return { ok: false, message: '身上还没有血统，没什么可叠的。先去兑换里融合一条。' };
      const r = gradeBloodline(s);
      this.save();
      return { ok: r.ok, message: r.message };
    }

    if (action === 'bloodline') {
      const bl = this.resolveKey(BLOODLINES, key);
      // 换血统是不可逆的终身决定，默认不让她自己拍板；真换得由面板显式带 swap。
      if (s.runner.bloodline && tag !== 'swap') {
        return {
          ok: false,
          message: `身上已经有「${bloodlineOf(s)?.name}」了。想换另一条得走「剥离重铸」——价钱 ×${SWAP_MULT}、浓度清零、旧的不会回来。要更强不走换血统，走 action=grade。`,
        };
      }
      if (!this.cfg('allowSpend', true)) return { ok: false, message: '不允许自己花点数。' };
      if (!bl) {
        const swapping = !!s.runner.bloodline;
        const affordable = BLOODLINES.filter((b) => s.wallet.points >= bloodlinePrice(b, swapping)
          && (!b.plot || (s.wallet.plots[b.plot] ?? 0) > 0));
        return {
          ok: false,
          message: `没找到「${key}」。现在买得起的：${affordable.slice(0, 12).map((b) => `${b.name}（${bloodlinePrice(b, swapping)} 点${b.plot ? '+' + b.plot : ''}）`).join('、') || '一个都买不起'}`,
        };
      }
      const r = buyBloodline(s, bl.id, { swap: tag === 'swap' });
      this.save();
      return { ok: r.ok, message: r.message };
    }

    if (action === 'skill') {
      const sk = this.resolveKey(SKILLS, key);
      if (!sk) return { ok: false, message: `没找到技能「${key}」。` };
      const r = buySkill(s, sk.id);
      this.save();
      return { ok: r.ok, message: r.message };
    }

    if (action === 'item') {
      const it = this.resolveKey(ITEMS, key);
      if (!it) return { ok: false, message: `没找到道具「${key}」。` };
      const r = buyItem(s, it.id, clampInt(n, 1, 5, 1));
      this.save();
      return { ok: r.ok, message: r.message };
    }

    return { ok: false, message: `不认识这个动作：${action}。能办的是 attr / bloodline / grade / skill / item / purify。` };
  }

  /* ---------------- 设置与重开 ---------------- */

  /**
   * 重开一份存档。
   *
   * 只留设置，不留角色——难度和「允不允许她自己花钱」是主人定的，不该被重开清掉。
   * 调用方（面板）必须自己做二次确认，这里不拦。
   */
  resetAll() {
    const s = this.ensure();
    const keep = {
      difficulty: s.settings?.difficulty ?? 'normal',
      autoSpend: s.settings?.autoSpend !== false,
    };
    this.state = createState({ botName: this.ctx.botName });
    this.state.settings = keep;
    this.save();
    return {
      ok: true,
      message: '重开了。她从主神空间第一次睁眼：属性 10，背包里一支急救针，什么都没有。',
    };
  }

  setOption(key, value) {
    const s = this.ensure();
    if (key === 'difficulty') {
      const d = DIFFICULTY[value];
      if (!d) return { ok: false, message: '难度只有 easy / normal / hard 三档。' };
      s.settings.difficulty = value;
      this.save();
      return { ok: true, message: `难度改成「${d.label}」：判定 DC +${d.dc}，伤害 ×${d.hazard}。` };
    }
    if (key === 'autoSpend') {
      s.settings.autoSpend = Boolean(value);
      this.save();
      return { ok: true, message: s.settings.autoSpend ? '她会自己花点数了。' : '她不会再自己花钱，等你点。' };
    }
    return { ok: false, message: `不认识的设置：${key}` };
  }

  /* ---------------- 面板数据 ---------------- */

  payload() {
    const s = this.ensure();
    const a = attrsOf(s);
    const base = s.runner.attrs;
    const bl = bloodlineOf(s);
    const w = worldOf(s);
    const node = s.run && !s.run.settled ? nodeOf(s) : null;
    const list = node ? optionList(s) : [];
    const offer = shouldOfferGene(s) ? geneOffer(s) : null;

    return {
      runner: {
        name: s.runner.name,
        attrs: ATTR_KEYS.map((k) => ({ key: k, label: ATTR_LABEL[k], value: a[k], base: base[k], bonus: a[k] - base[k] })),
        hp: s.runner.hp,
        hpMax: maxHp(s),
        san: s.runner.san,
        sanMax: maxSan(s),
        gene: { tier: s.runner.gene.tier, karma: s.runner.gene.karma, cap: geneCapOf(s), karmaCap: karmaCap(s) },
        bloodline: bl
          ? {
            id: bl.id,
            name: bl.name,
            tier: bl.tier,
            sys: bl.sys,
            ability: bl.ability,
            cost: bl.cost,
            geneCap: bl.geneCap,
            grade: gradeOf(s),
            gradeMax: GRADE_MAX,
            // 进阶之后能力描述不变，但「多浓」这件事要在面板上说清楚。
            attrsScaled: gradeOf(s) > 0
              ? Object.fromEntries(Object.entries(bl.attrs).map(([k, v]) => [k, Math.round(v * (1 + 0.5 * gradeOf(s)))]))
              : bl.attrs,
          }
          : null,
        skills: s.runner.skills.map((id) => SKILL_BY_ID[id]).filter(Boolean)
          .map((k) => ({ id: k.id, name: k.name, tier: k.tier, type: k.type, desc: k.desc })),
        inv: Object.entries(s.runner.inv).filter(([, n]) => n > 0).map(([id, n]) => {
          const it = ITEM_BY_ID[id];
          return { id, n, name: it?.name ?? id, tier: it?.tier ?? 'D', desc: it?.desc ?? '', type: it?.type ?? '消耗' };
        }),
      },
      wallet: { points: s.wallet.points, plots: s.wallet.plots },
      meta: { ...s.meta },
      stats: { ...s.stats },

      mate: (() => {
        const def = mateOf(s);
        if (!def) return null;
        const m = s.run?.mate;
        return {
          id: def.id,
          name: def.name,
          role: def.role ?? '',
          joinTurn: def.joinTurn,
          joined: Boolean(m),
          trust: m?.trust ?? 0,
          maxTrust: 3,
          alive: m?.alive ?? false,
          how: m?.how ?? null,
          bond: def.bond
            ? { min: def.bond.min, attr: def.bond.attr, attrLabel: ATTR_LABEL[def.bond.attr], bonus: def.bond.bonus }
            : null,
          bonus: def.bonus ?? null,
          outcome: mateOutcome(s),
        };
      })(),

      insure: { tier: cheapestPlot(s), can: canInsure(s) },
      journals: (s.journals ?? []).slice(-12).reverse(),

      settings: {
        difficulty: s.settings?.difficulty ?? 'normal',
        autoSpend: this.autoSpendOn(s),
      },
      difficulties: Object.entries(DIFFICULTY).map(([id, d]) => ({
        id, label: d.label, dc: d.dc, hazard: d.hazard,
      })),

      // 背包里现在能直接用的东西（消耗品 + 有治疗次数的技能）。
      usable: (() => {
        const out = [];
        for (const [id, n] of Object.entries(s.runner.inv)) {
          const it = ITEM_BY_ID[id];
          if (!it || !n) continue;
          const h = it.hook ?? {};
          if (h.heal || h.san || h.sanShield || h.reroll || h.light) {
            out.push({ id, name: it.name, n, desc: it.desc, heal: h.heal ?? 0, san: h.san ?? 0 });
          }
        }
        for (const id of s.runner.skills) {
          const sk = SKILL_BY_ID[id];
          if (sk?.hook?.heal) {
            out.push({ id, name: sk.name, n: null, desc: sk.desc, heal: sk.hook.heal, skill: true });
          }
        }
        return out;
      })(),

      worlds: WORLD_LIST.map((x) => ({
        id: x.id,
        title: x.title,
        subtitle: x.subtitle,
        rating: x.rating,
        band: x.band ?? '新手',
        turns: x.turns,
        brief: x.brief,
        accent: x.accent,
        cleared: s.meta.clearedWorlds?.includes(x.id) ?? false,
        sides: x.sides.length,
        sideList: x.sides.map((sd) => ({ desc: sd.desc, points: sd.points, plot: sd.plot })),
        main: x.main.points,
        mate: x.mate ? { name: x.mate.name, role: x.mate.role ?? '' } : null,
        locked: !s.run && s.runner.gene.karma >= karmaCap(s),
      })),

      run: s.run && w
        ? {
          worldId: w.id,
          title: w.title,
          rating: w.rating,
          accent: w.accent,
          turn: s.run.turn,
          turns: w.turns,
          pressure: { label: w.pressure.label, left: Math.max(0, w.turns - s.run.turn + 1), max: w.turns },
          scene: node?.scene ?? '',
          text: node?.text ?? '',
          opts: list.map((o) => ({
            i: o.index + 1,
            label: o.label,
            kind: o.kind,
            dc: o.dc,
            dcLabel: o.dcLabel,
            attrLabel: o.attrLabel,
            note: o.note,
            need: o.need,
            ok: o.ok,
            reason: o.reason,
          })),
          trail: s.run.trail.slice(-16),
          settled: s.run.settled,
          report: s.run.report ?? null,
          geneOffer: offer,
          // 这一局还剩多少次闪避 / 复活 / 重掷，面板要让主人看得见。
          gear: s.run.gear ?? null,
          mate: s.run.mate
            ? { name: s.run.mate.name, trust: s.run.mate.trust, alive: s.run.mate.alive, how: s.run.mate.how }
            : null,
          sides: w.sides.map((x) => ({ desc: x.desc, points: x.points, plot: x.plot })),
        }
        : null,

      shop: {
        attr: ATTR_KEYS.map((k) => ({
          key: k,
          label: ATTR_LABEL[k],
          cur: base[k],
          max: ATTR_MAX,
          cost: base[k] >= ATTR_MAX ? null : attrCost(base[k]),
          can: base[k] < ATTR_MAX && s.wallet.points >= attrCost(base[k]),
        })),

        // 血统浓度：买过一次之后唯一还能往上走的路。
        grade: (() => {
          const cost = gradeCost(s);
          return {
            owned: Boolean(s.runner.bloodline),
            grade: gradeOf(s),
            max: GRADE_MAX,
            next: cost?.next ?? null,
            points: cost?.points ?? null,
            plot: cost?.plot ?? null,
            can: Boolean(cost)
              && s.wallet.points >= cost.points
              && (!cost.plot || (s.wallet.plots[cost.plot] ?? 0) > 0),
          };
        })(),

        bloodlines: BLOODLINES.map((b) => {
          const owned = s.runner.bloodline === b.id;
          const swap = !!s.runner.bloodline && !owned;
          const price = bloodlinePrice(b, swap);
          return {
            id: b.id, name: b.name, tier: b.tier, sys: b.sys, plot: b.plot,
            price, basePrice: b.price, swap,
            attrs: b.attrs, ability: b.ability, cost: b.cost, geneCap: b.geneCap,
            owned,
            can: !owned && s.wallet.points >= price && (!b.plot || (s.wallet.plots[b.plot] ?? 0) > 0),
          };
        }),
        skills: SKILLS.map((k) => ({
          id: k.id, name: k.name, tier: k.tier, type: k.type, desc: k.desc, price: k.price, plot: k.plot,
          owned: s.runner.skills.includes(k.id),
          can: !s.runner.skills.includes(k.id) && s.wallet.points >= k.price && (!k.plot || (s.wallet.plots[k.plot] ?? 0) > 0),
        })),
        items: ITEMS.filter((i) => i.price > 0).map((i) => ({
          id: i.id, name: i.name, tier: i.tier, type: i.type, desc: i.desc, price: i.price, plot: i.plot,
          have: s.runner.inv[i.id] ?? 0,
          can: s.wallet.points >= i.price && (!i.plot || (s.wallet.plots[i.plot] ?? 0) > 0),
        })),
        purify: {
          karma: s.runner.gene.karma,
          cap: karmaCap(s),
          cost: 3000 * s.runner.gene.karma,
          can: s.runner.gene.karma > 0 && s.wallet.points >= 3000 * s.runner.gene.karma,
        },
      },

      log: s.log.slice(-24).reverse(),
      perm: { allowSpend: this.cfg('allowSpend', true), autoRun: this.cfg('autoRun', true) },
    };
  }

  /* ---------------- 宿主契约 ---------------- */

  envPromptVars() {
    if (!this.state) return null;
    return { 'infinity.status': this.headLine(this.state) };
  }

  tools() {
    return TOOL_SPECS.map((spec) => {
      if (spec.name === 'mg_status') {
        return { ...spec, handler: async () => this.statusText() };
      }
      if (spec.name === 'mg_run') {
        return {
          ...spec,
          handler: async (args = {}) => {
            const action = String(args.action ?? 'pick');
            if (action === 'enter') return this.enter(args.world).message;
            if (action === 'gene') return (await this.gene(args.accept)).message;
            if (action === 'flee') return this.flee().message;
            if (action === 'leave') return this.leave().message;
            const insure = args.insure === true || args.insure === 'yes';
            return (await this.pick(args.index, insure)).message;
          },
        };
      }
      if (spec.name === 'mg_do') {
        return {
          ...spec,
          handler: async (args = {}) => this.doAction(args.action, args.key, args.n).message,
        };
      }
      return { ...spec, handler: async (args = {}) => this.chronicleText(args.limit) };
    });
  }

  webUi() {
    const s = this.state;
    const bl = s ? bloodlineOf(s) : null;
    const w = s?.run ? worldOf(s) : null;
    return {
      label: '无限流',
      lamps: [{
        label: '轮回',
        state: s?.run ? 'online' : 'offline',
        hint: s?.run
          ? `${w?.title ?? '副本'} 第 ${s.run.turn}/${w?.turns ?? '?'} 回合`
          : s ? '在主神空间' : '还没被选中',
      }],
      badges: [
        { label: '基因锁', value: s ? `${s.runner.gene.tier} 阶` : '—' },
        { label: '血统', value: bl ? bl.name : (s ? '无' : '—') },
        { label: '点数', value: s ? String(s.wallet.points) : '—' },
        { label: '通关', value: s ? `${s.meta.cleared}/${WORLD_LIST.length}` : '—' },
      ],
      panels: [{
        id: PANEL_ID,
        title: '大肥鱼之无限流',
        description: '角色卡、基因锁、主神兑换，以及副本里的回合推演。',
        getMethods: ['state'],
      }],
      invoke: async (panel, method, args = []) => {
        if (panel !== PANEL_ID) throw new Error(`未知面板：${panel}`);
        if (method === 'state') return this.payload();
        if (method === 'enter') return this.enter(args[0]);
        if (method === 'pick') return await this.pick(args[0], args[1]);
        if (method === 'gene') return await this.gene(args[0]);
        if (method === 'flee') return this.flee();
        if (method === 'leave') return this.leave();
        if (method === 'do') return this.doAction(args[0], args[1], args[2], args[3]);
        if (method === 'use') return this.doAction('use', args[0]);
        if (method === 'setting') return this.setOption(args[0], args[1]);
        if (method === 'reset') return this.resetAll();
        if (method === 'chronicle') return { ok: true, message: this.chronicleText(args[0]) };
        if (method === 'journal') return { ok: true, message: this.journalText(args[0]) };
        throw new Error(`未知方法：${method}`);
      },
      config: [CONFIG_GROUP],
      promptDocs: [{
        key: `worlds.${uid}.envPrompt`,
        title: '大肥鱼之无限流 · 环境提示词',
        description: '一行状态：生命、理智、点数、基因锁、在哪个副本第几回合。不放选项——那些她要用工具自己看。',
        path: ENV_PROMPT_FILE,
        role: 'envPrompt',
        vars: [
          { name: 'infinity.status', description: '生命、理智、奖励点、基因锁几阶、心魔几级、在哪个副本第几回合。' },
        ],
      }],
    };
  }
}

export const INFINITY = {
  id: uid,
  label: '大肥鱼之无限流',
  defaults: () => ({
    enabled: false,
    autoRun: true,
    autoMinutes: 30,
    allowSpend: true,
    notify: 'important',
  }),
  configOptions: (kind) => {
    if (kind !== 'notify') return [];
    return [
      { value: 'important', label: '只在要紧的事开口' },
      { value: 'always', label: '每次都说' },
      { value: 'silent', label: '一声不吭（只写日志）' },
    ];
  },
  create: (ctx) => new InfinityWorld(ctx),
  describe: {
    tools: TOOL_SPECS.map((spec) => ({
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
      tags: spec.tags,
      summary: TOOL_SUMMARIES[spec.name],
    })),
    events: EVENT_DESCRIPTIONS,
  },
};

export default INFINITY;

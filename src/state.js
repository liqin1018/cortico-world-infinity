/**
 * 存档。只有一个 json，写在宿主给的 data 目录里。
 *
 * 原则和海贼王那份一样：坏了就重来，别让整个扩展起不来。
 * 读不懂的旧文件改名留底，不删。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hashString } from './rng.js';

export const STATE_VERSION = 2;

/** 手记留多少篇。多了会把存档撑大，而且没人往前翻到第 40 篇。 */
export const JOURNAL_KEEP = 30;

export function statePath(dataDir) {
  return join(dataDir, 'infinity.json');
}

const BASE_ATTRS = { str: 10, agi: 10, con: 10, int: 10, per: 10 };

export function createState({ botName, now = Date.now() }) {
  const seed = hashString(`${botName || 'runner'}:${now}:${Math.random()}`) >>> 0;
  return {
    version: STATE_VERSION,
    seed,
    createdAt: new Date(now).toISOString(),
    botName: botName || '未命名轮回者',
    runner: {
      name: botName || '未命名轮回者',
      attrs: { ...BASE_ATTRS },
      hp: 100,
      san: 80,
      gene: { tier: 0, karma: 0, domainUses: 0 },
      bloodline: null,
      bloodlineGrade: 0,
      skills: ['brawl'],
      inv: { medkit: 1 },
    },
    wallet: { points: 0, plots: { D: 0, C: 0, B: 0, A: 0, S: 0 } },
    // 难度和自动消费都是存档级的设置：换机器、换会话都该保持一致。
    settings: { difficulty: 'normal', autoSpend: true },
    run: null,
    meta: {
      runs: 0,
      cleared: 0,
      failed: 0,
      mercyUsed: false,
      bestPoints: 0,
      clearedWorlds: [],
      // 同伴记不记得你。键是 mate.id，值是被救 / 被丢的次数。
      mateMemory: {},
      // 每个副本各进过几次——手记里那句「第 N 次」用的是这个，不是总次数。
      worldRuns: {},
    },
    log: [],
    journals: [],
    stats: { kills: 0, saved: 0, deepestTurn: 0 },
  };
}

function looksHealthy(s) {
  return Boolean(
    s
    && Number.isFinite(s.version)
    && s.runner
    && s.runner.attrs
    && s.wallet
    && Array.isArray(s.log),
  );
}

export function loadState(file, opts) {
  if (!existsSync(file)) return createState(opts);
  try {
    const s = JSON.parse(readFileSync(file, 'utf8'));
    if (!looksHealthy(s)) throw new Error('存档结构不对');

    // 兜底：手改过、或从更早的测试版留下来的残缺字段，补成能跑的形状。
    s.runner.attrs = { ...BASE_ATTRS, ...(s.runner.attrs ?? {}) };
    s.runner.gene = { tier: 0, karma: 0, domainUses: 0, ...(s.runner.gene ?? {}) };
    s.runner.skills = Array.isArray(s.runner.skills) ? s.runner.skills.filter((x) => typeof x === 'string') : ['brawl'];
    s.runner.inv = s.runner.inv && typeof s.runner.inv === 'object' ? s.runner.inv : {};
    s.wallet.plots = { D: 0, C: 0, B: 0, A: 0, S: 0, ...(s.wallet.plots ?? {}) };
    s.wallet.points = Number.isFinite(s.wallet.points) ? s.wallet.points : 0;
    s.meta = { runs: 0, cleared: 0, failed: 0, mercyUsed: false, bestPoints: 0, clearedWorlds: [], ...(s.meta ?? {}) };
    s.meta.clearedWorlds = Array.isArray(s.meta.clearedWorlds) ? s.meta.clearedWorlds : [];
    s.meta.mateMemory = s.meta.mateMemory && typeof s.meta.mateMemory === 'object' ? s.meta.mateMemory : {};
    s.meta.worldRuns = s.meta.worldRuns && typeof s.meta.worldRuns === 'object' ? s.meta.worldRuns : {};
    s.runner.bloodlineGrade = Number.isFinite(s.runner.bloodlineGrade) ? s.runner.bloodlineGrade : 0;
    s.settings = { difficulty: 'normal', autoSpend: true, ...(s.settings ?? {}) };
    if (!['easy', 'normal', 'hard'].includes(s.settings.difficulty)) s.settings.difficulty = 'normal';
    s.stats = { kills: 0, saved: 0, deepestTurn: 0, ...(s.stats ?? {}) };
    s.log = Array.isArray(s.log) ? s.log.slice(-120) : [];
    s.journals = Array.isArray(s.journals) ? s.journals.slice(-JOURNAL_KEEP) : [];
    if (s.run && (!s.run.worldId || !Number.isFinite(s.run.turn))) s.run = null;
    // 旧档里的 run 没有 mate 字段——补成 null，而不是 undefined。
    // maybeJoinMate 用 `if (state.run.mate)` 判重，undefined 会让它每回合都重新加入一次。
    if (s.run) {
      s.run.mate = s.run.mate && typeof s.run.mate === 'object' ? s.run.mate : null;
      s.run.flags = s.run.flags && typeof s.run.flags === 'object' ? s.run.flags : {};
    }
    s.version = STATE_VERSION;
    return s;
  } catch {
    const broken = `${file}.broken-${new Date().toISOString().replaceAll(':', '-')}`;
    try { renameSync(file, broken); } catch { /* 留不下就算了，别挡住启动 */ }
    return createState(opts);
  }
}

export function saveState(file, state) {
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  renameSync(tmp, file);
}

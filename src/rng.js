/**
 * 随机数。整局的可复现性全靠它：同一个 seed + 同一串选择 = 同一个结果。
 * 存档里只存 seed 和「选择流水」，出问题时能照着复现一遍。
 */

export function hashString(input) {
  let h = 2166136261 >>> 0;
  const s = String(input);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 一个带状态的骰子机：每次 d100 都往前推一步，结果可复现。 */
export function makeDice(seed) {
  const rand = mulberry32(seed);
  return {
    d100: () => 1 + Math.floor(rand() * 100),
    dN: (n) => 1 + Math.floor(rand() * n),
    chance: (p) => rand() < p,
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    next: rand,
  };
}

export function pick(random, arr) {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * 判定：D100 + 属性×2 + 加成，对比 DC。
 * 96–100 记大成功，1–5 记大失败——这两档各自有额外后果，不只看过没过。
 */
export function d100Check(dice, attrValue, dc, bonus = 0) {
  const roll = dice.d100();
  const attrMod = attrValue * 2;
  const total = roll + attrMod + bonus;
  return {
    roll,
    attrMod,
    bonus,
    total,
    dc,
    success: total >= dc,
    crit: roll >= 96 ? 'success' : roll <= 5 ? 'fail' : null,
  };
}

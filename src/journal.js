/**
 * 轮回手记。
 *
 * 一局一篇，第一人称，四五句话。不用模型——手记要「稳」：
 * 同一份存档翻两次，读到的必须是同一段字。骰子和选择已经决定了故事，
 * 这里只负责把它说成一个活人的口气。
 *
 * 一篇由四块拼起来：
 *   1. 第几次，以及那地方的空气是什么味道
 *   2. 这一局最险的一次判定（从 trail 里挑 DC 最高、且没过的那条）
 *   3. 身边那个人——同伴活着、没跟上来，或者一个人都没有
 *   4. 结局、点数、身上还剩多少
 *
 * 第三条是有意写死的：没有同伴的局就写环境。人不在的时候，
 * 记下来的东西会变多，这是真的。
 */
import { makeDice } from './rng.js';
import { worldOf, mateOutcome } from './engine.js';

/** 每个副本一句空气。必须是「进去就一定闻得到」的东西，不能是结果。 */
const PLACES = {
  re1: [
    '蜂巢地下的空气里一直有槐花味，混着一点铁锈。',
    '红色的应急灯每七秒闪一次，我后来发现自己一直在跟着它数。',
    '走廊里的水是红的，踩上去没有声音。',
  ],
  re2: [
    '警局的灯每隔几秒暗一下，像有人在很远的地方拉总闸。',
    '外面在烧，爆炸一下一下，很有规律。',
    '下水道的水到膝盖，是黑的，声音大得盖住别的声音。',
  ],
  jp1: [
    '雨一直没停，打在车顶上像有人在撒石子。',
    '岛上的鸟叫得很密，密到不像是鸟。',
    '围栏上的电每隔三秒响一次，很轻。',
  ],
  fd2: [
    '公路上的车灯一盏一盏往回退，像有人在收线。',
    '天一直没亮。天亮是很久以后的事。',
    '收音机自己开着，放的是一首很老的歌。',
  ],
  a2: [
    '殖民地走廊上的灯只亮一半，地上有一层黏的东西。',
    '反应堆下面的温度很高，高到呼吸会疼。',
    '气闸外面是黑的，什么都没有。',
  ],
  juon: [
    '这栋房子的榻榻米有一股霉味，混着一点香。',
    '二楼的天花板比别处低，走进去要低头。',
    '隔壁的电视一直开着，笑声很大，没有人看。',
  ],
  noes: [
    '教室里的钟停在三点十七分，每一间都是。',
    '我已经很久没有睡过了，久到记不清是第几天。',
    '走廊两边的门上都写着名字，粉笔字。',
  ],
  mummy: [
    '沙漠的白天热得看不清远处，晚上冷得睡不着。',
    '沙子进了鞋里，走一步磨一下。',
    '地下墓室的空气是干的，干到喉咙发疼。',
  ],
  lotr: [
    '卡兰拉斯山上的雪到膝盖，风从北边来。',
    '摩瑞亚的石头是凉的，摸久了手会麻。',
    '圣盔谷的夜里全是雨声和号角声，分不清哪个更近。',
  ],
  sst: [
    '前哨站的墙只有三面，第四面是空的。',
    '虫子的声音像下雨，但比雨密。',
    '撤离艇的引擎声一直在远处响，一直没靠近。',
  ],
};

/** 一个人走完的时候，脑子里挥不去的那个画面。只写环境，不写结果。 */
const DETAILS = {
  re1: [
    '我一直在想那三十六个槽里空掉的十九个。',
    '镜子里那枚戒指，我到现在都不知道是谁的。',
  ],
  re2: [
    '我一直在想那个孩子数到七就停下来的那一下。',
    '铜牌下面那行口红字，写的是「别上楼」。',
  ],
  jp1: [
    '我一直在想岛上那些鸟一起停下来的那一下。',
    '那只电子恐龙一直叫，叫得很有礼貌。',
  ],
  fd2: [
    '我一直在想那口空棺材里放着的东西。',
    '有人从一数到七，数到七就停了。',
  ],
  a2: [
    '我一直在想墙上那些还活着的、看着我的眼睛。',
    '纽特把手指放在嘴上的那个动作，很轻。',
  ],
  juon: [
    '我一直在想日记最后那几行——字是刻出来的。',
    '被子里那个形状，我到现在也没敢想完。',
  ],
  noes: [
    '我一直在想那扇门上被红笔圈起来的名字。',
    '他用五根刀片在脸上划的那一下，很慢。',
  ],
  mummy: [
    '我一直在想那句「他本来只是想救她」。',
    '沙子上那道拖痕，往哈姆纳塔的方向。',
  ],
  lotr: [
    '我一直在想佛罗多说「它是我的」的时候，眼睛是什么样的。',
    '摩瑞亚的鼓声从很深的地方传上来，一直没有停。',
  ],
  sst: [
    '我一直在想那句「我这位置好」。',
    '地下通道里的空气是温的，像有人在里面呼吸。',
  ],
};

/** 活下来时的收尾。按点数分档，写得比「+2600」具体一点。 */
function settleLine(report) {
  const p = report.points;
  if (!report.alive) return '这一局到此为止。手环上只留了一行字。';
  if (p >= 6000) return `结局是「${report.ending.title}」。${p} 点。手环停得比平时久了一点。`;
  if (p >= 3000) return `结局是「${report.ending.title}」。${p} 点。够换点东西了。`;
  if (p > 0) return `结局是「${report.ending.title}」。${p} 点。不多，但活着。`;
  return `结局是「${report.ending.title}」。0 点。这一趟等于白走。`;
}

/** 身上的伤。写这个是为了让「活着回来」有重量，不然只是加了个数字。 */
function bodyLine(report) {
  if (!report.alive) return '';
  const hp = report.hpMax > 0 ? report.hp / report.hpMax : 1;
  const san = report.sanMax > 0 ? report.san / report.sanMax : 1;
  if (hp <= 0.2) return '回去的时候我在数自己还剩几口气。';
  if (san <= 0.2) return '回去之后我坐着，没有开灯，坐了很久。';
  if (hp <= 0.45) return '身上有几处到第二天才开始疼。';
  return '';
}

export function writeJournal(state, report) {
  const w = worldOf(state);
  if (!w || !report) return null;

  // 用这一局的 seed 派生，去掉高位——同一局永远生成同一篇。
  const dice = makeDice((state.run.seed ^ 0x5bf03635) >>> 0);
  const pick = (arr) => (Array.isArray(arr) && arr.length ? arr[dice.dN(arr.length) - 1] : '');

  const lines = [];
  // 「第几次」按这个副本单独算：第 15 次进蜂巢和第 3 次进蜂巢，是两种心情。
  const seen = state.meta.worldRuns?.[w.id] ?? 1;
  lines.push(seen <= 1 ? '第一次进这里。' : `第 ${seen} 次进这里。`);
  lines.push(pick(PLACES[w.id]) || w.subtitle);

  // 最险的一次：判定里 DC 最高的；同档优先挑没过的——那才是记得住的那一下。
  const risky = (state.run.trail ?? [])
    .filter((t) => Number.isFinite(t.dc))
    .sort((a, b) => (b.dc - a.dc) || (Number(a.success) - Number(b.success)));
  const hard = risky[0];
  if (hard) {
    const tail = hard.success
      ? (hard.dc >= 60 ? '过了。我自己都不太信。' : '过了。')
      : (hard.dc >= 60 ? '没成。那一下之后我在地上躺了很久。' : '没成。');
    lines.push(`第 ${hard.turn} 回合，${hard.scene}，我${hard.label}。${tail}`);
  }

  const m = state.run?.mate;
  const mate = mateOutcome(state) ?? report.mate;
  if (mate?.status === 'alive') {
    lines.push(m?.memory === 'saved' && (m.seen ?? 0) > 1
      ? `${mate.name}跟我一起出来了。他一见面就叫出了我的名字。`
      : `${mate.name}跟我一起出来了。`);
  } else if (mate?.status === 'lost') {
    if (m?.memory === 'lost' && (m.seen ?? 0) > 1) {
      lines.push(`${mate.name}没有跟上来。他大概早就知道会这样。`);
    } else {
      lines.push(`${mate.name}没有跟上来。我回头看过，只看到门。`);
    }
  } else {
    lines.push(pick(DETAILS[w.id]) || '');
  }

  lines.push(settleLine(report));
  const body = bodyLine(report);
  if (body) lines.push(body);

  return {
    at: new Date().toISOString(),
    worldId: w.id,
    title: w.title,
    ending: report.ending.title,
    alive: report.alive,
    points: report.points,
    turns: report.turns,
    visit: seen,
    text: lines.filter((x) => x && x.trim()).join('\n'),
  };
}

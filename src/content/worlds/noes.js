/**
 * 猛鬼街（B 级 · 12 回合）
 *
 * 唯一一个「判定失败会被判成假醒」的副本。玩家永远不确定自己现在是不是在梦里，
 * 所以这一部所有的代价都写在理智上，而不是生命上。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const NOES = audit({
  id: 'noes',
  title: '猛鬼街',
  subtitle: '斯普林伍德 · 第七夜',
  rating: 'B',
  band: '进阶',
  turns: 12,
  accent: '#7a4a3c',
  pressure: { label: '距离天亮', max: 12 },
  brief: '保持清醒，或者学会在梦里打赢他。睡着的人不会醒过来——他们只是不再起床。',
  intro:
    '你在一间教室里醒来。窗外的天是灰的，钟停在三点十七分。\n\n'
    + '黑板上写着一行字，粉笔灰还在往下掉：\n\n'
    + '**「一、二，他来找你。三、四，锁好门。」**\n\n'
    + '教室里还有四个人在睡。其中一个女孩的手背上有四道抓痕，很新。\n\n'
    + '手环上写着：**距离天亮，12 个刻度。**',
  main: { desc: '活到天亮，并且真的醒着', points: 1500 },
  sides: [
    { id: 'nancy', desc: '让南希·汤普森活着并信任你', points: 3200, plot: 'B' },
    { id: 'freddy', desc: '在梦里彻底杀死弗莱迪', points: 2600, plot: 'B' },
    { id: 'relic', desc: '找到弗莱迪的遗物与埋葬地点', points: 2000, plot: 'C' },
    { id: 'awake', desc: '让至少两个少年保持清醒', points: 1500, plot: 'C' },
  ],
  /**
   * 南希。这个世界唯一的规矩是「不要一个人睡」，
   * 所以同伴在这里不是战力，是闹钟——她只需要在你睡着的时候把你叫醒。
   */
  mate: {
    id: 'nancy',
    name: '南希·汤普森',
    role: '已经跟这件事纠缠了二十年的人',
    joinTurn: 4,
    trust: 1,
    bond: { min: 2, attr: 'int', bonus: 10 },
    bonus: { points: 900, plot: 'C' },
    survives: () => true,
  },
  nodes: [
    {
      scene: '教室 · 三点十七分',
      text: '钟不走。秒针在原地抖，抖得很规律，像有人在数。\n\n'
        + '那个手背有抓痕的女孩突然醒过来，喘得很厉害。她看见你，第一句话是：\n\n'
        + '「你刚才有没有听见有人在唱歌？」',
      opts: () => [
        flat('说没有', { flag: 'lied_to_girl', san: -4 }, { note: '她点点头，然后说：那他现在在你这儿了' }),
        roll('问她抓痕是怎么来的', 'per', 45, { flag: 'know_freddy', san: -6 }, { san: -8 }),
        flat('把教室里的窗全打开，让冷风进来', { flag: 'windows_open', san: -2 }, { note: '没有人睡着的时候，他不来' }),
      ],
    },
    {
      scene: '锅炉房 · 第一次睡着',
      text: '你不记得自己是什么时候闭上眼的。\n\n'
        + '睁眼的时候你在一间锅炉房里，很热，管子一直在响。'
        + '墙上有四道很深的划痕，从上到下，像有人用五根刀片刮过去。\n\n'
        + '身后有脚步声。金属的，一下一下，很慢，不着急。',
      opts: () => [
        roll('往出口跑', 'agi', 55, { flag: 'ran_boiler', san: -8 }, { hp: -18 }),
        roll('躲进管子后面，屏住呼吸', 'agi', 50, { flag: 'hid_boiler' }, { hp: -12, san: -8 }),
        flat('转过身，看清他', { flag: 'saw_freddy', san: -16 }),
      ],
    },
    {
      scene: '教室 · 醒来',
      text: '你猛地坐起来。还在教室，钟还是三点十七分。\n\n'
        + '但你手背上多了四道抓痕，正在渗血。\n\n'
        + '那个女孩看着你的手，说：「现在你也有了。」她说这话的时候，'
        + '语气很平，像在说天气。她叫南希。',
      opts: () => [
        flat('把袖子拉下来，遮住抓痕', { flag: 'hid_marks', san: -6 }),
        roll('让南希看伤口，问她这意味着什么', 'int', 45, { flag: 'nancy_trust', flag2: 'know_marks', san: -4 }, { san: -8 }),
        flat('去洗手间，用冷水冲', { flag: 'washed', san: -4 }, { note: '血冲掉了，抓痕还在。像刻在骨头上的' }),
      ],
    },
    {
      scene: '南希家 · 地下室',
      text: '南希家的地下室堆满了旧报纸。她把一叠剪报摊在地上，'
        + '每一张都是同一个案子：二十年前，一个叫弗莱迪·克鲁格的人，'
        + '在春木镇的幼儿园里杀了十几个孩子，然后被家长烧死。\n\n'
        + '「他们没找到尸体。」她说，「烧的地方是一间锅炉房。」',
      opts: () => [
        roll('把剪报按时间排一遍', 'int', 50, { flag: 'read_clippings', flag2: 'know_relic', san: -6 }, { san: -10 }),
        flat('问她是怎么找到这些的', { flag: 'nancy_story', san: -4, trust: 1 }),
        flat('问她打算怎么做', { flag: 'nancy_plan', san: -3, trust: 1 }, { note: '她说：把他埋了。埋了就不能回来了' }),
      ],
    },
    {
      scene: '医院 · 病房',
      text: '一个少年被送进了医院。医生说他只是缺觉，'
        + '但他一直在抖，说有人在他床边站着。\n\n'
        + '你到的时候，病床是空的。窗户关着，玻璃从内侧裂开。\n\n'
        + '护士说：「刚才还有人在里面唱歌。」',
      opts: () => [
        roll('沿着裂开的痕迹找', 'per', 55, { flag: 'followed_trace', san: -10 }, { hp: -15 }),
        roll('让所有护士别睡，也别离开门口', 'int', 50, { flag: 'staff_warned', san: -6 }, { san: -10 }),
        flat('掀开床单看', { flag: 'saw_under_bed', san: -14 }, { note: '床单下面写着三个字：轮到你了' }),
      ],
    },
    {
      scene: '梦中 · 走廊',
      text: '走廊很长，两边都是门。每一扇门上都写着名字，'
        + '名字是粉笔写的，有些被擦花了。\n\n'
        + '你走到一半的时候，发现自己的名字在最尽头那扇门上，'
        + '而且已经被人用红笔圈了起来。',
      opts: () => [
        roll('打开自己名字那扇门', 'con', 60, { flag: 'opened_own', san: -18 }, { hp: -22, san: -24 }),
        roll('往回走，找出口', 'agi', 55, { flag: 'walked_back', san: -10 }, { hp: -16 }),
        flat('在门上把自己的名字擦掉', { flag: 'erased_name', san: -12 }, { note: '擦掉之后，所有门一起打开了' }),
        flat('让南希在现实里叫醒你', { flag: 'walked_back', san: -6, trust: -1 },
          { ...bond(2), note: '你听见她在很远的地方拍你的脸，拍了很久' }),
      ],
    },
    {
      scene: '梦中 · 浴室',
      text: '浴缸里的水是满的，还在冒热气。水面很平，平得像一块玻璃。\n\n'
        + '倒影里不是你。是一个戴帽子的男人，'
        + '他抬起手，用五根刀片在自己的脸上划了一下，然后笑了。\n\n'
        + '他说：「我一直想见你。」',
      opts: () => [
        roll('把手伸进水里，抓住他', 'str', 65, { flag: 'grabbed_freddy', san: -16 }, { hp: -30, san: -20 }),
        roll('关掉水龙头', 'int', 55, { flag: 'tap_off', san: -10 }, { san: -14 }),
        flat('退出去，不看了', { flag: 'left_bath_dream', san: -8 }),
      ],
    },
    {
      scene: '旧锅炉房 · 遗物',
      text: '南希带你到了那间烧过的锅炉房。二十年了，墙还是黑的。\n\n'
        + '地上有一块铁板，铁板下面是空的。南希说：\n\n'
        + '「他们烧了他，但没有人收骨灰。如果他还有东西留在这里，就是他回来的路。」',
      opts: () => [
        roll('把铁板掀开', 'str', 55, { flag: 'relic_found', san: -8 }, { hp: -14 }),
        roll('用铁棍撬，慢慢来', 'int', 50, { flag: 'relic_found', flag2: 'opened_carefully', san: -6 }, { san: -10 }),
        flat('问南希「如果下面不是骨灰呢」', { flag: 'asked_nancy', san: -6 }),
      ],
    },
    {
      scene: '锅炉房 · 骨灰',
      text: '铁板下面是一只铁盒，盒子上刻着一个名字，已经被磨掉一半。\n\n'
        + '打开的时候里面不是骨灰，是一只手套。四根刀片，一根一根焊上去的。\n\n'
        + '南希说：「就是这个。烧了它，他就没有东西可以回来了。」',
      opts: () => [
        flat('当场烧掉手套', { flag: 'burned_glove', san: -10 }, { note: '手套烧起来的时候，你听见有人在很远的地方叫你的名字' }),
        roll('先把手套带走，等天亮再处理', 'con', 55, { flag: 'kept_glove', san: -14 }, { hp: -18 }),
        flat('把手套埋回铁板下面，什么都不做', { flag: 'rebured', san: -8 }),
      ],
    },
    {
      scene: '梦 · 第三层',
      text: '你在一个房间里醒来，床、窗户、一杯水。南希在楼下煮咖啡，'
        + '她抬头笑着说：「你睡得挺久。」\n\n'
        + '窗外是灰的天。钟是三点十七分。\n\n'
        + '你注意到南希的手背上，抓痕的位置和刚才一模一样，'
        + '一模一样——连血痂的形状都没有变。',
      opts: () => [
        roll('砸掉桌上那杯咖啡', 'str', 60, { flag: 'broke_cup', san: -14 }, { hp: -20, flag: 'sank_deeper' }),
        roll('问南希「今天是几号」', 'int', 55, { flag: 'asked_date', san: -12 }, { san: -16 }),
        flat('什么都不做，继续睡', { flag: 'stayed_asleep', san: -20 }, { note: '很舒服。舒服得不像真的' }),
      ],
    },
    {
      scene: '现实 · 南希的房间',
      text: '你睁开眼。南希在你旁边，正用手拍你的脸，拍得很用力。\n\n'
        + '「你刚才在笑。」她说，「你睡着的时候一直在笑。」\n\n'
        + '房间里有很多人，都在站着，都不敢坐下。',
      opts: () => [
        flat('把梦里的三层告诉她', { flag: 'told_layers', flag2: 'nancy_trust', san: -6 }),
        roll('站起来，去拿那只手套', 'con', 50, { flag: 'got_glove', san: -8 }, { hp: -10 }),
        flat('抓住南希的手，确认她是真的', { flag: 'checked_nancy', san: -4 }, { note: '她的手是暖的。你想这可能也不代表什么' }),
      ],
    },
    {
      scene: '天亮',
      text: '窗外从黑变成灰，再变成白。\n\n'
        + '钟开始走了。秒针从三点十七分跳到三点十八分，'
        + '声音很大，像有人在你耳边敲了一下。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('站起来，走出去', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.nancy_trust) hit.push('nancy');
    if (f.burned_glove && f.relic_found) hit.push('freddy');
    if (f.relic_found) hit.push('relic');
    const awakeCount = [f.windows_open, f.staff_warned, f.nancy_trust, f.told_layers].filter(Boolean).length;
    if (awakeCount >= 2) hit.push('awake');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.stayed_asleep) out.push({ label: '在那间「安全屋」里继续睡', points: -2000 });
    if (s.flags.rebured) out.push({ label: '把手套又埋回去了', points: -1000 });
    return out;
  },
  endings: [
    {
      when: (f) => f.burned_glove && f.relic_found && f.nancy_trust,
      title: '手套',
      text: '手套烧完的时候，天刚好亮。\n\n'
        + '南希说：「结束了。」但她的手一直在抖，抖了很久才停。\n\n'
        + '你后来才知道，她父亲二十年前也说过一样的话。说完之后，'
        + '他睡了三天，再也没醒过来。',
    },
    {
      when: (f) => f.broke_cup,
      title: '第四层',
      text: '杯子里没有咖啡。杯子是空的。\n\n'
        + '砸掉之后，房间像一块布一样被扯开，后面是黑的。'
        + '你掉进去的时候听见有人在喊你的名字，喊得很远。\n\n'
        + '你醒过来的时候，身上全是汗，手背上多了四道抓痕。'
        + '南希说：「你刚才死了三分钟。」',
    },
    {
      when: (f) => f.stayed_asleep,
      title: '安全屋',
      text: '咖啡是热的，窗外是灰的，南希在楼下唱歌。\n\n'
        + '你在这里住了很久。每一天都一样，每一天都很舒服。\n\n'
        + '主神在结算界面上只写了一行字：\n\n'
        + '「她还活着。她只是不再醒来了。」',
    },
    {
      when: () => true,
      title: '醒着',
      text: '你活到了天亮，而且确定自己是醒着的——至少这一刻是。\n\n'
        + '手环上显示：奖励点 +1500。下面那行字很淡：\n\n'
        + '「下一局如果你睡着，记得先看钟。」',
    },
  ],
});

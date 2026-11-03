/**
 * 咒怨（B 级 · 12 回合）
 *
 * 第一次出现「不可击杀的敌人」。她一出现，就不要掷骰——掷骰会让人以为能赢。
 * 这个副本的所有判定都关于「能不能在她来之前做完手里的事」。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const JUON = audit({
  id: 'juon',
  title: '咒怨',
  subtitle: '东京都 · 佐伯家',
  rating: 'B',
  band: '进阶',
  turns: 12,
  accent: '#6b5f8a',
  pressure: { label: '距离天亮', max: 12 },
  brief: '活到天亮。这里没有可以打死的东西——进门的人会被标记，然后它有的是时间。',
  intro:
    '你站在一栋两层木造住宅的门口。门牌上写着「佐伯」。\n\n'
    + '门是虚掩的，里面没有开灯，但二楼有一扇窗是亮的，窗帘在动，'
    + '像有人刚刚从窗边退开。\n\n'
    + '隔壁的老太太隔着篱笆看你，说：「那栋房子，不要进去。」\n\n'
    + '手环上没有敌人。只有一行字：**进入即被标记。**',
  main: { desc: '活到天亮', points: 1500 },
  sides: [
    { id: 'rika', desc: '让理佳活着走出这栋房子', points: 3000, plot: 'B' },
    { id: 'truth', desc: '找到伽椰子的日记和遗体', points: 2500, plot: 'B' },
    { id: 'burn', desc: '在天亮前烧掉这栋房子', points: 2000, plot: 'C' },
    { id: 'clean', desc: '让至少两个人身上没有标记', points: 1500, plot: 'C' },
  ],
  /**
   * 理佳。她不是同伴，是同路人——这栋房子里没有「同伴」这种东西，
   * 只有「还跟着的人」和「已经不在了的人」。她只有先愿意进门，才谈得上信任。
   */
  mate: {
    id: 'rika',
    name: '理佳',
    role: '上个月在这里做过义工的人',
    joinTurn: 5,
    trust: 2,
    joinWhen: (s) => Boolean(s.flags.rika_in),
    bond: { min: 2, attr: 'per', bonus: 10 },
    bonus: { points: 900, plot: 'C' },
    survives: (s) => !s.flags.satsumi_left,
  },
  nodes: [
    {
      scene: '佐伯家 · 玄关',
      text: '玄关的鞋柜上摆着一双小孩子的鞋，鞋头朝里。地上有一层灰，'
        + '灰上只有一种脚印，来来回回，都是同一个尺码。\n\n'
        + '墙上贴着一张纸：「请勿进入二楼。」\n\n'
        + '你跨过门槛的时候，手环上跳了一下：**标记 +1。**',
      opts: () => [
        flat('直接进去，上楼', { flag: 'entered', san: -8 }, { note: '门在你身后自己合上了' }),
        roll('先在玄关看一遍那圈脚印', 'per', 45, { flag: 'entered', flag2: 'read_prints', san: -4 }, { flag: 'entered', san: -10 }),
        flat('退出去，先绕到房子后面看', { flag: 'went_around', san: -3 }, { note: '后窗里有个人站着，一动不动' }),
      ],
    },
    {
      scene: '一楼 · 客厅',
      text: '客厅很整齐，整齐得不像有人住过。茶几上有一杯水，水面还在动。\n\n'
        + '电视是开着的，没有信号，只有雪花。雪花中间偶尔会浮出一张脸，'
        + '出现的时间不到一秒。\n\n'
        + '墙上挂着一张全家福，照片上有三个人。中间那个人的脸被抠掉了。',
      opts: () => [
        roll('盯着电视看，等那张脸再出现', 'per', 55, { flag: 'saw_face', san: -14 }, { san: -20 }),
        flat('把照片从墙上取下来', { flag: 'got_photo', san: -6 }),
        flat('关掉电视', { flag: 'tv_off', san: -4 }, { note: '关掉之后，雪花的声音还在' }),
      ],
    },
    {
      scene: '二楼 · 壁橱',
      text: '二楼的走廊很短，尽头是一间儿童房。壁橱的门是关着的，'
        + '门缝里透出一点光，不是灯光，是那种很白的、像屏幕的光。\n\n'
        + '你走近的时候，壁橱里有东西动了一下。\n\n'
        + '然后有一个孩子的声音说：「你找我妈妈吗？」',
      opts: () => [
        roll('拉开壁橱门', 'con', 55, { flag: 'met_toshio', san: -14 }, { hp: -12, san: -20 }),
        flat('隔着门回答「是」', { flag: 'met_toshio', flag2: 'said_yes', san: -10 }),
        flat('不回答，退下楼', { flag: 'left_upstairs', san: -6 }),
      ],
    },
    {
      scene: '阁楼 · 拉门',
      text: '天花板上有一道拉门，边缘被胶带封过，胶带已经发黄、翘起。\n\n'
        + '你把耳朵贴上去，能听见上面有声音。不是脚步，是头发在木地板上拖过去的声音。\n\n'
        + '很慢，一圈一圈。',
      opts: () => [
        roll('撕开胶带，拉开阁楼', 'str', 60, { flag: 'attic_open', san: -12 }, { hp: -15, san: -16 }),
        roll('先数上面转了几圈', 'per', 50, { flag: 'counted_turns', san: -8 }, { san: -14 }),
        flat('把胶带重新按紧', { flag: 'taped_shut', san: -6 }, { note: '上面的声音停了。停得太快了' }),
      ],
    },
    {
      scene: '门口 · 理佳',
      text: '门口站着一个年轻女人，手里拎着便利店的袋子。她看见你，先愣了一下，'
        + '然后表情变了。\n\n'
        + '「你也进去了？」她说，「我叫理佳。上个月我在这里做义工，'
        + '照顾一个卧床的老人。」\n\n'
        + '她伸出手，手背上有三道抓痕，已经结痂了。',
      opts: () => [
        flat('告诉她实情，让她别进去', { flag: 'rika_warned', san: 3 }),
        roll('问她手背上的伤是怎么来的', 'int', 45, { flag: 'rika_story', flag2: 'know_oldman' }, { san: -6 }),
        flat('让她进来帮忙', { flag: 'rika_in', san: -8 }, { note: '她犹豫了三秒，然后进来了' }),
      ],
    },
    {
      scene: '一楼 · 浴室',
      text: '浴室的门开着。浴缸里没有水，但缸底是湿的，湿的形状是一个人的轮廓。\n\n'
        + '排水口堵着一团头发。你看着它的时候，它动了一下，'
        + '像有什么东西从下面往上顶。\n\n'
        + '天花板上有一块水渍，形状像一张脸，脸朝下。',
      opts: () => [
        roll('把那团头发掏出来', 'con', 60, { flag: 'pulled_hair', san: -16 }, { hp: -14, san: -20 }),
        flat('打开水龙头，冲下去', { flag: 'flushed', san: -8 }),
        flat('关上门，别管它', { flag: 'left_bath', san: -6 }),
      ],
    },
    {
      scene: '走廊 · 电话',
      text: '走廊尽头有一台老式座机，红色的，没有接线。\n\n'
        + '它响了。\n\n'
        + '你接起来，对面没有声音。只有呼吸，很轻，很有节奏，'
        + '像小孩睡着了。然后，一个女人的声音，非常近，几乎在你耳朵里：\n\n'
        + '「……你在我家。」',
      opts: () => [
        roll('把听筒放下，不要回答', 'con', 50, { flag: 'hung_up', san: -10 }, { san: -18, flag: 'answered' }),
        flat('问她「你是谁」', { flag: 'asked_name', san: -14 }, { note: '对面笑了。笑声是从楼上来的' }),
        flat('把电话线扯断', { flag: 'phone_broken', san: -8 }, { note: '它还在响' }),
      ],
    },
    {
      scene: '隔壁 · 胜美家',
      text: '隔壁的房门开着。客厅里没有人，电视还开着，播的是一个综艺节目，笑声很大。\n\n'
        + '胜美坐在卧室的角落里，用被子把自己裹起来。她看见你，一直在重复一句话：\n\n'
        + '「它在我被子里。它在我被子里。」',
      opts: () => [
        roll('把被子掀开', 'con', 60, { flag: 'satsumi_saved', san: -14 }, { hp: -16, san: -22 }),
        flat('先带她离开这间屋子', { flag: 'satsumi_out', san: -6 }),
        flat('什么都不做，退出去', { flag: 'satsumi_left', san: -10 }),
        flat('让理佳去掀被子，你在门口看着走廊', { flag: 'satsumi_saved', san: -6, trust: -1 },
          { ...bond(2), note: '她掀开了。里面什么都没有——被子上的形状是她自己的' }),
      ],
    },
    {
      scene: '阁楼 · 日记',
      text: '阁楼比你想的低。人站不直，只能弯腰。\n\n'
        + '中间有一只木箱，箱子上放着一本日记，翻开在最后一页。\n\n'
        + '字迹很工整，越到后面越乱，最后几行几乎是刻出来的：\n\n'
        + '「他不要这个孩子。他说这不是他的。我数过了，他一个月没有回家。」',
      opts: () => [
        roll('往后翻，看最后一篇', 'int', 55, { flag: 'read_diary', flag2: 'know_truth', san: -12 }, { san: -18 }),
        flat('把日记合上，带走', { flag: 'read_diary', san: -8 }),
        flat('不碰它，先找别的东西', { flag: 'ignored_diary', san: -6 }),
      ],
    },
    {
      scene: '阁楼 · 天花板上面',
      text: '日记下面是一块松动的木板。掀开之后，里面是一个很窄的空间，'
        + '刚好能躺下一个人。\n\n'
        + '里面有人。\n\n'
        + '已经很久了。她的手还保持着往上抓的姿势，指甲全部翻起来了。',
      opts: () => [
        roll('看清她的脸', 'per', 55, { flag: 'found_body', flag2: 'know_truth', san: -20 }, { san: -26, hp: -10 }),
        flat('立刻盖回去', { flag: 'found_body', san: -14 }),
        flat('找东西把这里封死', { flag: 'sealed_body', san: -10 }),
      ],
    },
    {
      scene: '门口 · 汽油',
      text: '天快亮了。你从隔壁借来一桶汽油，站在玄关。\n\n'
        + '理佳站在门外，脸色很白。她说：「里面还有人。」\n\n'
        + '「刚才我听见胜美在楼上叫。」',
      opts: () => [
        roll('先上去确认，再决定烧不烧', 'agi', 55, { flag: 'checked_upstairs', san: -12 }, { hp: -20, flag: 'burned_anyway' }),
        flat('倒汽油，点火', { flag: 'burned_house', san: -14 }, { note: '火起来得很快。你没有听见叫声' }),
        flat('把汽油放下，带所有人走', { flag: 'no_fire', san: -6 }),
      ],
    },
    {
      scene: '天亮',
      text: '天是一点点亮的。先是窗外的黑变成灰，再变成白。\n\n'
        + '你站在街上，回头看那栋房子。二楼的窗帘不动了。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('转身走', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.rika_warned || f.rika_story) hit.push('rika');
    if (f.found_body && f.read_diary) hit.push('truth');
    if (f.burned_house) hit.push('burn');
    const cleanMarks = [f.rika_warned, f.satsumi_out, !f.said_yes].filter(Boolean).length;
    if (cleanMarks >= 2) hit.push('clean');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.satsumi_left) out.push({ label: '把胜美留在那间卧室里', points: -1200 });
    if (s.flags.answered) out.push({ label: '在电话里回答了它', points: -800 });
    return out;
  },
  endings: [
    {
      when: (f) => f.burned_house && f.found_body && f.read_diary,
      title: '名字',
      text: '火烧到地基的时候，你站在街对面。\n\n'
        + '灰里有什么东西动了一下，然后安静了。这是这栋房子四十年来第一次安静。\n\n'
        + '你想起日记的最后一句话不是怨恨，是一个名字，写了整整一页。'
        + '你没有念出来。你不知道念出来会发生什么。',
    },
    {
      when: (f) => f.burned_house,
      title: '灰',
      text: '房子烧到只剩框架。消防车来了，问是谁点的火。没有人回答。\n\n'
        + '第二天你会在报纸上看到一行小字：一栋空屋失火，无人伤亡。\n\n'
        + '「无人伤亡」这四个字，你盯着看了很久。',
    },
    {
      when: (f) => f.satsumi_left,
      title: '被子',
      text: '天亮的时候，隔壁的电视还开着，综艺节目已经播完了，'
        + '只剩下一个画面在循环。\n\n'
        + '你没有回去看那间卧室。你告诉自己是因为来不及。',
    },
    {
      when: () => true,
      title: '天亮',
      text: '你活到了天亮。这是这栋房子四十年来第一次让人活到天亮。\n\n'
        + '手环上显示：奖励点 +1500。下面那行字是新的：\n\n'
        + '「标记保留。下一个世界，它偶尔会来看你。」',
    },
  ],
});

/**
 * 侏罗纪公园（C 级 · 12 回合）
 *
 * 这个副本的敌人不是「怪物」，是「地形」。恐龙不会主动来找你，
 * 除非你站在它要去的地方。所以判定失败多半是掉血和丢时间，不是死。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const JP1 = audit({
  id: 'jp1',
  title: '侏罗纪公园',
  subtitle: '努布拉岛 · 暴雨夜',
  rating: 'C',
  band: '新手',
  turns: 12,
  accent: '#3f7a5c',
  pressure: { label: '距离离岛直升机', max: 12 },
  brief: '在直升机来之前活下来。这里没有诅咒，没有鬼，只有一群被人造出来、然后没人管的动物。',
  intro:
    '你在一辆越野车的后座醒来。车停着，雨刷停了，外面的雨很大，'
    + '打在车顶上的声音像有人在撒石子。\n\n'
    + '前座没人。仪表盘上贴着一条标牌：「侏罗纪公园 · 游览车 04」。\n\n'
    + '远处有一个很大的人工围栏，围栏里的树在动。不是风吹的那种动。\n\n'
    + '手环上写着：**距离离岛直升机，12 个刻度。**',
  main: { desc: '在直升机离开前抵达停机坪', points: 1200 },
  sides: [
    { id: 'kids', desc: '把蒂姆和莱克斯两个孩子都带出去', points: 2000, plot: 'C' },
    { id: 'malcolm', desc: '让伊恩·马尔科姆活着离开', points: 1800, plot: 'C' },
    { id: 'embryo', desc: '拿到纳德利的胚胎罐', points: 1200, plot: 'D' },
    { id: 'power', desc: '弄清是谁拉下了总闸', points: 1000, plot: 'C' },
  ],
  /**
   * 马尔科姆。他说的每句话都是对的，但没有人想听——所以他跟着你，
   * 是因为你是这一路上唯一一个没有反驳他的人。
   */
  mate: {
    id: 'malcolm',
    name: '伊恩·马尔科姆',
    role: '说过这东西不该存在的人',
    joinTurn: 3,
    trust: 1,
    bond: { min: 2, attr: 'int', bonus: 10 },
    bonus: { points: 900, plot: 'C' },
    survives: (s) => !s.flags.malcolm_left,
  },
  nodes: [
    {
      scene: '游客中心 · 大堂',
      text: '大堂的屏幕上在放一段动画：一只卡通恐龙在给孩子讲 DNA，讲得很温柔。'
        + '背景音是雨声，一直没停。\n\n'
        + '一个白头发的老头站在门口，张开双臂：「欢迎来到侏罗纪公园！」'
        + '他说这话的时候，雷声刚好压过他的声音。\n\n'
        + '他叫哈蒙德。',
      opts: () => [
        roll('看墙上的园区地图', 'per', 40, { flag: 'know_map' }, { san: -2 }),
        flat('跟哈蒙德握手，问他有几个孙子', { flag: 'hammond_liked', san: 3 }, { note: '他说两个。说到第二个的时候停了一下' }),
        flat('去停车场检查越野车', { flag: 'checked_cars', item: 'flare' }),
      ],
    },
    {
      scene: '霸王龙围栏 · 暴雨',
      text: '车停在围栏外面。围栏里面没有东西，只有树，和被雨压得很低的云。\n\n'
        + '然后电全灭了。车灯灭了，围栏上的警示灯灭了，连雨刷都停在半空。\n\n'
        + '黑暗里传来一声很低的声音。不是吼，是呼吸。',
      opts: () => [
        roll('立刻下车，往警戒塔跑', 'agi', 50, { flag: 'out_of_car' }, { hp: -12 }),
        roll('锁死车门，等它过去', 'per', 55, { flag: 'rex_passed' }, { hp: -25, flag: 'car_crushed' }),
        flat('打开车灯，把它的注意力引过来', { flag: 'lured_rex', san: -8 },
          { note: '它转过头。另一辆车里还有两个孩子' }),
      ],
    },
    {
      scene: '围栏外 · 泥地',
      text: '车翻在沟里。你爬出来的时候，腿上全是泥，膝盖在抖。\n\n'
        + '二十米外，一个人靠在树上，一条腿的角度不对。是马尔科姆。'
        + '他看见你，笑了一下：「我早说过，这东西不该存在。」\n\n'
        + '笑完他就吐了。',
      opts: () => [
        roll('把他挪到树洞里', 'str', 55, { flag: 'malcolm_saved', san: -4, trust: 1 }, { hp: -14 }),
        roll('先给他止血', 'int', 50, { flag: 'malcolm_saved', use: 'medkit', trust: 1 },
          { hp: -6, san: -4 }, { use: 'medkit' }),
        flat('留下他，去找孩子', { flag: 'malcolm_left', san: -10 }),
      ],
    },
    {
      scene: '丛林 · 天快亮',
      text: '雨小了一点，但还在下。丛林里有很多声音，都是鸟叫，叫得很密。\n\n'
        + '然后所有的鸟一起停了。\n\n'
        + '前面二十米，一群东西正在跑过来。不大，两只脚，跑得比车快。',
      opts: () => [
        roll('躲到倒下的树干后面', 'agi', 55, { flag: 'herd_hid' }, { hp: -18 }),
        roll('跟着它们一起跑', 'con', 50, { flag: 'ran_with_herd', san: -6 }, { hp: -22 }),
        flat('站着不动', { flag: 'stood_still', san: -12 }, { note: '它们绕开了你。它们在躲别的东西' }),
      ],
    },
    {
      scene: '变电站',
      text: '主变电站的铁门开着，里面全是烧黑的线。总闸被人拉下来了——不是跳闸，'
        + '是有人用手一格一格拉下来的。\n\n'
        + '地上有一只鞋印，四十二码，鞋底是网格的。\n\n'
        + '控制台上贴着一张便利贴：「别让别人知道。」',
      opts: () => [
        roll('把总闸推上去', 'str', 55, { flag: 'power_on' }, { hp: -20, flag: 'shocked' }),
        roll('先弄清是谁拉的闸', 'per', 50, { flag: 'nedry_sabotage', san: -4 }, { san: -8 }),
        flat('先找备用手电，别摸黑', { item: 'flare', flag: 'got_light', san: -2 }),
      ],
    },
    {
      scene: '游客中心 · 厨房',
      text: '厨房的灯一闪一闪。不锈钢台面上摊着没做完的菜，刀插在一块肉上。\n\n'
        + '两个孩子蹲在冷库门口。姐姐用手捂着弟弟的嘴，看见你，摇头，指了一下厨房另一头。\n\n'
        + '那里有两扇门，正在一下一下地被撞。',
      opts: () => [
        roll('冲过去把两个孩子拉走', 'agi', 60, { flag: 'kids_alive', san: -5 }, { hp: -20, flag: 'kids_scared' }),
        roll('打开另一扇门，把撞门的东西引走', 'int', 55, { flag: 'raptor_lured' }, { hp: -15 }),
        flat('让姐姐带弟弟先钻通风管', { flag: 'kids_alive', flag2: 'kids_alone', san: -6 }),
      ],
    },
    {
      scene: '控制室',
      text: '控制室的电脑还亮着，屏幕上是一行提示：「系统已锁，请输入 8 位密码。」\n\n'
        + '键盘上有一个键的漆磨掉了，是 E。\n\n'
        + '角落里躺着一个人，穿花衬衫，脸朝下，一只手还伸向门的方向。',
      opts: () => [
        roll('试「NEDRY」', 'int', 50, { flag: 'system_locked' }, { san: -6 }), 
        roll('翻他口袋里的东西', 'per', 45, { flag: 'system_unlocked', item: 'embryo' }, { hp: -8 }),
        flat('不碰系统，先拿对讲机', { flag: 'radio', san: -2 }),
      ],
    },
    {
      scene: '园区 · 夜',
      text: '雨停了。你带着孩子沿着围栏走，围栏上的电已经回来了，每隔三秒响一次，很轻。\n\n'
        + '前面有个人站在路中间，手里拿着一把霰弹枪。是马尔登。\n\n'
        + '他没有回头，只说了一句：「别过来。你们后面有东西。」',
      opts: () => [
        roll('回头看', 'per', 50, { flag: 'saw_raptors', san: -10 }, { hp: -18 }),
        roll('照他说的，慢慢蹲下', 'agi', 50, { flag: 'crouched' }, { hp: -14 }),
        flat('喊「先上车」', { flag: 'ran_for_car', san: -6 }),
      ],
    },
    {
      scene: '山崖 · 断桥',
      text: '路被冲断了。下面是一条河，水很大，声音盖过一切。\n\n'
        + '河对面是园区大门，大概两百米。\n\n'
        + '两个孩子都不会游泳。蒂姆说他可以，但他一直在抖，抖得说不完整句子。',
      opts: () => [
        roll('找一根藤，拴在树上，一个个过去', 'int', 55, { flag: 'crossed_river' }, { hp: -25 }),
        roll('背着蒂姆游过去', 'con', 60, { flag: 'crossed_river', flag2: 'kids_alive' }, { hp: -30 }),
        flat('沿着河岸找别的路', { flag: 'river_detour', san: -8 }),
        flat('让马尔科姆算水的流向', { flag: 'crossed_river', hp: -8, trust: -1 },
          { ...bond(2), note: '他算得很准。绳子绷紧的那一下，他先过去了' }),
      ],
    },
    {
      scene: '丛林 · 它在那里',
      text: '它就在那里。比你在电影里看到的大得多，高得像一堵会呼吸的墙。\n\n'
        + '它低着头，在闻一辆翻倒的车。然后它抬起头，看向你们。\n\n'
        + '马尔登举起枪，又放下了。他说：「这东西打不穿。」',
      opts: () => [
        roll('点燃照明棒，往反方向扔', 'int', 55, { flag: 'rex_lured', use: 'flare' },
          { cond: (s) => s.inv.flare > 0, note: '它去追那点光了' }),
        roll('带人躲进涵洞', 'agi', 55, { flag: 'hid_culvert' }, { hp: -20 }),
        flat('站着不动，谁都别跑', { flag: 'stood_before_rex', san: -15 }),
      ],
    },
    {
      scene: '大门 · 闸机',
      text: '大门是电动的，需要控制室授权。闸机上有三根横杆，一根一根落下。\n\n'
        + '莱克斯把手放在闸机上，问：「它会不会电人？」\n\n'
        + '远处有脚步声。很多，很轻，像有人在用指甲敲地板。',
      opts: () => [
        flat('用对讲机叫控制室开门', { flag: 'gate_open' }, { cond: (s) => s.flags.radio, note: '对面是个女声，她说：你们终于来了' }),
        roll('硬掰开闸机', 'str', 60, { flag: 'gate_open' }, { hp: -18 }),
        flat('带孩子翻过围栏', { flag: 'climbed_fence', san: -5 }),
      ],
    },
    {
      scene: '停机坪',
      text: '直升机已经启动了。哈蒙德站在舱门口，白西装上全是泥，'
        + '手里还拿着那只电子恐龙。\n\n'
        + '他说：「我本来想给他们一个惊喜。」\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('登机', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.kids_alive) hit.push('kids');
    if (f.malcolm_saved) hit.push('malcolm');
    if (f.system_unlocked) hit.push('embryo');
    if (f.nedry_sabotage) hit.push('power');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.malcolm_left) out.push({ label: '把马尔科姆留在树底下', points: -800 });
    if (s.flags.kids_scared) out.push({ label: '孩子在厨房里受了伤', points: -500 });
    return out;
  },
  endings: [
    {
      when: (f) => f.kids_alive && f.malcolm_saved && f.system_unlocked,
      title: '蛋',
      text: '直升机升起来的时候，哈蒙德把那只电子恐龙塞给你：「下次我做一个不会跑的。」\n\n'
        + '胚胎罐在你怀里，罐子上有一层白霜。结算的时候，主神把这罐东西收走了——它没有给你加点数。\n\n'
        + '它只说了一句：「这个东西，下个世界还会用到。」',
    },
    {
      when: (f) => f.kids_alive,
      title: '两个孩子',
      text: '莱克斯在直升机上睡着了。蒂姆一直看着窗外，看了很久，然后说：\n\n'
        + '「它们不是怪物。它们只是被生在这里。」\n\n'
        + '没有人回答他。因为所有人都知道他说得对。',
    },
    {
      when: (f) => f.malcolm_left,
      title: '我没说错',
      text: '直升机飞过丛林的时候，你往下看了一眼。\n\n'
        + '树底下没有东西。也可能有，只是看不见。\n\n'
        + '你想起他说的最后一句话是「我早说过」，说得很轻，像在跟自己说话。',
    },
    {
      when: () => true,
      title: '离岛',
      text: '直升机往海上去。岛在身后变小，最后变成一块绿色的东西，被云盖住。\n\n'
        + '手环上显示：奖励点 +1200。下面还有一行小字：「本世界不计入恐怖片序列。」',
    },
  ],
});

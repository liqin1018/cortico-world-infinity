/**
 * 生化危机 2（C 级 · 12 回合）
 *
 * 和第一部同一个城市，但规则换了一条：第一部是「门后面有什么」，
 * 这一部是「门后面有什么在追你」。追踪者不会因为你们躲起来就走开。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const RE2 = audit({
  id: 're2',
  title: '生化危机 2',
  subtitle: '浣熊市 · 警局与下水道',
  rating: 'C',
  band: '新手',
  turns: 12,
  accent: '#a83c46',
  pressure: { label: '距离净化这座城市', max: 12 },
  brief: '在净化开始前离开城区。这里有一个找哥哥的女人、一个第一天上班的警察，和一个一直在找她的东西。',
  intro:
    '你在一间警察局的大厅里醒来。灯还亮着，但每隔几秒会暗一下，像有人在很远的地方拉总闸。\n\n'
    + '地上有一道很长的血痕，从正门一直拖到接待台后面。墙上挂着一块铜牌：「欢迎来到浣熊市警察局。」'
    + '铜牌下面有人用口红写了一行字：**别上楼。**\n\n'
    + '外面的街上在烧。你听见爆炸，一下，一下，很规律——像是有人在按顺序拆掉这座城市。\n\n'
    + '手环上写着：**距离净化，12 个刻度。**',
  main: { desc: '在净化开始前离开浣熊市', points: 1200 },
  sides: [
    { id: 'sherry', desc: '让雪莉·柏金活着离开', points: 2000, plot: 'C' },
    { id: 'leon', desc: '让里昂信任你并活到最后', points: 1800, plot: 'C' },
    { id: 'sample', desc: '带出 G 病毒样本或完整实验数据', points: 1500, plot: 'C' },
    { id: 'truth', desc: '弄清柏金到底在做什么', points: 1000, plot: 'D' },
  ],
  /**
   * 克莱尔。她不是来救人的，她是来找哥哥的——这一点让她的信任很便宜：
   * 你只要不拦她，她就跟着你。但她会为了一个孩子跟你翻脸。
   */
  mate: {
    id: 'claire',
    name: '克莱尔·雷德菲尔德',
    role: '进来找哥哥的人',
    joinTurn: 2,
    trust: 2,
    bond: { min: 2, attr: 'agi', bonus: 10 },
    bonus: { points: 900, plot: 'C' },
    survives: (s) => !s.flags.sherry_left,
  },
  nodes: [
    {
      scene: '警局 · 大厅',
      text: '接待台的抽屉是半开的。里面有两盒子弹、一支急救针，还有一本值班表，'
        + '最后一页写着「9 月 24 日，全员加班」，后面全是空白的。\n\n'
        + '通往二楼的楼梯上有一道拖痕，是从上面拖下来的。',
      opts: () => [
        flat('搜接待台的抽屉', { item: 'medkit', flag: 'got_kit' }, { note: '子弹没用，急救针有用' }),
        roll('顺着拖痕看看它被拖到哪', 'per', 40, { flag: 'blood_trail', san: -3 }, { san: -6 }),
        flat('直接上楼', { flag: 'upstairs', san: -2 }),
      ],
    },
    {
      scene: '警局 · 二楼走廊',
      text: '走廊尽头站着一个人影。你举起手的时候，对方也举起来了。\n\n'
        + '「别动。」是个女声，「……你不是它们。」\n\n'
        + '她放下枪走过来。她叫克莱尔，说她是进来找她哥哥的，'
        + '「他叫克里斯，是这儿的 STARS。你见过他吗？」',
      opts: () => [
        flat('说自己也刚醒，什么都不知道', { flag: 'claire_met', san: 2 }, { note: '她信了，因为她也没有别的选择' }),
        roll('反问她有没有见过一个小女孩', 'per', 45, { flag: 'claire_met', flag2: 'know_sherry' }, { san: -5 }),
        flat('不回答，先看清她身上有什么', { flag: 'claire_wary', san: -2 }, { note: '她有榴弹枪。你在想值不值得抢' }),
      ],
    },
    {
      scene: '警局 · 档案室',
      text: '档案室的防火门半开着。里面有一台还亮着的电脑，屏幕上是一个叫「G」的文件夹，'
        + '最后修改时间是今天凌晨三点。\n\n'
        + '桌子底下有声音。很小，像有人在捂着嘴哭，又像有人在数数。',
      opts: () => [
        roll('蹲下去看桌子底下', 'per', 45, { flag: 'sherry_found', san: -2 }, { hp: -8, san: -4 }),
        roll('先解开电脑的密码', 'int', 55, { flag: 'know_g', flag2: 'got_data' }, { san: -6 }),
        flat('喊一声「谁在那里」', { flag: 'sherry_found', san: -4 }, { note: '哭声停了。然后有人很小声地说：妈妈？' }),
      ],
    },
    {
      scene: '警局 · 一楼',
      text: '正门被撞开了。不是撞开——门框整个向外翻，像有什么东西从里面走出去。\n\n'
        + '一个很高的影子站在门口，穿黑色皮衣，脸上没有五官，只有一排钉进骨头里的金属。\n\n'
        + '它没有看你。它在看克莱尔。',
      opts: () => [
        roll('拉着克莱尔往侧门跑', 'agi', 55, { flag: 'nemesis_seen', san: -6 }, { hp: -18, flag: 'nemesis_seen' }),
        roll('朝它开火，掩护其他人', 'str', 60, { flag: 'nemesis_hurt', kill: '追踪者（第一次）' }, { hp: -28 }),
        flat('躲进接待台后面，等它走过去', { flag: 'nemesis_passed', san: -10 }),
      ],
    },
    {
      scene: '地下停车场',
      text: '停车场很空，只有一辆警车还亮着顶灯。车边站着一个人，穿警服，右手一直按着左肩。\n\n'
        + '他看见你们，先松了口气，然后立刻又紧张起来：「你们后面有没有东西跟着？」\n\n'
        + '他叫里昂。他说这是他第一天上班。',
      opts: () => [
        flat('帮他处理伤口', { use: 'medkit', flag: 'leon_trust', san: 3 },
          { cond: (s) => s.inv.medkit > 0, note: '子弹擦伤，不深。他说了三次谢谢' }),
        roll('先问他是怎么活下来的', 'int', 45, { flag: 'leon_trust', flag2: 'know_route' }, { san: -3 }),
        flat('让他自己处理，先找车钥匙', { flag: 'leon_cold', san: -2 }),
      ],
    },
    {
      scene: '下水道 · 入口',
      text: '井盖是开的。往下看，水在流，是黑的，声音很大，盖住了别的声音。\n\n'
        + '克莱尔抱着那个孩子——她叫雪莉，找到的时候躲在一间教室里。雪莉一直在咳。'
        + '她说：「妈妈说，咳的时候要数到十。」她数到七就停了。',
      opts: () => [
        roll('先下去探路', 'agi', 50, { flag: 'sewer_scouted' }, { hp: -14 }),
        roll('检查雪莉的伤口', 'int', 55, { flag: 'sherry_infected', san: -8 }, { hp: -5, san: -4 }),
        flat('让克莱尔先带她走，自己断后', { flag: 'rear_guard', san: -5 }),
      ],
    },
    {
      scene: '下水道 · 深处',
      text: '水到膝盖。每隔十几步有一盏灯，亮着的不到一半。\n\n'
        + '前面的水里浮着一样东西，白的，圆的。是个人头。它还在动，'
        + '慢慢地转过来，朝着你的方向。',
      opts: () => [
        roll('贴近墙，绕过去', 'agi', 50, { flag: 'sewer_passed' }, { hp: -16 }),
        roll('开枪，把它打成不能动', 'str', 45, { kill: '下水道行尸', point: 1, flag: 'shot_zombie' }, { hp: -12 }),
        flat('退回入口，走另一条路', { flag: 'sewer_detour', san: -5 }, { note: '多花时间，但水里的东西不认识你' }),
      ],
    },
    {
      scene: '处理厂 · 铁架桥',
      text: '桥很窄，只够一个人过。桥对面有个女人，穿红裙子，一条腿挂在栏杆外面。\n\n'
        + '她看见你，第一句话是：「别过来。这底下有东西。」\n\n'
        + '她的另一只手抓着一个金属箱，抓得很紧。',
      opts: () => [
        roll('爬过去拉她', 'str', 60, { flag: 'ada_saved', item: 'sample', san: -6 }, { hp: -22 }),
        roll('先问她箱子里是什么', 'int', 55, { flag: 'ada_deal', item: 'sample' }, { san: -8 }),
        flat('绕开她，直接去实验室', { flag: 'ada_left', san: -10 }, { note: '她没有喊你。她只是看着你走' }),
      ],
    },
    {
      scene: '实验室 · 监控',
      text: '监控还开着。屏幕上是威廉·柏金，他在对着镜头说话，说到一半开始咳，'
        + '咳完了继续，像什么都没有发生。\n\n'
        + '「G 不是病毒。」他说，「G 是下一步。你们会明白的。」\n\n'
        + '他身后有一个很大的东西在动，一直没进画面。',
      opts: () => [
        roll('拷贝全部实验记录', 'int', 60, { flag: 'know_g', flag2: 'got_data' }, { san: -10, hp: -8 }),
        flat('拿走冷藏柜里的样本', { item: 'sample', flag: 'sample_taken', san: -6 }),
        flat('关掉监控', { san: -4 }, { note: '画面黑掉之前，那个东西把手放在了柏金的肩上' }),
      ],
    },
    {
      scene: '缆车站',
      text: '缆车停在轨道上，门开着。里面三排座位，够所有人坐。\n\n'
        + '雪莉躺在最后一排，脸很红。克莱尔说：「她烧到三十九度。我们不能带她上车——'
        + '如果她在车上变了，这一车人都完了。」\n\n'
        + '里昂没说话，他在看别的地方。',
      opts: () => [
        flat('用解药救她', { use: 'antidote', flag: 'sherry_cured' },
          { cond: (s) => s.inv.antidote > 0, note: '她的烧退了。克莱尔一句话都说不出来' }),
        roll('说服克莱尔先带上她', 'int', 60, { flag: 'sherry_kept' }, { san: -6 }),
        flat('同意把她留下', { flag: 'sherry_left', san: -14 }),
        flat('让克莱尔抱着雪莉先上车', { flag: 'sherry_kept', trust: -1 },
          { ...bond(2), note: '她一句话没说，抱起孩子就上去了' }),
      ],
    },
    {
      scene: '缆车 · 上升',
      text: '缆车往上走，铁索一直在响。\n\n'
        + '走到一半的时候，车顶落下来一个东西，很重，整个车厢往下沉了一截。雪莉开始尖叫。\n\n'
        + '克莱尔把雪莉抱在怀里，抬头看天花板。',
      opts: () => [
        roll('开顶盖，上去打', 'str', 65, { flag: 'nemesis_killed', kill: '追踪者', point: 500 }, { hp: -35 }),
        roll('手动刹车，把它甩下去', 'int', 55, { flag: 'nemesis_dropped' }, { hp: -20 }),
        flat('用身体挡住她们', { hp: -25, flag: 'shielded', san: -5 }),
      ],
    },
    {
      scene: '地面 · 雨',
      text: '缆车到顶的时候，天在下雨。远处的城市还在烧，但火已经小了——不是灭了，是烧完了。\n\n'
        + '你听见直升机的声音，从北边过来，很低。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('走上直升机', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.sherry_cured || (f.sherry_kept && !f.sherry_left)) hit.push('sherry');
    if (f.leon_trust) hit.push('leon');
    if (f.sample_taken || f.got_data || f.ada_deal || f.ada_saved) hit.push('sample');
    if (f.know_g) hit.push('truth');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.sherry_left) out.push({ label: '把雪莉留在站台上', points: -1200 });
    if (s.flags.ada_left) out.push({ label: '把一个还活着的人留在桥对面', points: -600 });
    return out;
  },
  endings: [
    {
      when: (f) => f.sherry_cured && f.leon_trust && (f.sample_taken || f.got_data),
      title: '三个人和一管样本',
      text: '雪莉在飞机上睡着了。里昂把警徽摘下来，看了很久，然后放进胸前的口袋。\n\n'
        + '样本还在你怀里，是凉的。主神把结算界面停得比平时久一点，然后说：'
        + '「你把这座城市里最值钱的三样东西都带出来了。可惜这里已经没有城市了。」',
    },
    {
      when: (f) => f.sherry_cured,
      title: '三十九度',
      text: '上飞机之前，雪莉拉着你的衣角问你：「我妈妈呢？」\n\n'
        + '克莱尔替你回答了。她说的版本是你编的那个。\n\n'
        + '在主神的记录里，这个孩子本来应该在第十个刻度就变成别的东西。',
    },
    {
      when: (f) => f.sherry_left,
      title: '留在下面',
      text: '缆车升上去的时候，你往下看了一眼。站台的灯还亮着，一个人影站在灯下面，很小。\n\n'
        + '她没有哭，也没有追。她只是一直抬着头，看着你们走。',
    },
    {
      when: () => true,
      title: '雨',
      text: '直升机升起来的时候，整座城市在下面烧。\n\n'
        + '你活下来了。手环上显示：奖励点 +1200。它没有提任何人的名字，它从来不提。',
    },
  ],
});

/**
 * 异形 2（B 级 · 14 回合）
 *
 * 第一个「打不完」的副本。敌人数量随回合增长，弹药是有限的，
 * 所以最优解永远是「少打、快走、别开门」。这跟新手区的思路正好相反。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const A2 = audit({
  id: 'a2',
  title: '异形 2',
  subtitle: '哈德利的希望 · LV-426',
  rating: 'B',
  band: '进阶',
  turns: 14,
  accent: '#4c6b8a',
  pressure: { label: '距离反应堆过载', max: 14 },
  brief: '把活人带出去，然后炸掉这里。敌人会随回合变多，弹药不会。',
  intro:
    '你在一艘飞船的休眠舱里醒来。舱盖自己弹开，冷气往外涌，'
    + '在你脸上结了一层白霜。\n\n'
    + '一个穿背心的女人站在门口，短发，脸上有一道旧疤。'
    + '她看了你两秒，说：「你不在名单上。不过现在也不重要了。」\n\n'
    + '她叫雷普利。船正在接近一颗行星，那里有一座殖民地，'
    + '十二小时前失去了联络。\n\n'
    + '手环上写着：**距离反应堆过载，14 个刻度。**',
  main: { desc: '在反应堆过载前带至少一名活人撤离', points: 1500 },
  sides: [
    { id: 'newt', desc: '把纽特活着带出去', points: 3000, plot: 'B' },
    { id: 'queen', desc: '让皇后留在这颗行星上', points: 2500, plot: 'B' },
    { id: 'hicks', desc: '让希克斯下士活着撤离', points: 2000, plot: 'C' },
    { id: 'burke', desc: '弄清伯克到底想要什么', points: 1500, plot: 'C' },
  ],
  /**
   * 希克斯。他不问你是谁，只问你还有几发子弹。
   * 这个世界里信任很便宜——因为没时间慢慢建立，能并肩打完一梭子就算。
   */
  mate: {
    id: 'hicks',
    name: '希克斯下士',
    role: '陆战队里唯一还在数弹药的人',
    joinTurn: 2,
    trust: 2,
    bond: { min: 2, attr: 'str', bonus: 10 },
    bonus: { points: 1000, plot: 'C' },
    survives: (s) => !s.flags.fled_ambush,
  },
  nodes: [
    {
      scene: '苏拉科号 · 休眠舱',
      text: '雷普利在检查装备，一件一件，检查得很慢。她说这是规矩，'
        + '「上一次我们没检查，回来的人少了十个。」\n\n'
        + '一个穿西装的男人从后面走过来，笑着伸出手：「卡特·伯克，公司代表。'
        + '我们很需要你这样的……志愿者。」',
      opts: () => [
        flat('问殖民地到底出了什么事', { flag: 'know_colony', san: -3 }),
        roll('看休眠舱的记录', 'int', 45, { flag: 'know_signal' }, { san: -5 }),
        flat('先找武器柜', { item: 'medkit', flag: 'armed' }),
      ],
    },
    {
      scene: '殖民地 · 气闸',
      text: '气闸是开的。里面很黑，走廊上的灯只亮一半。\n\n'
        + '地上有一层薄薄的、黏的东西，踩上去会有声音。\n\n'
        + '陆战队员一个接一个进去，枪口压得很低。希克斯做了个手势：安静。',
      opts: () => [
        roll('贴着墙，跟着队伍往里走', 'agi', 50, { flag: 'in_colony' }, { hp: -8 }),
        roll('蹲下检查地上的黏液', 'int', 50, { flag: 'know_hive', san: -8 }, { san: -10 }),
        flat('留在气闸口，守住退路', { flag: 'held_airlock', san: -4 }),
      ],
    },
    {
      scene: '医疗实验室',
      text: '墙上写着一行字，很大，用记号笔写的：「我们试过了。别开门。」\n\n'
        + '门是开的。里面有一排培养舱，每一个里面都有东西，每一个都已经破了，'
        + '玻璃是向外碎的。',
      opts: () => [
        roll('看培养舱的记录', 'int', 55, { flag: 'know_lifecycle', san: -10 }, { san: -14 }),
        roll('翻幸存者名单', 'per', 50, { flag: 'found_list', flag2: 'know_newt' }, { san: -6 }),
        flat('退出去，把门关上', { flag: 'closed_lab', san: -4 }),
      ],
    },
    {
      scene: '通风管 · 一个孩子',
      text: '管道里有一个很小的声音，不是风。\n\n'
        + '你把手电照过去，看见一双眼睛。一个孩子，大概六岁，抱着一只烧焦的玩具。\n\n'
        + '她不说话。她把手指放在嘴上。',
      opts: () => [
        flat('也把手指放在嘴上，蹲下来', { flag: 'newt_trust', san: 5 }),
        roll('伸手拉她出来', 'per', 45, { flag: 'newt_trust', flag2: 'newt_out' }, { hp: -6, san: -4 }),
        flat('先退出去叫雷普利', { flag: 'newt_wait', san: -3 }),
      ],
    },
    {
      scene: '巢 · 反应堆下层',
      text: '反应堆下面的温度很高。墙上全是那种黏的东西，一层一层，'
        + '像有人把整栋楼包了起来。\n\n'
        + '人贴在墙上。几十个，都还活着，都在看着你。没有人喊，也没有人求你。\n\n'
        + '他们的眼睛都在动。',
      opts: () => [
        roll('绕过去，不惊动它们', 'agi', 65, { flag: 'sneak_hive' }, { hp: -18 }),
        roll('开枪，把它们都放了', 'str', 60, { kill: '抱脸体', point: 300, flag: 'hive_attacked' }, { hp: -30 }),
        flat('记住这里的位置，先撤', { flag: 'marked_hive', san: -6 }),
      ],
    },
    {
      scene: '走廊 · 伏击',
      text: '灯灭了。然后天花板上落下来十几个东西。\n\n'
        + '陆战队员在喊，喊的是名字，一个接一个，喊到一半就断了。\n\n'
        + '希克斯在无线电里吼：「所有人，撤回装甲车！」',
      opts: () => [
        roll('掩护陆战队撤退', 'str', 60, { flag: 'saved_marines', san: -10 }, { hp: -32 }),
        roll('去找那个孩子', 'agi', 60, { flag: 'newt_rescued', san: -6 }, { hp: -22 }),
        flat('自己先撤', { flag: 'fled_ambush', san: -16 }),
        flat('让希克斯带人从侧廊撤，你压住正面', { flag: 'saved_marines', hp: -10, trust: -1 },
          { ...bond(2), note: '他犹豫了半秒，然后开始喊名字' }),
      ],
    },
    {
      scene: '装甲车 · 无线电',
      text: '车里只剩下几个人。无线电里有另一个声音，很客气，是个男人。\n\n'
        + '「我是伯克。」他说，「我要你们带回一样活的东西。活的，明白吗？死了就不值钱了。」\n\n'
        + '雷普利听完，把枪放在膝盖上，看着你。',
      opts: () => [
        flat('答应伯克', { flag: 'burke_deal', item: 'sample', san: -8 }),
        flat('当着所有人拒绝他', { flag: 'refused_burke', san: 2 }),
        roll('问他「你要那个东西干什么」', 'int', 50, { flag: 'burke_truth', san: -6 }, { san: -8 }),
      ],
    },
    {
      scene: '处理站 · 计划',
      text: '雷普利在地上画了一张图。她说：「大气处理站的冷却系统可以过载。'
        + '过载之后，这一整片地方会被烧干净。」\n\n'
        + '「四个小时。」她说，「我们只有四个小时。」\n\n'
        + '主教说：「我可以留在这里，远程操作。」',
      opts: () => [
        roll('让主教留下，别人撤', 'int', 55, { flag: 'bishop_stays', san: -8 }, { san: -12 }),
        flat('说不行，一起走', { flag: 'bishop_saved', san: 4 }),
        flat('问还有没有别的办法', { flag: 'alt_plan', san: -3 }),
      ],
    },
    {
      scene: '巢 · 最深处',
      text: '巢的深处有一层膜。膜后面是一个很大的东西，头比人高，'
        + '腹部下面挂着一排东西，在慢慢地动。\n\n'
        + '它在看着你。它没有动。\n\n'
        + '雷普利在你身后说：「别动。它在数我们有几个。」',
      opts: () => [
        roll('点火烧掉产房', 'int', 60, { flag: 'hive_burned', san: -10 }, { hp: -25 }),
        roll('直接开枪打它', 'str', 70, { flag: 'queen_wounded', kill: '皇后（受伤）' }, { hp: -38 }),
        flat('慢慢退出去', { flag: 'queen_seen', san: -14 }),
      ],
    },
    {
      scene: '纽特的藏身处',
      text: '你找到她的时候，她正在把通风口的格子一格一格关上。'
        + '她说：「它们不会开门。它们只会撞。」\n\n'
        + '她给你看她的画。画上有很多人，都被涂掉了，只剩下两个。',
      opts: () => [
        flat('告诉她你会带她走', { flag: 'newt_promise', san: 4 }),
        roll('问她画上的人去哪了', 'per', 45, { flag: 'newt_story', san: -8 }, { san: -10 }),
        flat('什么都不说，把她抱起来', { flag: 'newt_carried', san: 2 }),
      ],
    },
    {
      scene: '撤离通道 · 烟',
      text: '通道里全是烟。你抱着纽特，希克斯在前面开路，雷普利在后面。\n\n'
        + '前面的门被堵住了。堵住门的是一个人，还穿着陆战队的衣服，'
        + '但已经不完全是人了。它看见你，慢慢地站直了。',
      opts: () => [
        roll('开枪', 'str', 60, { kill: '被感染的陆战队员', point: 300, flag: 'corpse_down' }, { hp: -24 }),
        roll('从旁边的检修口钻过去', 'agi', 55, { flag: 'vent_escape' }, { hp: -16 }),
        flat('让希克斯处理，自己护着纽特', { flag: 'hicks_covers', san: -8 }),
      ],
    },
    {
      scene: '陆战车 · 倒计时',
      text: '车在跑，倒计时在响。纽特睡着了，手还抓着你的袖子。\n\n'
        + '希克斯在数弹药，数完说：「七发。」\n\n'
        + '雷普利说：「还有一件事。皇后会跟上来。它不会让我们走。」',
      opts: () => [
        roll('去气闸做准备，把它关在外层', 'int', 55, { flag: 'airlock_ready' }, { hp: -14 }),
        flat('把最后的弹药都留给雷普利', { flag: 'gave_ammo', san: -5 }),
        roll('检查纽特身上的伤', 'per', 50, { flag: 'newt_checked', san: -8 }, { san: -6 }),
      ],
    },
    {
      scene: '气闸 · 皇后',
      text: '它跟进来了。尾巴穿过舱门，把门顶开，金属发出很长的声音。\n\n'
        + '雷普利在喊：「开气闸！」\n\n'
        + '纽特在你怀里，抓着你的衣服，一声不出。',
      opts: () => [
        roll('把纽特塞进逃生舱，回身开气闸', 'con', 60, { flag: 'queen_ejected', kill: '皇后', point: 500, san: -10 }, { hp: -40 }),
        roll('抱着纽特一起跳进逃生舱', 'agi', 60, { flag: 'newt_saved_alert', san: -8 }, { hp: -28 }),
        flat('让雷普利处理，你护住孩子', { flag: 'ripley_finishes', san: -6 }),
      ],
    },
    {
      scene: '逃生舱 · 静',
      text: '舱里很安静。外面是黑的，慢慢能看到一颗行星的边缘，'
        + '上面有一点很小很小的火。\n\n'
        + '纽特醒了，问：「我们可以回家了吗？」\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('说可以', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.newt_trust && (f.newt_rescued || f.newt_carried || f.newt_saved_alert || f.newt_out)) hit.push('newt');
    if (f.queen_ejected || f.hive_burned) hit.push('queen');
    if (f.saved_marines || f.vent_escape) hit.push('hicks');
    // 三条路只能选一条（答应他 / 拒绝 / 逼他说真话），所以这里只能看 burke_truth。
    // 原来写的是「拒绝 + 问出真相」，那两个在不同选项里，永远凑不齐——随机 flag 测试能过，
    // 真人玩的时候一次都拿不到。
    if (f.burke_truth) hit.push('burke');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.fled_ambush) out.push({ label: '把陆战队留在走廊里', points: -1000 });
    if (s.flags.burke_deal) out.push({ label: '替伯克带回了「样本」', points: -800 });
    return out;
  },
  endings: [
    {
      when: (f) => f.newt_trust && f.queen_ejected && f.vent_escape,
      title: '一个都不少',
      text: '逃生舱里四个人：你、雷普利、希克斯、纽特。\n\n'
        + '主教不在。主教本来就上不了这艘船，他自己也知道。\n\n'
        + '雷普利说：「这比上次好。」然后她补了一句：「上次是一个人。」',
    },
    {
      when: (f) => f.newt_trust && (f.newt_rescued || f.newt_carried || f.newt_saved_alert),
      title: '妈妈',
      text: '纽特睡着了。雷普利在她旁边坐了一整夜，没有合眼，也没有说话。\n\n'
        + '你听见纽特在梦里说了一个词，声音很小，听不清是「妈妈」还是别的什么。\n\n'
        + '雷普利听见了。她把手放在孩子的头上，很轻。',
    },
    {
      when: (f) => f.hive_burned && !f.queen_ejected,
      title: '你烧掉了它的产房',
      text: '整片殖民地在烧。你从轨道上往下看，火在云底下，像一块慢慢退掉的淤青。\n\n'
        + '结算时，主神在界面上停了很久，然后给了你一行字：\n\n'
        + '「你烧掉了它的产房。它会记得你。」',
    },
    {
      when: () => true,
      title: '只剩活人',
      text: '逃生舱漂在轨道上，等着被回收。\n\n'
        + '你活下来了。手环上显示：奖励点 +1500。它没有说有多少人没上来。',
    },
  ],
});

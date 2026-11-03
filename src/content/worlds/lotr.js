/**
 * 魔戒（A 级 · 16 回合）
 *
 * 最长的一个副本，也是唯一一个「主线成功但全员不快乐」的副本。
 * 腐蚀不是一条血条，是一连串「你本可以做得更好」的选项堆出来的东西。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const LOTR = audit({
  id: 'lotr',
  title: '魔戒',
  subtitle: '中土 · 第三纪元末',
  rating: 'A',
  band: '高难',
  turns: 16,
  accent: '#8a7a3c',
  pressure: { label: '距离魔戒被找到', max: 16 },
  brief: '把戒指送到末日火山。路上每一次「我拿着它更安全」，都会让你更接近另一个人。',
  intro:
    '你在瑞文戴尔的一间房间里醒来。窗外是瀑布，水声很大，'
    + '但你还是能听见楼下在吵架。\n\n'
    + '桌上放着一枚戒指，金的，很素，没有花纹。\n\n'
    + '你看着它的时候，它看起来比刚才更亮了一点。\n\n'
    + '手环上写着：**距离魔戒被找到，16 个刻度。**'
    + '\n\n下面还有一行更小的字：**别戴。**',
  main: { desc: '把魔戒送进末日火山', points: 3000 },
  sides: [
    { id: 'ring', desc: '让魔戒被真正销毁', points: 6500, plot: 'A' },
    { id: 'frodo', desc: '让佛罗多活着走出末日火山', points: 5500, plot: 'A' },
    { id: 'boromir', desc: '让波罗莫活到圣盔谷', points: 4000, plot: 'B' },
    { id: 'gandalf', desc: '让甘道夫不掉下卡萨德姆桥', points: 3000, plot: 'B' },
  ],
  /**
   * 金雳。选他而不是山姆，是因为山姆在剧情里已经有自己的位置了——
   * 金雳是那种「你不问他也会跟着」的人，信任从 2 起步，掉得慢。
   */
  mate: {
    id: 'gimli',
    name: '金雳',
    role: '葛罗音之子',
    joinTurn: 2,
    trust: 2,
    bond: { min: 2, attr: 'str', bonus: 10 },
    bonus: { points: 1200, plot: 'B' },
    survives: () => true,
  },
  nodes: [
    {
      scene: '瑞文戴尔 · 会议',
      text: '长桌边坐着九个人，谁也不看谁。\n\n'
        + '一个灰袍的老人站起来，把戒指放在桌子中间。桌子安静了。\n\n'
        + '「必须有人把它送回去。」他说，「送进末日火山，唯一能销毁它的地方。」\n\n'
        + '波罗莫站起来，手按在剑上：「我们可以用它。用它对付敌人。」',
      opts: () => [
        roll('第一个站起来说「我去」', 'con', 50, { flag: 'joined', san: -4 }, { san: -8, flag: 'joined' }),
        flat('看向佛罗多，等他先开口', { flag: 'joined', flag2: 'frodo_trust', san: -2 }),
        flat('提醒所有人「用它就等于换一个主人」', { flag: 'warned_council', flag2: 'boromir_wary', san: -3 }),
      ],
    },
    {
      scene: '卡兰拉斯山 · 雪',
      text: '雪到腰。风把人往崖下推。\n\n'
        + '甘道夫站在雪里，抬头看山顶，看了很久。他说：「过不去。山不想让我们过。」\n\n'
        + '佛罗多在你身后，嘴唇冻紫了，一直没说话。',
      opts: () => [
        roll('背佛罗多走一段', 'str', 60, { flag: 'carried_frodo', san: 3 }, { hp: -20 }),
        roll('提议走摩瑞亚', 'int', 55, { flag: 'moria_choice', san: -6 }, { san: -10 }),
        flat('什么都不说，先找个避风的地方', { flag: 'took_shelter', hp: 10, san: -4 }),
      ],
    },
    {
      scene: '摩瑞亚 · 西门',
      text: '门是石头做的，上面刻着树、星星、锤子和王冠，中间是一行字，'
        + '不是通用语。\n\n'
        + '甘道夫试了十几个咒语，门一动都不动。他坐在地上抽烟斗，'
        + '说：「太急了。我总是太急。」\n\n'
        + '门上的字写着：**朋友，说出那个词，门就开了。**',
      opts: () => [
        roll('说出「朋友」', 'int', 45, { flag: 'door_open' }, { san: -4 }),
        roll('让佛罗多试试', 'per', 50, { flag: 'door_open', flag2: 'frodo_trust' }, { san: -6 }),
        flat('用蛮力推', 'str', 75, { flag: 'door_open', san: -6 }, { hp: -18, flag: 'nearly_stuck' }),
      ],
    },
    {
      scene: '摩瑞亚 · 巴林墓',
      text: '墓室里很暗，光只能照到三米。\n\n'
        + '石棺上刻着「巴林，摩瑞亚之王」。棺盖是开的，里面是空的。\n\n'
        + '墙上有斩痕，很多，一直延伸到天花板。\n\n'
        + '皮平碰了一下井口的一块石头。石头掉下去了。\n\n'
        + '它落到底的声音，很久才传上来。',
      opts: () => [
        roll('立刻熄灭火把', 'agi', 50, { flag: 'lights_out' }, { hp: -12 }),
        roll('守门口，让其他人先走', 'str', 55, { flag: 'held_door', san: -6 }, { hp: -22 }),
        flat('问甘道夫「这是什么地方」', { flag: 'know_moria', san: -8 }, { note: '他说：这是他们挖得太深的地方' }),
      ],
    },
    {
      scene: '卡萨德姆桥',
      text: '桥很窄，只够一个人过。桥下是黑的，看不见底。\n\n'
        + '一个东西从火里走出来。比人高，头上有角，手里是一把火做的剑。\n\n'
        + '甘道夫站到桥中间，把法杖往地上一顿。\n\n'
        + '「你不能过去。」他说。',
      opts: () => [
        roll('冲上去拉甘道夫回来', 'str', 70, { flag: 'gandalf_saved', hp: -30, san: -10 }, { hp: -35, flag: 'gandalf_fell' }),
        roll('喊所有人先过桥', 'int', 55, { flag: 'crossed_bridge', san: -8 }, { hp: -18, flag: 'gandalf_fell' }),
        flat('站着不动，看他把那句话说完', { flag: 'gandalf_fell', san: -14 }, { note: '他说完了。桥断了。他没有回头' }),
      ],
    },
    {
      scene: '罗瑞恩 · 镜',
      text: '树上的城市，晚上会发光。\n\n'
        + '加拉德瑞尔给你一面水镜。她说：「看。看完之后别说出来，除非你确定要说。」\n\n'
        + '水面上出现的是夏尔，被烧过。然后是佛罗多，站在一个黑洞边上，'
        + '手里没有戒指。',
      opts: () => [
        roll('看清佛罗多的最后一眼', 'per', 60, { flag: 'saw_vision', san: -12 }, { san: -18 }),
        flat('把视线移开', { flag: 'refused_vision', san: -6 }),
        flat('问加拉德瑞尔「他会活下来吗」', { flag: 'asked_galadriel', san: -8 },
          { note: '她说：我不知道。我只知道如果不送，他连活的机会都没有' }),
      ],
    },
    {
      scene: '安都因大河',
      text: '船靠岸了。佛罗多坐在岸边，手里捏着戒指，捏得很紧。\n\n'
        + '波罗莫走过来。他说：「你为什么不把它给我？就一次。我只要一次。」\n\n'
        + '他的声音在抖。',
      opts: () => [
        roll('把波罗莫按倒，让他清醒过来', 'str', 60, { flag: 'boromir_saved', san: -6 }, { hp: -16, flag: 'boromir_hostile' }),
        roll('用话把他劝回来', 'int', 65, { flag: 'boromir_saved', flag2: 'boromir_friend', san: -8 }, { san: -14 }),
        flat('挡在佛罗多前面，什么都不说', { flag: 'boromir_saved', flag2: 'boromir_shamed', san: -10 }),
      ],
    },
    {
      scene: '阿蒙汉 · 强兽人',
      text: '强兽人来得比想象中快。它们不抢东西，它们只抢人。\n\n'
        + '梅里和皮平被拖走了。波罗莫一个人挡在前面，'
        + '身上已经中了两支箭，还在挥剑。\n\n'
        + '佛罗多在小山上，手里拿着戒指。',
      opts: () => [
        roll('去救波罗莫', 'str', 65, { flag: 'boromir_lived', san: -10 }, { hp: -35, flag: 'boromir_died' }),
        roll('去追梅里和皮平', 'agi', 60, { flag: 'chased_orcs', san: -12 }, { hp: -24 }),
        flat('去追佛罗多', { flag: 'followed_frodo', san: -14 }),
      ],
    },
    {
      scene: '范贡森林',
      text: '森林里的树太高了，看不到顶。\n\n'
        + '一个老人从树影里走出来，穿白袍，白得发亮。阿拉贡先举起了剑，'
        + '然后跪了下去。\n\n'
        + '「甘道夫？」\n\n'
        + '「甘道夫。」他说，「不过已经不是原来那个了。」',
      opts: () => [
        roll('先问他「你还是不是我们的朋友」', 'per', 50, { flag: 'gandalf_white', san: 5 }, { san: -8 }),
        flat('直接问他接下来怎么办', { flag: 'gandalf_white', flag2: 'know_plan', san: -2 }),
        flat('看一眼他的手——那只手没有烧伤', { flag: 'noticed_hand', san: -6 }),
      ],
    },
    {
      scene: '伊多拉斯 · 希优顿',
      text: '国王坐在王座上，老得像一具还没埋的尸体。\n\n'
        + '他身边站着一个穿黑袍的人，一直在低声说话。甘道夫走过去，'
        + '把手里的杖往地上一顿。\n\n'
        + '国王突然坐直了。他看见外面的太阳，像个很久没见过光的人。',
      opts: () => [
        roll('把那个黑袍人按住', 'str', 55, { flag: 'grima_caught', san: -4 }, { hp: -10, flag: 'grima_fled' }),
        roll('先扶国王起来', 'con', 50, { flag: 'theoden_trust', san: 3 }, { san: -6 }),
        flat('什么都不做，看甘道夫处理', { flag: 'watched_exorcism', san: -5 }),
      ],
    },
    {
      scene: '圣盔谷 · 号角堡',
      text: '雨很大。城墙外面全是火把，一排一排，看不到头。\n\n'
        + '希优顿说：「天亮之前，这里不会有活人。」\n\n'
        + '阿拉贡站在城墙上，把剑插进石头缝里，说：「那就守到天亮。」',
      opts: () => [
        roll('守城门', 'str', 60, { flag: 'held_gate', san: -8 }, { hp: -32 }),
        roll('带人去堵下水道的缺口', 'int', 55, { flag: 'plugged_sewer', san: -8 }, { hp: -24 }),
        flat('留在国王身边，守住内殿', { flag: 'guarded_keep', san: -6 }),
      ],
    },
    {
      scene: '圣盔谷 · 黎明',
      text: '天亮了。号角从山坡上响起来，不是一声，是几千声。\n\n'
        + '甘道夫站在山坡上，白袍被风吹起来，身后是一整支骑兵。\n\n'
        + '他喊了一个词。你听不懂，但城墙上所有人都开始欢呼。',
      opts: () => [
        roll('带人冲出去接应', 'str', 60, { flag: 'charged_out', san: -6 }, { hp: -22 }),
        flat('先去看波罗莫（如果他还在）', { flag: 'checked_boromir', san: -4 }),
        flat('回头数还剩多少人', { flag: 'counted_survivors', san: -10 }),
        flat('让金雳去堵城门', { flag: 'gate_held', hp: -10, trust: -1 },
          { ...bond(2), note: '他骂了一句矮人语，然后去了' }),
      ],
    },
    {
      scene: '帕兰诺平原',
      text: '平原上全是人。不是军队，是人——从南边来的、从东边来的，'
        + '有盔甲的没几个。\n\n'
        + '一个穿黑甲的女骑士从你旁边冲过去，头盔下面露出一截金发。\n\n'
        + '远处的城门在烧。',
      opts: () => [
        roll('跟着骑兵冲阵', 'str', 65, { flag: 'rode_charge', san: -10 }, { hp: -30 }),
        roll('去救那个女骑士', 'agi', 60, { flag: 'saved_eowyn', san: -8 }, { hp: -26 }),
        flat('往城门方向走——那里最需要人', { flag: 'went_gate', san: -12 }),
      ],
    },
    {
      scene: '西力斯昂哥 · 尸罗',
      text: '隧道里没有光。空气是甜的，甜得让人想睡。\n\n'
        + '你听见佛罗多在前面叫了一声。\n\n'
        + '然后是一阵很轻的、很多条腿走路的声音。',
      opts: () => [
        roll('举剑冲进去', 'str', 70, { flag: 'frodo_alive', san: -14 }, { hp: -40, flag: 'frodo_taken' }),
        roll('用光——任何光——把它逼退', 'int', 60, { flag: 'frodo_alive', flag2: 'shelob_repelled', use: 'flare' }, { hp: -28, flag: 'frodo_taken' }),
        flat('先救山姆', { flag: 'sam_saved', san: -10 }, { note: '他一直在外面砍网，砍得手都烂了' }),
      ],
    },
    {
      scene: '末日火山 · 裂缝',
      text: '裂缝下面全是火。热得睁不开眼。\n\n'
        + '佛罗多站在边上，手里拿着戒指。他站了很久。\n\n'
        + '然后他说：「它是我的。」\n\n'
        + '他把戒指戴上了。',
      opts: () => [
        roll('扑上去抢', 'str', 75, { flag: 'ring_destroyed', san: -14 }, { hp: -35, flag: 'ring_kept' }),
        roll('喊山姆的名字', 'int', 60, { flag: 'ring_destroyed', flag2: 'sam_helped', san: -10 }, { hp: -25, flag: 'ring_kept' }),
        flat('什么都不做', { flag: 'ring_kept', san: -20 }, { note: '你看着他把戒指戴上。那一刻你觉得这样也挺好' }),
      ],
    },
    {
      scene: '末日火山 · 崩塌',
      text: '戒指掉下去了。\n\n'
        + '没有声音。先是火停了，然后整座山开始往下塌。\n\n'
        + '佛罗多站在裂缝边上，手是空的，'
        + '他的表情不是高兴，是那种把一件背了很久的东西放下的表情。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('抓住他，往上爬', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.ring_destroyed) hit.push('ring');
    if (f.frodo_alive && f.escaped) hit.push('frodo');
    if (f.boromir_lived) hit.push('boromir');
    if (f.gandalf_saved) hit.push('gandalf');
    return hit;
  },
  penalties(s) {
    const out = [];
    // 原来扣 4000：主线 3000 直接被吃成负数，"搞砸了但活着回来"变成 0 点。
    // 那条路本来就已经够惨了（戒指没毁、佛罗多戴上了），没必要再罚到倒贴。
    if (s.flags.ring_kept) out.push({ label: '在火山口没有把戒指拿回来', points: -2500 });
    if (s.flags.boromir_died) out.push({ label: '波罗莫死在你赶到之前', points: -1500 });
    return out;
  },
  endings: [
    {
      when: (f) => f.ring_destroyed && f.frodo_alive && f.boromir_lived && f.gandalf_saved,
      title: '第十个人',
      text: '九个人走进这个故事。出来的时候是十个。\n\n'
        + '爱隆在瑞文戴尔等着。他看着你们，看了很久，然后说：\n\n'
        + '「你们改的东西，比你们以为的多。」\n\n'
        + '他看向你：「你不属于这个故事。你自己知道。」',
    },
    {
      when: (f) => f.ring_destroyed && f.frodo_alive,
      title: '山姆',
      text: '鹰把你们从山上带下来的时候，佛罗多一直没有睁眼。\n\n'
        + '山姆坐在旁边，一直在说同一句话：「都过去了，先生。都过去了。」\n\n'
        + '后来你在很多个世界里听过这句话，都是别人对别人说的。'
        + '只有这一次，说的人自己也不信。',
    },
    {
      when: (f) => f.ring_kept,
      title: '它还在',
      text: '山塌了，但你手里有东西。\n\n'
        + '它很凉，比刚才更凉。你把它收进怀里，告诉自己只是暂时保管。\n\n'
        + '结算界面这次没有出现点数。只有一行字，字很小：\n\n'
        + '「本世界的任务没有完成。但你带走了它。主神没有说这算不算。」',
    },
    {
      when: () => true,
      title: '灰',
      text: '你活着走出了魔多。天上全是灰，落了三天。\n\n'
        + '手环上显示：奖励点 +3000。\n\n'
        + '下面还有一行：「故事结束了。你可以回去了。你回不去了。」',
    },
  ],
});

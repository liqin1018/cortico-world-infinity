/**
 * 副本库。每个副本是一份纯数据 + 几个纯函数，不碰文件、不碰宿主。
 *
 * 三件事决定了这个文件长什么样：
 * 1. 每个副本必须能回答「为什么不能直接跑掉」——电梯只有三个座位、氧气只够 24 回合、
 *    雨落即封路。封闭不是装饰，它是让选择有重量的前提。
 * 2. 每条支线必须对应一个具体动作，不是一种意图。「救马特」不是支线，
 *    「在列车启动前把解药打进他手臂」才是。
 * 3. 失败不等于死。默认后果是「付出代价并继续」，只有标记 fatal 的才碰死亡判定。
 */

import { opt, roll, flat, bond } from './kit.js';
import { MORE_WORLDS } from './worlds/index.js';

/* ═══════════════════════════════════════════════════════════════════════
   副本一 · 生化危机 1（D 级 · 新手首秀）
   ═══════════════════════════════════════════════════════════════════════ */

const RE1 = {
  id: 're1',
  title: '生化危机 1',
  subtitle: '蜂巢 · 地下三百米',
  rating: 'D',
  band: '新手',
  turns: 14,
  accent: '#c2413a',
  pressure: { label: '距离蜂巢封锁', max: 14 },
  brief: '活到列车启动。这里原本有五百个人，现在还有几个，我们不告诉你。',
  intro:
    '你在一栋宅子的地板上醒来。空气里有槐花味，混着一点铁锈。玄关的镜子照出你——穿着不属于你的衣服，'
    + '手腕上多了一个手环，屏幕上是暗红色的字：距离蜂巢封锁，14 个刻度。\n\n'
    + '走廊尽头传来脚步声。不是一个人的，是五个，而且都带着枪。',
  main: { desc: '在蜂巢封锁前乘列车离开', points: 1000 },
  sides: [
    { id: 'matt', desc: '让马特·艾迪森活着登上列车', points: 2000, plot: 'C' },
    { id: 'licker', desc: '击杀或困住「舔食者」', points: 1500, plot: 'C' },
    { id: 'sample', desc: '取得 T 病毒样本', points: 1000, plot: 'D' },
    { id: 'truth', desc: '得知斯宾塞真正在做什么', points: 600, plot: null },
  ],
  /**
   * 马特。第一个会跟你说话的人，也是第一个你会想丢下的人。
   * 信任门槛定在 2 而不是 1：想让他替你去死，得先在列车上听他说完他妹妹的事。
   */
  mate: {
    id: 'matt',
    name: '马特·艾迪森',
    role: '来找妹妹的人',
    joinTurn: 2,
    trust: 1,
    bond: { min: 2, attr: 'per', bonus: 10 },
    bonus: { points: 800, plot: 'D' },
    survives: (s) => !s.flags.matt_dies && !s.flags.matt_isolated,
  },
  nodes: [
    {
      scene: '罗德山庄 · 玄关',
      text: '五个人冲进来的时候没有敲门。为首那个女人举枪扫了一圈，最后把枪口停在你脸上，停了很久。\n\n'
        + '「这人不在名单上。」她说。后面那个戴眼镜的瘦子拉了拉手套：「那就说明她是被派来的。或者，她是走错门的。」',
      opts: () => [
        flat('举起手，说自己也不记得怎么来的', { san: -2, flag: 'met_rain' }, { note: '蕾恩会暂时放下枪' }),
        roll('反问她「你们在找什么」', 'int', 45, { flag: 'know_mission', san: -1 }, { san: -5 }),
        flat('看一眼玄关镜子里的自己', { san: -8, flag: 'noticed_ring' }, { note: '镜子里有一枚戒指，不属于你' }),
      ],
    },
    {
      scene: '列车车厢',
      text: '列车在黑暗里往下走。窗外什么都看不见，只有偶尔闪过的红色警示灯。\n\n'
        + '蕾恩在数弹匣，数到第三遍的时候抬眼看你：「待会儿下去，你跟在我后面。别碰任何东西，别开任何门。」'
        + '她对面坐着一个穿蓝工装的年轻人，一直在抖。他叫马特。',
      opts: () => [
        flat('问马特为什么在这里', { flag: 'matt_talked', trust: 1 }, { note: '他说他在找他的妹妹' }),
        roll('检查列车上的装备箱', 'per', 40, { item: 'medkit', flag: 'got_kit' }, { hp: -6 }),
        flat('一言不发，检查自己的手环', { flag: 'know_countdown', san: -3 }),
      ],
    },
    {
      scene: '蜂巢 · 入口闸门',
      text: '闸门后面是白得刺眼的走廊，地上积着一层薄薄的水。水是红的。\n\n'
        + '红后的声音从天花板上传下来，很轻，是小孩的声音：「检测到未授权人员。封锁协议启动。」'
        + '前后两道闸门同时往下落。',
      opts: () => [
        roll('冲向闸门，用身体顶住', 'str', 60, { flag: 'gate_held' }, { hp: -15, flag: 'gate_closed' }),
        flat('喊蕾恩一起抬闸门', { flag: 'gate_held', san: -5 }, { note: '两个人一起，但蕾恩会受伤' }),
        roll('直接滚进走廊', 'agi', 45, { flag: 'in_corridor' }, { hp: -10, flag: 'in_corridor' }),
      ],
    },
    {
      scene: 'B 区 · 激光走廊',
      text: '走廊很长，白色的墙，白色的地。走到一半的时候，墙上的灯变成了红色。\n\n'
        + '一道细线从远处升起来，慢慢地横过来。然后是第二道。那根线切进墙壁的声音，'
        + '像有人在拉一把很长的小提琴。',
      opts: () => [
        roll('贴着地面翻滚过去', 'agi', 60, { flag: 'laser_dodged' }, { hp: -30 }),
        roll('抓住卡普兰，一起跳上侧面平台', 'str', 55, { flag: 'saved_kap' }, { hp: -25, flag: 'kap_hurt' }),
        roll('原地不动，看激光的规律', 'per', 50, { flag: 'laser_pattern', san: -2 }, { hp: -20 }),
        flat('用破拆包砸开侧墙', { flag: 'laser_bypass', san: 5, use: 'breach' },
          { cond: (s) => s.inv.breach > 0, note: '绕过整段走廊' }),
      ],
    },
    {
      scene: '实验室 · 培养区',
      text: '三十六个培养槽贴着墙。橙色的液体里，人的形状在慢慢打转。十九个槽是空的，玻璃向内碎。\n\n'
        + '最里面那台终端还亮着，屏幕上是一行没写完的字：「它不喜欢冷。」\n\n'
        + '马特突然停下来。他说：「我妹妹在这里工作。她叫丽莎。」',
      opts: () => [
        roll('查看终端记录', 'int', 45, { flag: 'read_log', item: 'sedative' }, { san: -6 }),
        flat('陪马特找他妹妹的名字', { flag: 'matt_trust', san: -4, trust: 1 }, { note: '名单上有她的名字，状态栏是空的' }),
        roll('直接去取样本柜里的 T 病毒', 'int', 50, { flag: 'sample_taken', item: 'sample' }, { hp: -8, san: -5 }),
      ],
    },
    {
      scene: '红后机房',
      text: '机房中央悬着一个小女孩的全息影像，穿白裙子，赤着脚。\n\n'
        + '「你们不该下来的。」她说，声音很平静，「我把他们关在里面，是为了不让它出去。现在你们把门打开了。」',
      opts: () => [
        flat('拔掉红后的主电源', { flag: 'red_queen_off', san: -10 }, { note: '全息影像熄灭前，她说了句「谢谢」' }),
        flat('先问她「它」是什么', { flag: 'know_virus', san: -5, item: 'sedative' }, { note: '获得关键情报，但要多花时间' }),
        roll('让卡普兰黑进系统，自己警戒', 'per', 45, { flag: 'red_queen_off', flags: { kap_alive: true } }, { flag: 'red_queen_off', hp: -12 }),
      ],
    },
    {
      scene: '实验室 · 停电',
      text: '灯全灭了。只有应急灯，红的，每七秒闪一次。\n\n'
        + '然后你听见了水声。不是漏水，是有什么东西在湿的地面上拖着自己往前。\n\n'
        + '蕾恩的枪口转过去，声音很稳：「别动。它在听。」',
      opts: () => [
        roll('屏住呼吸，靠墙不动', 'agi', 45, { flag: 'hid_1' }, { hp: -18 }),
        roll('开枪，先打它', 'str', 55, { kill: '行尸', point: 1, flag: 'shot_first' }, { hp: -22 }),
        flat('点亮照明棒，看清它', { flag: 'saw_it', san: -8, use: 'flare' },
          { cond: (s) => s.inv.flare > 0, note: '你看清了它的脸——它穿着保安制服' }),
      ],
    },
    {
      scene: '走廊 · 舔食者',
      text: '天花板上传来一声很轻的响动，像有人在上面舔了一下嘴唇。\n\n然后它落下来。\n\n'
        + '没有眼睛，只有一整张脸都是牙。它的前爪插进地面，混凝土像豆腐一样裂开。',
      opts: () => [
        roll('正面开战', 'str', 60, { hp: -15, flag: 'licker_hurt', kill: '舔食者（受伤）' }, { hp: -35, flag: 'licker_hurt' }, { note: '打伤它，但没打死' }),
        roll('把它引向激光走廊', 'int', 55, { flag: 'licker_trapped', kill: '舔食者（陷阱）', point: 500 }, { hp: -25 }),
        roll('掩护其他人先撤，自己断后', 'agi', 60, { flag: 'rear_guard', hp: -10 }, { hp: -30, flag: 'rear_guard' }),
        flat('让马特去引开它', { flag: 'matt_lured', san: -4, trust: -1 },
          { ...bond(2), note: '他跑得比你快。回来的时候在流血' }),
      ],
    },
    {
      scene: '配电间 · 斯宾塞',
      text: '配电间的门虚掩着。里面有人，正在往一个箱子里装东西。\n\n'
        + '是斯宾塞。他抬起头，一点都不慌：「你来得正好。帮我把这个搬上列车，我可以让你活着出去。」\n\n'
        + '箱子里是几管 T 病毒，还有一支绿色的解药。',
      opts: () => [
        flat('答应他，先拿到解药', { item: 'antidote', flag: 'deal_spencer', san: -5 }, { note: '他给了你一支，剩下的他自己留着' }),
        roll('抢箱子', 'agi', 55, { flag: 'got_case', item: 'antidote' }, { hp: -20, flag: 'spencer_fled' }),
        flat('揭穿他，让所有人知道', { flag: 'exposed_spencer', san: -3 }, { note: '蕾恩的枪口转过去了' }),
      ],
    },
    {
      scene: 'B 区 · 回程',
      text: '回去的路比来时短，但更难走。地上多了很多不该有的东西。\n\n'
        + '马特走在最后面。他一直在看手里的照片，看了很久，然后把照片塞回口袋，说：「她不在了，对吧。」',
      opts: () => [
        flat('告诉他实话', { flag: 'matt_told', san: -6 }),
        flat('说「可能还有机会」', { flag: 'matt_lie', san: -2 }),
        flat('什么都不说，递给他一支急救针', { flag: 'matt_trust', use: 'medkit' },
          { cond: (s) => s.inv.medkit > 0 }),
      ],
    },
    {
      scene: '列车站台',
      text: '站台的灯忽明忽暗。列车停在轨道上，门开着，里面很安静。\n\n'
        + '手环跳了一下：还有 3 个刻度。蕾恩在清点人数。她数了两遍，然后说：「少一个。」',
      opts: () => [
        roll('回去找', 'per', 50, { flag: 'found_missing' }, { hp: -18, san: -8 }),
        flat('坚持立刻开车', { flag: 'left_behind', san: -10 }),
        flat('让马特决定', { flag: 'matt_decides' }),
      ],
    },
    {
      scene: '列车 · 启动',
      text: '列车开始动了。窗外的黑暗开始往后走。\n\n'
        + '然后整节车厢震了一下，像有什么东西落在了车顶上。卡普兰抬头看天花板，咽了口口水：「……它跟着我们上来了。」',
      opts: () => [
        roll('打开车顶检修口，上去打', 'str', 65, { flag: 'licker_killed', kill: '舔食者', point: 500 }, { hp: -30 }),
        roll('断电，让它失去目标', 'int', 50, { flag: 'licker_lost' }, { hp: -20, flag: 'licker_onboard' }),
        flat('把箱子扔出去引开它', { flag: 'licker_lost', san: -5 },
          { cond: (s) => s.flags.got_case || s.flags.deal_spencer, note: '样本没了，但它走了' }),
      ],
    },
    {
      scene: '列车 · 最后一节',
      text: '车顶安静下来了。\n\n马特靠在车门边，手臂上有一道很深的抓痕，血已经不流了，伤口边缘是青色的。'
        + '他自己也看见了。他说：「我是不是……」他没说完。',
      opts: () => [
        flat('用解药救他', { flag: 'matt_cured', use: 'antidote' },
          { cond: (s) => s.inv.antidote > 0, note: '伤口退了颜色。他一句话都说不出来' }),
        flat('把他隔离到最后一节车厢', { flag: 'matt_isolated', san: -8 }),
        flat('什么都不做', { flag: 'matt_dies', san: -12 }),
      ],
    },
    {
      scene: '出口 · 白光',
      text: '列车停下。门开的时候，白光涌进来，刺得你睁不开眼。\n\n'
        + '外面是另一间实验室，白色的，很干净。有人穿着防护服在等你们，手里拿着记录板。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('走出去', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.matt_cured) hit.push('matt');
    if (f.licker_killed || f.licker_trapped) hit.push('licker');
    if (f.sample_taken) hit.push('sample');
    if (f.know_virus || f.exposed_spencer) hit.push('truth');
    return hit;
  },
  penalties(s) {
    return s.flags.left_behind ? [{ label: '抛下队友', points: -500 }] : [];
  },
  endings: [
    {
      when: (f) => f.matt_cured && (f.licker_killed || f.licker_trapped) && f.sample_taken,
      title: '四份战利品',
      text: '马特活下来了。舔食者的尸体留在车顶。样本在你怀里，还是凉的。\n\n'
        + '你是这三个月里第一个把三样东西都带出来的人。主神没有夸你，它只是把结算界面停得比平时久了一点。',
    },
    {
      when: (f) => f.matt_cured,
      title: '一个不该活的人',
      text: '马特下了车，站在白光里回头看你。他想说什么，但最后只是点了点头。\n\n'
        + '在主神的记录里，他应该在第十二个刻度就已经死了。',
    },
    {
      when: (f) => f.left_behind,
      title: '少一个',
      text: '你活下来了。列车里很安静，安静得能听见有人在数人数，数到最后一个的时候停住了。没有人再说话。',
    },
    {
      when: () => true,
      title: '活着出来',
      text: '你活下来了。这是你这个月第一次活下来。\n\n'
        + '手环上显示：奖励点 +1000。下面还有一行小字：「样本数据已归档。下一个世界，会更难。」',
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════
   副本二 · 死神来了 2（C 级 · 规则生存）
   没有敌人，只有设计。你救一个人，就等于替另一个人签了死亡通知。
   ═══════════════════════════════════════════════════════════════════════ */

const FD2 = {
  id: 'fd2',
  title: '死神来了 2',
  subtitle: '180 号公路 · 18:07',
  rating: 'C',
  band: '新手',
  turns: 12,
  accent: '#8a6d3b',
  pressure: { label: '距离「终点」', max: 12 },
  brief: '活到天亮。本世界没有可战斗的敌人——你唯一能做的，是看出它下一步要杀谁，然后决定救不救。',
  intro:
    '你在一条高速公路上醒来，坐在一辆银色 SUV 的后座。前排那个女孩一直在看后视镜，'
    + '看得很频繁，像在等什么东西出现。\n\n'
    + '她叫金伯利。副驾的朋友说她已经这样开了二十分钟。\n\n'
    + '你的手环上没有倒计时。只有一行字：**本世界无敌人。** 下面还有一行更小的：「他们本来都要死。」',
  main: { desc: '活到天亮（第 12 回合）', points: 1000 },
  sides: [
    { id: 'clear', desc: '找到克莱尔·里弗斯并让她相信你', points: 1500, plot: 'C' },
    { id: 'keep2', desc: '让至少两名幸存者活到天亮', points: 2000, plot: 'C' },
    { id: 'order', desc: '推算出死亡顺序', points: 1000, plot: 'D' },
    { id: 'break', desc: '找到「跳过」的办法', points: 2500, plot: 'B' },
  ],
  /**
   * 克莱尔。这个世界里唯一一个「已经知道规则」的人，所以她在的时候
   * 判定会变准——不是因为她强，是因为她见过上一次。
   */
  mate: {
    id: 'clair',
    name: '克莱尔·里弗斯',
    role: '经历过一次的人',
    joinTurn: 3,
    trust: 1,
    bond: { min: 2, attr: 'int', bonus: 10 },
    bonus: { points: 900, plot: 'C' },
    survives: (s) => !s.flags.clear_left,
  },
  nodes: [
    {
      scene: '180 号公路 · 车流',
      text: '前面的卡车开始刹车，一辆接一辆，像有人从远处把一条链子往回拉。\n\n'
        + '金伯利突然抓住方向盘：「不对。前面有东西。」她的声音很平，平得不正常。\n\n'
        + '后面的车已经开始按喇叭了。',
      opts: () => [
        roll('立刻让她靠边停车', 'int', 45, { flag: 'stopped', san: -3 }, { hp: -8, flag: 'crashed' }),
        roll('抢过方向盘', 'str', 55, { flag: 'stopped', san: -5 }, { hp: -15, flag: 'crashed' }),
        flat('回头看后面的车', { flag: 'saw_truck', san: -6 }, { note: '你看见一辆运木材的货车，捆绳已经松了' }),
      ],
    },
    {
      scene: '高速 · 连环相撞',
      text: '木头滚下来的时候没有声音——先是一根，然后是一整排，像有人把一把牙签倒在了路上。\n\n'
        + '一辆摩托从你左侧擦过去，骑手在最后一秒抬起了头。\n\n'
        + '你只有一次机会伸手。',
      opts: () => [
        roll('拉开车门，把最近的一个人拽出来', 'str', 55, { flag: 'saved_one', point: 0, san: -4 }, { hp: -20, flag: 'hurt_rescue' }),
        roll('喊所有人往护栏外跑', 'per', 50, { flag: 'warned_all' }, { hp: -12 }),
        flat('自己先滚下车', { flag: 'saved_self', san: -8 }),
      ],
    },
    {
      scene: '路边 · 幸存者',
      text: '七个人站在护栏外，看着自己的车在烧。没有人说话。\n\n'
        + '一个穿深色外套的女人最后走过来。她数了一遍人数，然后说：「七个。本来不止七个。」\n\n'
        + '她叫克莱尔。她经历过一次。',
      opts: () => [
        flat('直接告诉克莱尔「我也看得见」', { flag: 'clear_trust', trust: 1 }, { note: '她盯着你看了很久，然后说：那你说下一个是谁' }),
        roll('先听她讲上一次是怎么活下来的', 'per', 45, { flag: 'clear_told', flag2: 'order_hint' }, { san: -4 }),
        flat('什么都不说，先记下这七张脸', { flag: 'faces_noted', san: -3 }),
      ],
    },
    {
      scene: '拖车场 · 夜',
      text: '拖车场把烧掉的车一辆辆拉回来，排成一行。\n\n'
        + '有个穿工装的老头在数车，数到第四辆的时候停下来，对着空气说了句：「今天不轮到你们。」'
        + '然后他看了你一眼，笑了一下。',
      opts: () => [
        roll('问他这句话什么意思', 'int', 50, { flag: 'tow_lot_hint', san: -5 }, { san: -8 }),
        roll('检查第四辆车里的东西', 'per', 45, { item: 'flare', flag: 'found_flare' }, { hp: -10 }),
        flat('离开，去查那些幸存者的地址', { flag: 'addresses', san: -2 }),
      ],
    },
    {
      scene: '埃文家 · 公寓',
      text: '埃文家在十七楼。你按了三次门铃，没人开。\n\n'
        + '门缝里有煤气味。很淡，但你闻得出来。\n\n'
        + '屋里有水声。像有人在洗澡。',
      opts: () => [
        roll('撞门进去', 'str', 50, { flag: 'evan_saved', san: -4 }, { hp: -12, flag: 'evan_dies' }),
        roll('先关掉整层楼的电闸', 'int', 45, { flag: 'evan_saved', flag2: 'power_off' }, { hp: -8, flag: 'evan_dies' }),
        flat('敲门，喊他出来', { flag: 'evan_warned', san: -6 }, { note: '水声停了。门没有开' }),
      ],
    },
    {
      scene: '殡仪馆',
      text: '殡仪馆里很冷。停着七口棺材，其中一口是空的。\n\n'
        + '一个黑人老头坐在最后面，手里拿着一把梳子，一直在梳自己的头发。他说：「你们不该在这里。这里是我的地方。」',
      opts: () => [
        roll('问他「空的那口是谁的」', 'per', 55, { flag: 'coffin_hint', san: -8 }, { san: -14 }),
        flat('看那口空棺材里的东西', { flag: 'coffin_empty', san: -10 }, { note: '里面有一张照片，是你自己' }),
        flat('立刻离开', { flag: 'left_mortuary', san: -3 }),
      ],
    },
    {
      scene: '公路 · 第二次预兆',
      text: '你开着车，前面的红灯变成了绿灯，绿灯又变回红灯。\n\n'
        + '路边的水洼里倒映着一块牌子，牌子上写着「前方施工」。但你抬头看，路是空的。\n\n'
        + '收音机自己开了，播的是一首很老的歌。克莱尔突然说：「调频。别听。」',
      opts: () => [
        roll('盯着水洼看，看清牌子上的字', 'per', 60, { flag: 'sign_read', san: -10 }, { hp: -18 }),
        roll('立刻掉头，走另一条路', 'int', 50, { flag: 'rerouted' }, { hp: -10, flag: 'still_on_road' }),
        flat('关掉收音机，什么都不做', { flag: 'radio_off', san: -6 }),
      ],
    },
    {
      scene: '医院 · 停尸层',
      text: '医院地下二层，灯只亮一半。走廊尽头有一扇门，门上写着「非工作人员禁止入内」。\n\n'
        + '门缝里透出来的光是蓝的。\n\n'
        + '你听见里面有人在数数：「一、二、三……」数到七的时候停了。',
      opts: () => [
        roll('推门进去', 'con', 55, { flag: 'saw_list', flag2: 'order_known', san: -15 }, { san: -20, hp: -10 }),
        roll('贴在门上听', 'per', 50, { flag: 'heard_list', san: -8 }, { san: -12 }),
        flat('转身走', { san: -4 }),
      ],
    },
    {
      scene: '医院 · 天台',
      text: '天台上风很大。克莱尔靠在栏杆上，说她上次是怎么活下来的：\n\n'
        + '「我把自己关在一间软包病房里，什么都不碰，不吃不喝，等到时间过去。」\n\n'
        + '她顿了一下：「然后我发现，时间不会过去。它只是换了一个人来杀。」',
      opts: () => [
        flat('问她「换一个人」是什么意思', { flag: 'clear_explain', flag2: 'skip_hint' }, { note: '她说：你救一个人，它就去找下一个。顺序不会停，只会跳' }),
        roll('说服她这次不一样', 'int', 60, { flag: 'clear_ally', trust: 1 }, { san: -6 }),
        flat('什么都不说，看着楼下', { san: -5, flag: 'saw_ambulance' }),
      ],
    },
    {
      scene: '街道 · 救护车',
      text: '一辆救护车停在路口，后门开着。里面没有人，但担架上有一个氧气瓶，阀门是开的。\n\n'
        + '一个孕妇站在车旁边，扶着车门，脸色很白。她说她在等她的丈夫。\n\n'
        + '你手环上的字变了：**「她本来不该在这里。」**',
      opts: () => [
        roll('把她拉离救护车', 'str', 50, { flag: 'pregnant_saved', san: -4 }, { hp: -14, flag: 'pregnant_dies' }),
        roll('关掉氧气阀门', 'int', 55, { flag: 'valve_off', flag2: 'pregnant_saved' }, { hp: -10 }),
        flat('不管她，去找克莱尔', { flag: 'ignored_her', san: -12 }),
      ],
    },
    {
      scene: '终点 · 湖边',
      text: '天亮前最黑的那一段。湖边有一栋木屋，窗户里亮着灯。\n\n'
        + '克莱尔站在门口，手里拿着一桶汽油。她说：「这次我不等了。我把这栋屋子烧了，它就没地方来了。」\n\n'
        + '屋里有三个人在睡觉。',
      opts: () => [
        roll('夺下汽油桶', 'str', 60, { flag: 'stopped_fire', san: -6 }, { hp: -20, flag: 'house_burned' }),
        // clear_ally 在这里补一次：原来它只由第 9 回合「说服她」给，
        // 而 skip_hint 也在同一个节点的另一个选项里——两个互斥分支，
        // 导致「跳过」这条支线在实玩里永远凑不齐。随机 30 局一次都没出现。
        roll('劝她换个办法', 'int', 65, { flag: 'clear_calmed', flags: { clear_ally: true } }, { san: -10, flag: 'clear_left' }),
        flat('让她烧', { flag: 'house_burned', san: -14 }),
        flat('让克莱尔把桶放下', { flag: 'stopped_fire', san: -4, trust: -1 },
          { ...bond(2), note: '她看了你很久，然后把桶放在地上' }),
      ],
    },
    {
      scene: '天亮',
      text: '天是一点点亮的。先是窗外的黑变成灰，再变成白。\n\n'
        + '你数了一遍。活下来的人比你记得的少。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('站起来，走出去', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.clear_trust || f.clear_ally || f.clear_calmed) hit.push('clear');
    const survivors = [f.evan_saved, f.pregnant_saved, f.stopped_fire, f.clear_calmed].filter(Boolean).length;
    if (survivors >= 2) hit.push('keep2');
    if (f.order_known || f.heard_list || f.order_hint) hit.push('order');
    if (f.skip_hint && f.clear_ally) hit.push('break');
    return hit;
  },
  penalties(s) {
    return s.flags.house_burned ? [{ label: '烧了那栋屋子', points: -1200 }] : [];
  },
  endings: [
    {
      when: (f) => f.skip_hint && f.clear_ally && f.stopped_fire,
      title: '跳过',
      text: '你找到了那个办法：不是躲，是把顺序往后推一格，然后让那一格空着。\n\n'
        + '克莱尔说这不算赢。你说，那就先不算。\n\n天亮了，没有人在你面前死。这已经是你能做到的最好。',
    },
    {
      when: (f) => f.clear_ally,
      title: '有人信你',
      text: '克莱尔最后跟你说了句「下次别再来找我」。但她把她的电话号码塞给了你。\n\n'
        + '在主神那里，这张纸不算道具，不进背包。它只是一张纸。',
    },
    {
      when: (f) => f.house_burned,
      title: '火烧完了',
      text: '木屋烧到只剩地基。灰里没有东西。\n\n'
        + '你站在湖边，听见远处有人在数数，从一开始数。它不着急。它有的是时间。',
    },
    {
      when: () => true,
      title: '天亮',
      text: '你活到了天亮。这件事在这个世界里，已经算一件大事。\n\n'
        + '手环上显示：奖励点 +1000。它没有说下一局是什么。它从来不说。',
    },
  ],
};

export const WORLD_LIST = [RE1, FD2, ...MORE_WORLDS];
export const BY_ID = Object.fromEntries(WORLD_LIST.map((w) => [w.id, w]));

export { opt, roll, flat };

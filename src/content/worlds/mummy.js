/**
 * 神鬼传奇（A 级 · 14 回合）
 *
 * 第一个「Boss 不是被打死的」副本。伊莫顿的数值高到正面打没有意义，
 * 真正的解法在道具和咒文里——所以这一部的判定大量落在智力和感知上。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const MUMMY = audit({
  id: 'mummy',
  title: '神鬼传奇',
  subtitle: '哈姆纳塔 · 亡灵之城',
  rating: 'A',
  band: '高难',
  turns: 14,
  accent: '#a8843c',
  pressure: { label: '距离伊莫顿完全复活', max: 14 },
  brief: '在伊莫顿恢复全部力量之前处理掉他。他打不死——他只能被念回去。',
  intro:
    '你在开罗的一间牢房里醒来。墙上有水，水是咸的。\n\n'
    + '对面牢房关着一个满脸胡子的男人，他正在用鞋底磨一根铁钉，'
    + '磨得很专注。他抬头看你一眼：\n\n'
    + '「你也去哈姆纳塔？那地方我去过。我不建议你去。」\n\n'
    + '他叫瑞克·欧康纳。手环上写着：**距离伊莫顿完全复活，14 个刻度。**',
  main: { desc: '在伊莫顿恢复全部力量前处理掉他', points: 3000 },
  sides: [
    { id: 'evelyn', desc: '让伊芙琳·卡纳汉活着走出亡灵之城', points: 6000, plot: 'A' },
    { id: 'imhotep', desc: '用咒文把伊莫顿封回去', points: 5000, plot: 'B' },
    { id: 'book', desc: '带出亡灵圣经', points: 4000, plot: 'B' },
    { id: 'ardeth', desc: '让阿德斯贝活着并接受你的帮助', points: 3000, plot: 'B' },
  ],
  /**
   * 欧康纳。他是这个世界里唯一一个「打过仗、也坐过牢」的人，
   * 所以他既不怕死，也不信任何人——信任只能靠一起挨过来攒。
   */
  mate: {
    id: 'oconnor',
    name: '瑞克·欧康纳',
    role: '从监狱里被放出来的人',
    joinTurn: 2,
    trust: 2,
    bond: { min: 2, attr: 'str', bonus: 10 },
    bonus: { points: 1200, plot: 'B' },
    survives: (s) => !s.flags.ran_out_alone,
  },
  nodes: [
    {
      scene: '开罗 · 监狱',
      text: '欧康纳把铁钉磨好，撬开锁，动作熟练得不像第一次。\n\n'
        + '「我欠你一次。」他说，「不过我得先去找一个人。她哥哥有一张地图，'
        + '地图上标着哈姆纳塔的位置。」\n\n'
        + '走廊尽头有守卫的脚步声。',
      opts: () => [
        roll('帮他放倒守卫', 'str', 50, { flag: 'oconnor_trust', san: -3 }, { hp: -12 }),
        flat('让他先走，自己断后', { flag: 'oconnor_trust', flag2: 'stayed_behind', san: -6 }),
        roll('先问清楚哈姆纳塔有什么', 'int', 45, { flag: 'know_hamunaptra' }, { san: -5 }),
      ],
    },
    {
      scene: '开罗 · 旅馆',
      text: '旅馆的房间里摊着一张地图，边角烧掉了一块。\n\n'
        + '一个戴眼镜的女人正跪在地图上，用尺子量距离。'
        + '她抬头，很兴奋：「你们是向导？太好了。我叫伊芙琳，'
        + '我是图书馆员。我知道那地方在哪，但我不知道怎么活着到那儿。」\n\n'
        + '她哥哥乔纳森站在旁边，手里拿着一瓶酒。',
      opts: () => [
        flat('答应带她去', { flag: 'evelyn_met', san: 3 }),
        roll('指出地图上烧掉的那块是关键', 'per', 50, { flag: 'map_gap', flag2: 'evelyn_met' }, { san: -4 }),
        flat('建议她留在开罗', { flag: 'evelyn_stay', san: -4 }, { note: '她说：我宁可死在那儿，也不想一辈子只知道书上的那点东西' }),
      ],
    },
    {
      scene: '哈姆纳塔 · 挖掘',
      text: '沙子下面是一座城的顶。工人们挖了三天，挖出一条向下的阶梯。\n\n'
        + '阶梯两侧刻着字，不是象形文字，是更古老的东西。'
        + '伊芙琳摸着那些字，念了一句，然后又念了一句。\n\n'
        + '欧康纳说：「别念。我上次来的时候，有人也念了。」',
      opts: () => [
        roll('让伊芙琳把整段读出来', 'int', 55, { flag: 'read_inscription', flag2: 'know_curse', san: -8 }, { san: -14 }),
        flat('制止她，先下去看', { flag: 'stopped_reading', san: -2 }),
        roll('自己辨认墙上的符号', 'per', 55, { flag: 'read_inscription' }, { san: -6 }),
      ],
    },
    {
      scene: '地下 · 亡灵圣经',
      text: '地下的墓室很大，中间有一个石台，石台上放着一本书，黑色的，'
        + '封面是人皮，被封在铁链里。\n\n'
        + '旁边还有一个罐子，罐子里有东西在动。\n\n'
        + '乔纳森说：「那个罐子我先拿着，我总觉得它值钱。」',
      opts: () => [
        roll('解开铁链，拿走书', 'str', 60, { flag: 'got_book', item: 'necronomicon', san: -10 }, { hp: -20 }),
        flat('让伊芙琳来处理这本书', { flag: 'got_book', flag2: 'evelyn_read', item: 'necronomicon', san: -6 }),
        flat('什么都不碰，先记下位置', { flag: 'left_intact', san: -4 }),
      ],
    },
    {
      scene: '墓室 · 复活',
      text: '有人念了不该念的句子。\n\n'
        + '石棺的盖子被从里面推开，一只手伸出来，抓在边缘。'
        + '那只手是干的，皮贴在骨头上，但它在动。\n\n'
        + '整个墓室的火把同时灭了，又同时亮起来，火是绿的。',
      opts: () => [
        roll('在它站起来之前把盖子压回去', 'str', 65, { flag: 'coffin_held', san: -10 }, { hp: -28 }),
        roll('拉住离它最近的人往后退', 'agi', 55, { flag: 'saved_first', san: -8 }, { hp: -16 }),
        flat('开枪打它', { flag: 'shot_mummy', san: -12 }, { note: '子弹穿过去，打在墙上。它连头都没转' }),
      ],
    },
    {
      scene: '开罗 · 蝗灾',
      text: '回到开罗的时候，天是黄的。不是沙尘，是蝗虫。\n\n'
        + '街上的人都在跑。有人跪在地上，用拉丁文念经。\n\n'
        + '伊莫顿站在钟楼上，' + '他的脸已经长回来了，一半。他看见你们，抬起手，'
        + '蝗虫就往一个方向涌。',
      opts: () => [
        roll('带人躲进清真寺', 'int', 50, { flag: 'hid_mosque' }, { hp: -12, san: -8 }),
        roll('逆着人流去找伊芙琳', 'con', 55, { flag: 'found_evelyn', san: -10 }, { hp: -20 }),
        flat('开枪打钟楼上的那个东西', { flag: 'shot_at_imhotep', san: -12 }, { note: '他低头看你，第一次有了表情' }),
      ],
    },
    {
      scene: '沙漠 · 阿德斯贝',
      text: '一队穿黑袍的人从沙丘后面出现，为首的那个脸上有刺青。\n\n'
        + '「我叫阿德斯贝。」他说，「我们是法老的守卫。这个东西是我们放出来的，'
        + '所以也该由我们收回去。」\n\n'
        + '他看了看你：「你们这些人，总是把不该开的东西打开。」',
      opts: () => [
        roll('把手里的书交给他', 'int', 50, { flag: 'ardeth_trust', san: -6 }, { san: -10 }),
        flat('告诉他你想帮忙，不是想抢东西', { flag: 'ardeth_trust', san: 2 }),
        flat('拒绝，说书在你们手上更安全', { flag: 'ardeth_refused', san: -4 }),
      ],
    },
    {
      scene: '营地 · 伊芙琳被掳',
      text: '你在半夜醒来，火堆还在烧，但伊芙琳不在了。\n\n'
        + '沙地上有一道拖痕，往哈姆纳塔的方向。\n\n'
        + '欧康纳蹲下去看那道痕迹，看了很久，然后说：「他是来拿她的。'
        + '他要一个祭品，一个读过那本书的人。」',
      opts: () => [
        roll('立刻追', 'agi', 55, { flag: 'chased', san: -8 }, { hp: -14 }),
        roll('先找阿德斯贝要人手', 'int', 55, { flag: 'chased', flag2: 'ardeth_help', san: -4 }, { san: -10 }),
        flat('先去找太阳金经', { flag: 'seek_gold_book', san: -6 }, { note: '这是唯一能杀死他的东西。但伊芙琳等不了那么久' }),
      ],
    },
    {
      scene: '哈姆纳塔 · 仪式',
      text: '祭坛已经搭好了。伊芙琳被绑在中间，她没有哭，'
        + '她在跟伊莫顿说话——说话的语气，像在跟一个病人解释病情。\n\n'
        + '「你不必这么做。」她说，「你已经自由了，你可以走。」\n\n'
        + '伊莫顿停了一下。他的手在发抖。',
      opts: () => [
        roll('趁他分神冲上去割断绳子', 'agi', 60, { flag: 'evelyn_saved', san: -10 }, { hp: -26 }),
        roll('先念书上的咒文', 'int', 60, { flag: 'chanted', san: -12 }, { hp: -18, flag: 'interrupted' }),
        flat('喊伊芙琳的名字', { flag: 'called_name', san: -8 }, { note: '她转过头看你。伊莫顿也转过了头' }),
      ],
    },
    {
      scene: '地下 · 安苏娜姆',
      text: '祭坛后面还有一具石棺，棺盖已经打开一半。\n\n'
        + '里面躺着一个女人，保存得很好，'
        + '她的手上戴着一只金手镯，手镯上刻着一个名字：安苏娜姆。\n\n'
        + '伊莫顿站在棺边，很久没有动。',
      opts: () => [
        roll('问他「她是什么样的人」', 'per', 55, { flag: 'asked_ansunam', san: -6 }, { san: -10 }),
        flat('趁他站着不动，去拿金经', { flag: 'got_gold_book', san: -6 }),
        flat('把手镯取下来', { flag: 'took_bracelet', san: -10 }, { note: '他看见了这个动作。他的眼睛里第一次有了恨' }),
      ],
    },
    {
      scene: '祭坛 · 正面对上',
      text: '他站在祭坛前，风把沙子卷起来，绕着圈走。\n\n'
        + '欧康纳开枪，阿德斯贝的人开枪，子弹打进去，'
        + '沙子从他身上的洞里流出来，然后又流回去。\n\n'
        + '他朝你走过来，不快，也不慢。',
      opts: () => [
        roll('念太阳金经的咒文', 'int', 65, { flag: 'chanted_full', san: -14 }, { hp: -30, flag: 'chant_broken' }),
        roll('拦住他，给伊芙琳争取时间', 'str', 70, { flag: 'held_line', san: -12 }, { hp: -40 }),
        flat('把亡灵圣经扔进火里', { flag: 'burned_book', san: -16 }, { note: '他停住了。他看着那本书烧，像看着自己的房子烧' }),
      ],
    },
    {
      scene: '祭坛 · 最后一句',
      text: '咒文念到最后一句了。风停了。\n\n'
        + '他站在那里，一动不动。他的脸已经完全长回来了，'
        + '看上去只是一个很累的人。\n\n'
        + '伊芙琳在你旁边小声说：「他本来只是想救她。」',
      opts: () => [
        flat('念完最后一句', { flag: 'sealed', san: -10 }),
        flat('不念最后一句，叫她的名字', { flag: 'called_ansunam', san: -12 },
          { note: '你说了「安苏娜姆」。他抬头看你，然后自己走进了阳光里' }),
      ],
    },
    {
      scene: '哈姆纳塔 · 塌',
      text: '城在往下沉。沙子从四面八方涌进来，把街道一口一口吃掉。\n\n'
        + '阿德斯贝在喊：「往上！往城门口跑！」\n\n'
        + '伊芙琳抱着那本书，跑得很慢。',
      opts: () => [
        roll('回去拉她', 'str', 60, { flag: 'evelyn_out', san: -8 }, { hp: -22 }),
        roll('让欧康纳去，自己带路', 'int', 50, { flag: 'evelyn_out', flag2: 'oconnor_saved_her' }, { hp: -10 }),
        flat('自己先跑出去', { flag: 'ran_out_alone', san: -14 }),
        flat('让欧康纳先带她走，你断后', { flag: 'evelyn_out', hp: -18, trust: 1 },
          { ...bond(2), note: '他把人推上台阶，回头骂了你一句，然后一起跑' }),
      ],
    },
    {
      scene: '沙漠 · 天亮',
      text: '天亮的时候，哈姆纳塔已经不在了。沙丘是平的，什么都没有。\n\n'
        + '乔纳森坐在沙子上，手里还抱着那个罐子。他说：「我总觉得少了点什么。」\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('站起来', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.evelyn_out || (f.evelyn_saved && !f.ran_out_alone)) hit.push('evelyn');
    if (f.sealed || f.called_ansunam) hit.push('imhotep');
    if (f.got_book && !f.burned_book) hit.push('book');
    if (f.ardeth_trust && !f.ardeth_refused) hit.push('ardeth');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.ran_out_alone) out.push({ label: '把伊芙琳留在城里', points: -3000 });
    if (s.flags.took_bracelet) out.push({ label: '从石棺里拿走手镯', points: -1200 });
    return out;
  },
  endings: [
    {
      when: (f) => f.called_ansunam,
      title: '名字',
      text: '你没有念最后一句。你说了她的名字。\n\n'
        + '伊莫顿停住了。他站在祭坛前，像一个终于被允许休息的人。'
        + '然后他自己走进了阳光里。\n\n'
        + '结算的时候，主神给你的点数比念完咒文少五千。\n\n'
        + '但它在最后加了一行，这行字不在结算规则里：\n\n'
        + '「伊莫顿记得你。」',
    },
    {
      when: (f) => f.sealed,
      title: '封印',
      text: '咒文念完的瞬间，风停了。他的身体从脚开始变成沙，'
        + '沙子没有落在地上，而是往上飘。\n\n'
        + '他最后看了一眼那具石棺。那不是怪物的眼神。\n\n'
        + '阿德斯贝走过来，把手放在你肩上，说了一句阿拉伯语。'
        + '伊芙琳后来告诉你，那句话的意思是：「愿你不要再被叫回来。」',
    },
    {
      when: (f) => f.ran_out_alone,
      title: '沙子是平的',
      text: '你跑出来的时候没有回头。回头看的时候，城已经不见了。\n\n'
        + '欧康纳站在沙丘上，一直在看那个方向。他没有问你为什么先跑。\n\n'
        + '他后来再也没有跟你说过话。',
    },
    {
      when: () => true,
      title: '走出来了',
      text: '你活着走出了亡灵之城。这件事本身就已经是个奇迹。\n\n'
        + '手环上显示：奖励点 +3000。\n\n'
        + '下面还有一行字：「本世界的封印物已归档。下一批人还会把它挖出来。」',
    },
  ],
});

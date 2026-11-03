/**
 * 星河战队（A 级 · 12 回合）
 *
 * 唯一一个「人数就是血条」的副本。个人的枪法在这里意义不大，
 * 真正决定生死的是弹药分配、防线位置和「谁去断后」。
 */
import { roll, flat, audit, bond } from '../kit.js';

export const SST = audit({
  id: 'sst',
  title: '星河战队',
  subtitle: '克伦达苏 · 前哨站',
  rating: 'A',
  band: '高难',
  turns: 12,
  accent: '#5a6b7a',
  pressure: { label: '距离撤离艇抵达', max: 12 },
  brief: '守到撤离艇来。虫子的数量是无限的，你的弹药不是——所以活下来的人，都是会算数的人。',
  intro:
    '你在一艘运输舰的机舱里醒来。安全带勒得很紧，'
    + '舱壁上有一行喷漆：「服役即公民。」\n\n'
    + '一个剃着平头的年轻人坐在你对面，正在检查步枪。'
    + '他抬头，笑了一下：「第一次下来？我叫瑞科。」\n\n'
    + '舱门开了，光涌进来。下面是克伦达苏，一颗灰扑扑的、'
    + '正在动的小行星。\n\n'
    + '手环上写着：**距离撤离艇抵达，12 个刻度。**',
  main: { desc: '守住前哨站直到撤离艇抵达', points: 3000 },
  sides: [
    { id: 'brain', desc: '找到并击杀脑虫', points: 6000, plot: 'A' },
    { id: 'squad', desc: '让小队五个人全部登上撤离艇', points: 5000, plot: 'A' },
    { id: 'dizzy', desc: '让迪兹活着撤离', points: 4000, plot: 'B' },
    { id: 'hold', desc: '在主防线失守前守住阵地', points: 3500, plot: 'B' },
  ],
  /**
   * 迪兹。这个世界里同伴的「信任」不是感情，是「你愿不愿意替她挡那一下」。
   * 所以她的信任是往上加的——你为她挨的每一发，都比你说的话管用。
   */
  mate: {
    id: 'dizzy',
    name: '迪兹·弗洛雷斯',
    role: '机动步兵',
    joinTurn: 2,
    trust: 2,
    bond: { min: 2, attr: 'agi', bonus: 10 },
    bonus: { points: 1200, plot: 'B' },
    survives: (s) => Boolean(s.flags.dizzy_saved),
  },
  nodes: [
    {
      scene: '运输舰 · 简报',
      text: '中士把一张地图钉在舱壁上，用刀柄敲了敲：\n\n'
        + '「前哨站，三面墙，一个门。撤离艇十二个刻度之后到。」\n\n'
        + '「我不骗你们。虫子会来很多。你们的任务不是杀光它们，'
        + '是让那个门一直开着。」\n\n'
        + '他看了一眼拉萨莱：「尤其是你，别想着当英雄。」',
      opts: () => [
        roll('问他「如果门守不住呢」', 'int', 50, { flag: 'know_plan_b', san: -4 }, { san: -8 }),
        flat('去检查弹药基数', { flag: 'checked_ammo', san: -2 }, { note: '每人四个弹匣。中士自己的那份写的是「备用」' }),
        flat('跟瑞科和迪兹握手，记住他们的名字', { flag: 'squad_known', san: 3 }),
      ],
    },
    {
      scene: '空降场',
      text: '着陆舱砸进地里的时候，你的牙磕到了舌头，满嘴是血。\n\n'
        + '外面是灰的，全是灰。地平线上有一些土堆，'
        + '土堆在动，动得很慢，像在呼吸。\n\n'
        + '中士在无线电里喊：「别站在空地上！跑！」',
      opts: () => [
        roll('冲向最近的岩石', 'agi', 55, { flag: 'reached_rock' }, { hp: -18 }),
        roll('架枪掩护后面的人', 'str', 55, { flag: 'covered_landing', san: -6 }, { hp: -22 }),
        flat('先把手环上的刻度记下来', { flag: 'counted', san: -4 }),
      ],
    },
    {
      scene: '前哨站 · 三面墙',
      text: '墙是预制板拼的，一米厚，上面已经有很多划痕。\n\n'
        + '墙外五十米是第一道铁丝网，网上挂着一些东西，'
        + '分不清是虫子的一部分还是人的。\n\n'
        + '迪兹站在墙头，一直没说话。她忽然说：「它们来了。很多。」',
      opts: () => [
        roll('分配防线：谁守哪一段', 'int', 55, { flag: 'line_set', san: -4 }, { san: -8 }),
        roll('带人去加固那道门', 'str', 50, { flag: 'door_reinforced' }, { hp: -12 }),
        flat('先去看墙外那些东西', 'per', 55, { flag: 'saw_swarm', san: -10 }, { san: -14 }),
      ],
    },
    {
      scene: '夜 · 第一波',
      text: '它们不是冲过来的，是涌过来的。像水，从地平线上漫过来。\n\n'
        + '枪声响了。第一排倒了，第二排踩着第一排上来。\n\n'
        + '中士在无线电里报数：「一百二十。一百五十。两百——别数了，开枪。」',
      opts: () => [
        roll('守着墙头，一发一发打', 'per', 60, { flag: 'held_wall', san: -8 }, { hp: -26 }),
        roll('用手雷清一片', 'str', 55, { kill: '虫群', point: 300, flag: 'grenade_used' }, { hp: -18 }),
        flat('喊所有人退到内墙', { flag: 'fell_back', san: -10 }, { note: '退回来的人比刚才少两个' }),
      ],
    },
    {
      scene: '弹药点',
      text: '弹药箱是空的。不是打空了——是本来就只有一半。\n\n'
        + '中士蹲在箱子前面，看了很久，然后说：\n\n'
        + '「后勤说补给会在第四波之前到。」\n\n'
        + '第四波就是现在。',
      opts: () => [
        roll('去翻阵亡者的弹药', 'per', 50, { flag: 'scavenged', san: -10 }, { hp: -14 }),
        roll('重新分配，每人三发', 'int', 55, { flag: 'rationed', san: -6 }, { san: -10 }),
        flat('把自己的弹药分给迪兹', { flag: 'gave_dizzy_ammo', san: 2 }, { note: '她愣了一下，说：那你呢' }),
      ],
    },
    {
      scene: '第二波 · 门',
      text: '门在响。不是被撞，是被啃。\n\n'
        + '瑞科站在门后面，用肩膀顶着，'
        + '他说：「这东西撑不了太久。谁去把那个洞堵上？」\n\n'
        + '墙内侧有一道裂缝，正在往外渗东西。',
      opts: () => [
        roll('用钢板焊住裂缝', 'str', 60, { flag: 'sealed_crack' }, { hp: -24 }),
        roll('带人从内侧打退它们', 'str', 65, { flag: 'repelled_breach', san: -10 }, { hp: -30 }),
        flat('放弃外墙，所有人退到内院', { flag: 'lost_outer', san: -14 }, { note: '外墙倒了。倒的时候里面还有人在上面' }),
      ],
    },
    {
      scene: '墙头 · 迪兹',
      text: '迪兹中弹了——不是子弹，是爪。她的腿被撕开一道口子，'
        + '血在往下流，但她还站着，还在开枪。\n\n'
        + '她说：「别过来。我这位置好。」\n\n'
        + '她的弹匣只剩一个。',
      opts: () => [
        roll('冲上去把她拖下来', 'str', 60, { flag: 'dizzy_saved', san: -8 }, { hp: -30 }),
        roll('把自己的弹匣扔给她，掩护她撤', 'agi', 55, { flag: 'dizzy_saved', flag2: 'gave_ammo_2', san: -10 }, { hp: -18 }),
        flat('尊重她的选择，继续打自己的方向', { flag: 'dizzy_lost', san: -16 }),
        flat('让她撤，你顶她的位置', { flag: 'dizzy_saved', hp: -25, trust: 1 },
          { ...bond(1), note: '她不肯。你把她拽下来，自己站了上去' }),
      ],
    },
    {
      scene: '无线电 · 撤离提前',
      text: '无线电里是卡门的声音，她在轨道上，声音很紧：\n\n'
        + '「撤离艇提前了。四个刻度。你们必须现在就到空降场。」\n\n'
        + '中士看了一眼墙外，说：「四个刻度，我们走不到。」',
      opts: () => [
        roll('让中士带人先走，自己断后', 'str', 65, { flag: 'rear_guard', san: -10 }, { hp: -35 }),
        roll('找一条虫少的路', 'per', 60, { flag: 'found_route' }, { hp: -20 }),
        flat('让所有人一起冲', { flag: 'all_charge', san: -12 }, { note: '一起冲的意思，是死也一起' }),
      ],
    },
    {
      scene: '地下 · 通道',
      text: '地下有一条通道，比地面安全，但方向不对——'
        + '它通向虫群来的方向。\n\n'
        + '拉萨莱走在最前面。他忽然停下来，把手放在墙上，说：\n\n'
        + '「你们听见了吗？这里面有东西在呼吸。很大。」',
      opts: () => [
        roll('继续往前走', 'con', 60, { flag: 'went_deep', san: -10 }, { hp: -22 }),
        roll('在墙上开个洞，绕过去', 'int', 55, { flag: 'bypassed', san: -6 }, { hp: -16 }),
        flat('往回走，走地面', { flag: 'back_to_surface', san: -8 }),
      ],
    },
    {
      scene: '洞穴 · 脑虫',
      text: '洞穴很大，中间有一个东西，'
        + '像一团泡在液体里的脑子，有房子那么大。\n\n'
        + '它的表面在动，一下一下，'
        + '每动一下，外面的虫群就往一个方向涌。\n\n'
        + '它在指挥它们。',
      opts: () => [
        roll('开枪打它', 'str', 70, { flag: 'brain_killed', kill: '脑虫', point: 800 }, { hp: -40 }),
        roll('放炸药，把整个洞埋了', 'int', 60, { flag: 'brain_killed', kill: '脑虫（活埋）', point: 800 }, { hp: -30 }),
        flat('记下位置，先撤', { flag: 'brain_found', san: -8 }),
      ],
    },
    {
      scene: '空降场 · 撤离艇',
      text: '撤离艇已经落下来了。舱门开着，卡门在里面挥手。\n\n'
        + '虫群从三个方向过来，但没有冲——它们在原地打转，'
        + '像一群突然找不到方向的东西。\n\n'
        + '中士在你旁边说：「你干了什么？」',
      opts: () => [
        roll('掩护最后几个人登艇', 'str', 65, { flag: 'covered_evac', san: -8 }, { hp: -30 }),
        roll('去把还活着的人一个一个拖上来', 'con', 60, { flag: 'counted_survivors', san: -10 }, { hp: -25 }),
        flat('登艇，关门', { flag: 'boarded_fast', san: -12 }),
      ],
    },
    {
      scene: '撤离 · 轨道',
      text: '艇升起来的时候，下面还在打。\n\n'
        + '你看见有人在挥手，但分不清那是求救还是告别。\n\n'
        + '手环上跳出一行字：任务完成。结算中。',
      opts: () => [flat('坐下来', { flag: 'escaped' })],
    },
  ],
  assess(s) {
    const f = s.flags;
    const hit = [];
    if (f.brain_killed) hit.push('brain');
    if (f.dizzy_saved && !f.dizzy_lost) hit.push('dizzy');
    if (f.held_wall && !f.lost_outer) hit.push('hold');
    // 小队全活：迪兹活着，并且你还做了「掩护登艇」或「回去数人头」其中之一。
    // 只有迪兹活着但没人管后队，那叫「她运气好」，不叫「全队撤出来了」。
    if (f.dizzy_saved && !f.dizzy_lost && (f.covered_evac || f.counted_survivors)) hit.push('squad');
    return hit;
  },
  penalties(s) {
    const out = [];
    if (s.flags.dizzy_lost) out.push({ label: '把迪兹留在墙头', points: -2000 });
    if (s.flags.lost_outer) out.push({ label: '放弃了外墙', points: -1000 });
    return out;
  },
  endings: [
    {
      when: (f) => f.brain_killed && f.dizzy_saved && !f.lost_outer,
      title: '会算数的人',
      text: '虫潮停了。不是撤退，是全部停下，像被按了暂停。\n\n'
        + '然后它们开始互相撕咬。\n\n'
        + '迪兹坐在舱里，腿上的伤口包得很厚，她在数活着的人，'
        + '数完说了一句：「比我想的多。」',
    },
    {
      when: (f) => f.brain_killed,
      title: '脑',
      text: '你在轨道上往下看。那颗小行星还在动，但动得没有节奏了。\n\n'
        + '卡门从驾驶舱回头看了一眼，说：「你们知道刚才发生了什么吗？」\n\n'
        + '没有人回答。因为所有人都在想同一件事：'
        + '它们本来是有一个脑子的。',
    },
    {
      when: (f) => f.dizzy_lost,
      title: '位置好',
      text: '撤离艇升起来的时候，墙头已经没人了。\n\n'
        + '你最后看见她的时候，她还站着，还在开枪，弹匣里只剩一发。\n\n'
        + '她说「我这位置好」的时候，语气很轻松。'
        + '轻松得像在说别人的事。',
    },
    {
      when: () => true,
      title: '撤退',
      text: '你活着上了艇。这是这个前哨站三个月来第一次有人活着上艇。\n\n'
        + '手环上显示：奖励点 +3000。\n\n'
        + '下面还有一行字：「本世界不计入恐怖片序列。计入战争序列。」',
    },
  ],
});

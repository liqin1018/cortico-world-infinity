/**
 * 从 tools.js 生成 describe.json。
 * 手写两份迟早对不上——工具一改，describe 就过期，市场卡片会显示旧描述。
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TOOL_SPECS, TOOL_SUMMARIES, EVENT_DESCRIPTIONS } from '../src/tools.js';

const out = {
  tools: TOOL_SPECS.map((s) => ({
    name: s.name,
    description: s.description,
    parameters: s.parameters,
    tags: s.tags,
    summary: TOOL_SUMMARIES[s.name],
  })),
  events: EVENT_DESCRIPTIONS.map((e) => ({
    type: e.type,
    description: e.description,
    trigger: e.trigger ?? 'debounce',
  })),
};

const file = fileURLToPath(new URL('../describe.json', import.meta.url));
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log('describe.json 写好了：' + out.tools.length + ' 个工具，' + out.events.length + ' 个事件');

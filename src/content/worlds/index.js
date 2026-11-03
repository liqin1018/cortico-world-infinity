/**
 * 副本总目录。新增一个副本只需要在这里加一行，
 * 别的地方（列表、面板、自动挑副本）都会自动带上。
 *
 * 顺序 = 难度顺序。自动推进挑副本时按这个顺序取「第一个没通关的」，
 * 所以排在前面的必须先打，否则新人会被直接扔进 A 级。
 */
import { RE2 } from './re2.js';
import { JP1 } from './jp1.js';
import { A2 } from './a2.js';
import { JUON } from './juon.js';
import { NOES } from './noes.js';
import { MUMMY } from './mummy.js';
import { LOTR } from './lotr.js';
import { SST } from './sst.js';

export const MORE_WORLDS = [RE2, JP1, A2, JUON, NOES, MUMMY, LOTR, SST];

export { RE2, JP1, A2, JUON, NOES, MUMMY, LOTR, SST };

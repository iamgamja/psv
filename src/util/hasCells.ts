import type { IDX0 } from '../types/base'
import type { Cell } from '../types/Cell'
import type { POS } from '../types/Rule'

export function hasPOS(group: POS[], target: POS) {
  return group.some((pos) => pos[0] === target[0] && pos[1] === target[1])
}

export function hasCells(group: POS[], ...targets: Cell[]) {
  return targets.every(cell => {
    const r = cell.r - 1 as IDX0
    const c = cell.c - 1 as IDX0
    return hasPOS(group, [r, c])
  })
}
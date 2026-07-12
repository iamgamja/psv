import { type Cell } from '../types/Cell'
import { type Group, IDX0, type POS, POSSchema, type TwoGroup, type TwoGroups } from '../types/base'

import { type AdjacentMode, DeltaMap } from './create_adjacent_group'

export function cell2POS(cell: Cell): POS {
  const r = (cell.r - 1) as IDX0
  const c = (cell.c - 1) as IDX0
  return [r, c]
}

export function POS2number(pos: POS): number {
  return pos[0] * 9 + pos[1]
}

export function number2POS(n: number): POS {
  return POSSchema.parse([Math.floor(n / 9), n % 9])
}

export function TwoGroup2number([pos1, pos2]: TwoGroup): number {
  return POS2number(pos1) * 81 + POS2number(pos2)
}

export function TwoGroupComb2number(two_group: TwoGroup): number {
  const [n1, n2] = two_group.map(POS2number).sort((a, b) => a - b)
  return n1 * 81 + n2
}

export function number2TwoGroup(n: number): TwoGroup {
  return [Math.floor(n / 81), n % 81].map(number2POS) as TwoGroup
}

export function hasPOSs(group: Group, ...targets: Group) {
  return targets.every((target) => group.some((pos) => pos[0] === target[0] && pos[1] === target[1]))
}

export function hasCells(group: Group, ...targets: Cell[]) {
  return targets.every((cell) => hasPOSs(group, cell2POS(cell)))
}

/** 각 TwoGroup을 순서 없는 그룹으로 간주한다. */
export function differenceOf2Groups(groups1: TwoGroups, groups2: TwoGroups) {
  const set = new Set(groups1.map(TwoGroupComb2number))
  groups2.map(TwoGroupComb2number).forEach((n) => set.delete(n))
  return Array.from(set).map(number2TwoGroup)
}

export function isAdjacent([r1, c1]: POS, [r2, c2]: POS, adjacent_mode: AdjacentMode) {
  for (const [dr, dc] of DeltaMap[adjacent_mode]) {
    if (r1 + dr === r2 && c1 + dc === c2) return true
  }
  return false
}

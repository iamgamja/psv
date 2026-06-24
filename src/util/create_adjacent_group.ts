import { IDX0 } from '../types/base'
import type { Group, Groups, POS, TwoGroup, TwoGroups } from '../types/Rule'

type AdjacentMode = 'wasd' | 'king'

const DeltaMap: Record<AdjacentMode, [number, number][]> = {
  wasd: [
    [-1, +0],
    [+0, -1],
    [+0, +1],
    [+1, +0],
  ],
  king: [
    [-1, -1],
    [-1, +0],
    [-1, +1],
    [0, -1],
    [0, +1],
    [+1, -1],
    [+1, +0],
    [+1, +1],
  ],
}

function create_adjacent_twogroups(adjacent_mode: AdjacentMode): TwoGroups {
  const res = new Set<TwoGroup>()

  for (const r1 of IDX0) {
    for (const c1 of IDX0) {
      for (const [dr, dc] of DeltaMap[adjacent_mode]) {
        const r2 = r1 + dr
        const c2 = c1 + dc
        if (!(0 <= r2 && r2 < 9 && 0 <= c2 && c2 < 9)) continue
        res.add([
          [r1, c1],
          [r2, c2],
        ] as TwoGroup)
      }
    }
  }

  return Array.from(res.values())
}

export const GROUPS_ADJACENT: Record<AdjacentMode, Groups> = {
  wasd: create_adjacent_twogroups('wasd'),
  king: create_adjacent_twogroups('king'),
}

export function create_adjacent_group_of_pos(pos: POS, adjacent_mode: AdjacentMode): Group {
  const res = new Set<POS>()

  const [r1, c1] = pos

  for (const [dr, dc] of DeltaMap[adjacent_mode]) {
    const r2 = r1 + dr
    const c2 = c1 + dc
    if (!(0 <= r2 && r2 < 9 && 0 <= c2 && c2 < 9)) continue
    res.add([r2, c2] as POS)
  }

  return Array.from(res.values())
}

import { type Group, type Groups, type POS, type TwoGroup, type TwoGroups } from '../types/base'
import { IDX0, POSSchema } from '../types/base'

export type AdjacentMode = 'wasd' | 'king'

export const DeltaMap: Record<AdjacentMode, [number, number][]> = {
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
      const pos1 = POSSchema.parse([r1, c1])
      for (const [dr, dc] of DeltaMap[adjacent_mode]) {
        const r2 = r1 + dr
        const c2 = c1 + dc

        const pos2 = POSSchema.safeParse([r2, c2])
        if (!pos2.success) continue

        res.add([pos1, pos2.data])
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

    const pos2 = POSSchema.safeParse([r2, c2])
    if (pos2.success) res.add(pos2.data)
  }

  return Array.from(res.values())
}

import { IDX0 } from '../types/base'
import type { POS } from '../types/Rule'

type AdjacentMode = 'wasd' | 'king'

const DeltaMap: Record<AdjacentMode, [number, number][]> = {
  wasd: [
    [0, 1],
    [1, 0],
  ],
  king: [
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
}

export function* generator_adjacent_pos(adjacent_mode: AdjacentMode) {
  for (const r1 of IDX0) {
    for (const c1 of IDX0) {
      for (const [dr, dc] of DeltaMap[adjacent_mode]) {
        const r2 = r1 + dr
        const c2 = c1 + dc
        if (!(0 <= r2 && r2 < 9 && 0 <= c2 && c2 < 9)) continue
        yield [
          [r1, c1],
          [r2, c2],
        ] as [POS, POS]
      }
    }
  }
}

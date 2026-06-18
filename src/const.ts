import { IDX0, type V } from './types/base'
import type { Groups } from './types/Rule'

export const SIZE_CELL = 32

export const color_map: Record<V, string> = {
  1: 'rgba(166, 219, 87, 0.3)',
  2: 'rgba(221, 103, 234, 0.3)',
  3: 'rgba(219, 132, 26, 0.3)',
  4: 'rgba(239, 27, 23, 0.3)',
  5: 'rgba(249, 227, 29, 0.3)',
  6: 'rgba(28, 134, 239, 0.3)',
  7: 'rgba(191, 191, 191, 0.3)',
  8: 'rgba(127, 127, 127, 0.3)',
  9: 'rgba(63, 63, 63, 0.3)',
}

export const GROUPS_R: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_R[r].push([r, c])

export const GROUPS_C: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_C[c].push([r, c])

export const GROUPS_B: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_B[Math.floor(r / 3) * 3 + Math.floor(c / 3)].push([r, c])

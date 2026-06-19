import { IDX0 } from '../types/base'
import type { Groups } from '../types/Rule'

export const SIZE_CELL = 32

export const GROUPS_R: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_R[r].push([r, c])

export const GROUPS_C: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_C[c].push([r, c])

export const GROUPS_B: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_B[Math.floor(r / 3) * 3 + Math.floor(c / 3)].push([r, c])

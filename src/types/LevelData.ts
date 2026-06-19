import type { V } from './base'
import type { Rule } from './Rule'

export type LevelData = {
  id: string
  difficulty: number

  board: (V | 0)[][]
  rules: Rule[]

  published_at?: string
}

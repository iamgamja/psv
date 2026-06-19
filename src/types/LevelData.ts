import type { V } from './base'
import type { Rule, UnknownRule } from './Rule'

export type LevelData = {
  id: string
  difficulty: number

  board: (V | 0)[][]
  rules: (Rule | UnknownRule)[]

  published_at?: string
}

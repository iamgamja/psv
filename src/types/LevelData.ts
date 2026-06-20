import { z } from 'zod'
import { RuleSchema, UnknownRuleSchema } from './Rule'
import { V } from './base'

const VSchema = z.union(V.map((v) => z.literal(v)))

export const LevelDataSchema = z.object({
  id: z.string(),
  difficulty: z.number(),

  board: z.array(z.array(z.union([VSchema, z.literal(0)])).length(9)).length(9),
  rules: z.array(z.union([RuleSchema, UnknownRuleSchema])),

  published_at: z.string().optional(),
})
export type LevelData = z.infer<typeof LevelDataSchema>

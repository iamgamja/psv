/** @todo */
import { z } from 'zod'
import { IDX0 } from './base'

const IDX0Schema = z.union(IDX0.map((i) => z.literal(i)))

export const Rule_ID = ['[R]', '[C]', '[B]', '[SG]'] as const
export const RuleIdSchema = z.enum(Rule_ID)
export type Rule_ID = z.infer<typeof RuleIdSchema>

export const POSSchema = z.tuple([IDX0Schema, IDX0Schema])
export type POS = z.infer<typeof POSSchema>

export const GroupsSchema = z.array(z.array(POSSchema))
export type Groups = z.infer<typeof GroupsSchema>

const RenderStateMap = {
  '[R]': z.null(),
  '[C]': z.null(),
  '[B]': z.null(),
  '[SG]': z.object({
    regions: GroupsSchema,
  }),
} as const

export const RuleSchema = z.discriminatedUnion('id', [
  z.object({
    id: z.literal('[R]'),
  }),
  z.object({
    id: z.literal('[C]'),
  }),
  z.object({
    id: z.literal('[B]'),
  }),
  z.object({
    id: z.literal('[SG]'),
    render_state: RenderStateMap['[SG]'],
  }),
])
export type Rule = z.infer<typeof RuleSchema>

export type RuleObject<T extends Rule_ID> = Rule & { id: T }

export const UnknownRuleSchema = z.object({
  id: z.string().refine((id) => !Rule_ID.includes(id as Rule_ID), {
    message: 'Unknown rule id',
  }),
})
export type UnknownRule = z.infer<typeof UnknownRuleSchema>

export function isKnown(rule: Rule | UnknownRule): rule is Rule {
  return RuleSchema.safeParse(rule).success
}

/** @todo */
import { z } from 'zod'
import { IDX0 } from './base'

const IDX0Schema = z.union(IDX0.map((i) => z.literal(i)))

export const Rule_ID = ['[Sudoku]', '[R]', '[C]', '[B]', '[SG]', '[DT]', '[LK]', "[LK']", '[MT]', '[MR]', '[QD]', '[TP]', '[LO]', "[LO']"] as const
export const RuleIdSchema = z.enum(Rule_ID)
export type Rule_ID = z.infer<typeof RuleIdSchema>

export const POSSchema = z.tuple([IDX0Schema, IDX0Schema])
export type POS = z.infer<typeof POSSchema>

export const GroupSchema = z.array(POSSchema)
export type Group = z.infer<typeof GroupSchema>

export const GroupsSchema = z.array(GroupSchema)
export type Groups = z.infer<typeof GroupsSchema>

export const TwoGroupSchema = GroupSchema.length(2)
export type TwoGroup = z.infer<typeof TwoGroupSchema>

export const TwoGroupsSchema = z.array(TwoGroupSchema)
export type TwoGroups = z.infer<typeof TwoGroupsSchema>

type ZodRuleObject<K extends string = string> = z.ZodObject<{
  id: z.ZodLiteral<K>
}>

const RuleObjectMap = {
  '[Sudoku]': z.object({
    id: z.literal('[Sudoku]'),
  }),
  '[R]': z.object({
    id: z.literal('[R]'),
  }),
  '[C]': z.object({
    id: z.literal('[C]'),
  }),
  '[B]': z.object({
    id: z.literal('[B]'),
  }),
  '[SG]': z.object({
    id: z.literal('[SG]'),
    render_state: z.object({ regions: GroupsSchema }),
  }),
  '[DT]': z.object({
    id: z.literal('[DT]'),
  }),
  '[LK]': z.object({
    id: z.literal('[LK]'),
    render_state: z.object({ edges: TwoGroupsSchema }),
  }),
  "[LK']": z.object({
    id: z.literal("[LK']"),
    render_state: z.object({ edges: TwoGroupsSchema }),
  }),
  '[MT]': z.object({
    id: z.literal('[MT]'),
    render_state: z.object({ diamond_cells: GroupSchema }),
  }),
  '[MR]': z.object({
    id: z.literal('[MR]'),
    render_state: z.object({ metros: GroupsSchema }),
  }),
  '[QD]': z.object({
    id: z.literal('[QD]'),
  }),
  '[TP]': z.object({
    id: z.literal('[TP]'),
  }),
  '[LO]': z.object({
    id: z.literal('[LO]'),
    render_state: z.object({ cells: GroupSchema }),
  }),
  "[LO']": z.object({
    id: z.literal("[LO']"),
    render_state: z.object({ cells: GroupSchema }),
  }),
} satisfies {
  [K in Rule_ID]: ZodRuleObject<K>
}

export const RuleSchema = (function discriminatedUnionHelper<const R extends ZodRuleObject>(map: Record<string, R>) {
  return z.discriminatedUnion('id', Object.values(map) as [R, ...R[]])
})(RuleObjectMap)
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

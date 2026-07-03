/**
 * @todo
 *
 * - 보드 바깥에 힌트: GROUPS_R / GROUPS_C
 * 퀀텀 QT
 * 레인지 RG
 * 레인지' RG'
 * 시퀀스 SQ
 * 프로덕트 PD
 */
import { z } from 'zod'
import { GroupSchema, GroupsSchema, IDX0Schema, POSSchema, TwoGroupsSchema, VSchema } from './base'

export const Rule_ID = [
  '[Sudoku]',
  '[R]',
  '[C]',
  '[B]',
  '[SG]',
  "[SG']",
  '[DT]',
  '[LK]',
  "[LK']",
  '[MT]',
  '[MR]',
  '[QD]',
  "[QD']",
  '[TP]',
  '[LO]',
  "[LO']",
  '[BP]',
  '[PO]',
  "[R']",
  '[PR]',
  "[PR']",
  '[RT]',
  "[RT']",
  '[PA]',
  '[VT]',
  '[EF]',
  '[TM]',
  '[AQ]',
  '[RF]',
  '[SR]',
  '[IV]',
  '[BD]',
  '[TR]',
  "[TR']",
  '[ST]',
  '[ES]',
  '[EP]',
] as const
export const RuleIdSchema = z.enum(Rule_ID)
export type Rule_ID = z.infer<typeof RuleIdSchema>

export const DirMap = {
  L: [0, -1],
  R: [0, +1],
  U: [-1, 0],
  D: [+1, 0],
} as const
const LRUDSchema = z.enum(Object.keys(DirMap) as [keyof typeof DirMap, ...(keyof typeof DirMap)[]])

const RCSchema = z.enum(['ROW', 'COL'])
const StencilValueKeySchema = z.string().refine((key) => {
  const [r, c, ...rest] = key.split(',').map(Number)
  return rest.length === 0 && Number.isInteger(r) && Number.isInteger(c) && POSSchema.safeParse([r, c]).success
})
const StencilPieceSchema = z
  .object({
    cells: GroupSchema,
    values: z.record(StencilValueKeySchema, VSchema),
  })
  .refine(({ cells, values }) => Object.keys(values).length > 0 && Object.keys(values).every((key) => cells.some((pos) => key === pos.join(','))))

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
  "[SG']": z.object({
    id: z.literal("[SG']"),
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
  "[QD']": z.object({
    id: z.literal("[QD']"),
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
  '[BP]': z.object({
    id: z.literal('[BP]'),
  }),
  '[PO]': z.object({
    id: z.literal('[PO]'),
    render_state: z.object({ edges: TwoGroupsSchema }),
  }),
  "[R']": z.object({
    id: z.literal("[R']"),
  }),
  '[PR]': z.object({
    id: z.literal('[PR]'),
    render_state: z.object({
      edges: z.array(z.tuple([IDX0Schema, IDX0Schema, IDX0Schema, IDX0Schema, z.boolean()])),
    }),
  }),
  "[PR']": z.object({
    id: z.literal("[PR']"),
    render_state: z.object({
      triplets: z.array(z.tuple([IDX0Schema, IDX0Schema, IDX0Schema, IDX0Schema, IDX0Schema, IDX0Schema, z.boolean()])),
    }),
  }),
  '[RT]': z.object({
    id: z.literal('[RT]'),
    render_state: z.object({
      cells: z.array(z.tuple([IDX0Schema, IDX0Schema, z.number()])),
    }),
  }),
  "[RT']": z.object({
    id: z.literal("[RT']"),
    render_state: z.object({
      cells: z.array(z.tuple([IDX0Schema, IDX0Schema, z.number()])),
    }),
  }),
  '[PA]': z.object({
    id: z.literal('[PA]'),
    render_state: z.object({ dominoes: TwoGroupsSchema }),
  }),
  '[VT]': z.object({
    id: z.literal('[VT]'),
    render_state: z.object({ arrows: z.array(z.tuple([IDX0Schema, IDX0Schema, LRUDSchema])) }),
  }),
  '[EF]': z.object({
    id: z.literal('[EF]'),
    render_state: z.object({ marked_cells: GroupSchema }),
  }),
  '[TM]': z.object({
    id: z.literal('[TM]'),
    render_state: z.object({
      regions: z.array(
        z.object({
          cells: GroupSchema,
          color: z.enum(['red', 'green', 'blue']),
        }),
      ),
    }),
  }),
  '[AQ]': z.object({
    id: z.literal('[AQ]'),
    render_state: z.object({ regions: GroupsSchema }),
  }),
  '[RF]': z.object({
    id: z.literal('[RF]'),
    render_state: z.object({ lines: z.array(z.tuple([RCSchema, IDX0Schema])) }),
  }),
  '[SR]': z.object({
    id: z.literal('[SR]'),
    render_state: z.object({ streams: GroupsSchema }),
  }),
  '[IV]': z.object({
    id: z.literal('[IV]'),
    render_state: z.object({ lines: GroupsSchema }),
  }),
  '[BD]': z.object({
    id: z.literal('[BD]'),
    render_state: z.object({ start_rows: z.array(IDX0Schema) }),
  }),
  '[TR]': z.object({
    id: z.literal('[TR]'),
    render_state: z.object({
      start: POSSchema,
      end: POSSchema,
    }),
  }),
  "[TR']": z.object({
    id: z.literal("[TR']"),
    render_state: z.object({
      start: POSSchema,
      end: POSSchema,
    }),
  }),
  '[ST]': z.object({
    id: z.literal('[ST]'),
    render_state: z.object({ pieces: z.array(StencilPieceSchema) }),
  }),
  '[ES]': z.object({
    id: z.literal('[ES]'),
  }),
  '[EP]': z.object({
    id: z.literal('[EP]'),
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
  id: z.string().refine((id) => !Rule_ID.includes(id as Rule_ID)),
})
export type UnknownRule = z.infer<typeof UnknownRuleSchema>

export function isKnown(rule: Rule | UnknownRule): rule is Rule {
  return RuleSchema.safeParse(rule).success
}

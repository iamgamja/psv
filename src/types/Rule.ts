import { z } from 'zod'

import { GroupSchema, GroupsSchema, IDX0Schema, POSSchema, TwoGroupsSchema, VSchema } from './base'

export const Rule_ID = [
  // basic
  '[Sudoku]',
  '[R]',
  "[R']",
  '[C]',
  '[B]',
  "[B']",
  '[SG]',
  "[SG']",

  // adjacent
  '[DT]',
  '[LK]',
  "[LK']",
  '[PO]',
  '[LO]',
  "[LO']",
  '[TP]',
  '[QD]',
  "[QD']",

  // group
  '[TM]',
  '[AQ]',
  '[PA]',

  // line
  '[MR]',
  '[SR]',
  '[IV]',

  // path
  '[TR]',
  "[TR']",
  '[BD]',

  // distance
  '[VT]',
  "[VT']",
  '[RT]',
  "[RT']",
  '[RF]',

  // count
  '[MT]',
  '[BP]',
  '[EF]',

  // connected component
  '[ES]',
  '[EP]',
  "[EP']",
  '[TS]',

  // math
  '[PR]',
  "[PR']",

  // side
  '[QT]',
  '[RG]',
  "[RG']",
  '[PD]',
  '[SQ]',
  "[SQ']",

  // etc
  '[ST]',
] as const
export const RuleIdSchema = z.enum(Rule_ID)
export type Rule_ID = z.infer<typeof RuleIdSchema>

export const DirMap = {
  L: [0, -1],
  R: [0, +1],
  U: [-1, 0],
  D: [+1, 0],
} as const
const LRUDSchema = z.enum(['L', 'R', 'U', 'D'])

const RCSchema = z.enum(['ROW', 'COL'])
export type RC = z.infer<typeof RCSchema>
const RCRCSchema = z.enum(['ROW', 'ROW_LEFT', 'COL', 'COL_TOP'])
export type RCRC = z.infer<typeof RCRCSchema>

const RangeDistanceSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7), z.literal(8)])
const RangeLetterSchema = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
export type RangeLetter = z.infer<typeof RangeLetterSchema>

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
  "[R']": z.object({
    id: z.literal("[R']"),
  }),
  '[C]': z.object({
    id: z.literal('[C]'),
  }),
  '[B]': z.object({
    id: z.literal('[B]'),
  }),
  "[B']": z.object({
    id: z.literal("[B']"),
    render_state: z.object({ hints: z.array(z.tuple([z.number(), z.number()])).length(9) }),
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
  '[PO]': z.object({
    id: z.literal('[PO]'),
    render_state: z.object({ edges: TwoGroupsSchema }),
  }),
  '[LO]': z.object({
    id: z.literal('[LO]'),
    render_state: z.object({ cells: GroupSchema }),
  }),
  "[LO']": z.object({
    id: z.literal("[LO']"),
    render_state: z.object({ cells: GroupSchema }),
  }),
  '[TP]': z.object({
    id: z.literal('[TP]'),
  }),
  '[QD]': z.object({
    id: z.literal('[QD]'),
  }),
  "[QD']": z.object({
    id: z.literal("[QD']"),
  }),

  '[TM]': z.object({
    id: z.literal('[TM]'),
    render_state: z.object({ regions: z.array(z.object({ cells: GroupSchema, color: z.enum(['red', 'green', 'blue']) })) }),
  }),
  '[AQ]': z.object({
    id: z.literal('[AQ]'),
    render_state: z.object({ regions: GroupsSchema }),
  }),
  '[PA]': z.object({
    id: z.literal('[PA]'),
    render_state: z.object({ dominoes: TwoGroupsSchema }),
  }),

  '[MR]': z.object({
    id: z.literal('[MR]'),
    render_state: z.object({ metros: GroupsSchema }),
  }),
  '[SR]': z.object({
    id: z.literal('[SR]'),
    render_state: z.object({ streams: GroupsSchema }),
  }),
  '[IV]': z.object({
    id: z.literal('[IV]'),
    render_state: z.object({ lines: GroupsSchema }),
  }),

  '[TR]': z.object({
    id: z.literal('[TR]'),
    render_state: z.object({ start: POSSchema, end: POSSchema }),
  }),
  "[TR']": z.object({
    id: z.literal("[TR']"),
    render_state: z.object({ start: POSSchema, end: POSSchema }),
  }),
  '[BD]': z.object({
    id: z.literal('[BD]'),
    render_state: z.object({ start_rows: z.array(IDX0Schema) }),
  }),

  '[VT]': z.object({
    id: z.literal('[VT]'),
    render_state: z.object({ arrows: z.array(z.tuple([IDX0Schema, IDX0Schema, LRUDSchema])) }),
  }),
  "[VT']": z.object({
    id: z.literal("[VT']"),
    render_state: z.object({ arrows: z.array(z.tuple([IDX0Schema, IDX0Schema, LRUDSchema])) }),
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
  '[RF]': z.object({
    id: z.literal('[RF]'),
    render_state: z.object({ lines: z.array(z.tuple([RCSchema, IDX0Schema])) }),
  }),

  '[MT]': z.object({
    id: z.literal('[MT]'),
    render_state: z.object({ diamond_cells: GroupSchema }),
  }),
  '[BP]': z.object({
    id: z.literal('[BP]'),
  }),
  '[EF]': z.object({
    id: z.literal('[EF]'),
    render_state: z.object({ marked_cells: GroupSchema }),
  }),

  '[ES]': z.object({
    id: z.literal('[ES]'),
  }),
  '[EP]': z.object({
    id: z.literal('[EP]'),
  }),
  "[EP']": z.object({
    id: z.literal("[EP']"),
  }),
  '[TS]': z.object({
    id: z.literal('[TS]'),
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

  '[QT]': z.object({
    id: z.literal('[QT]'),
    render_state: z.object({ side_hints: z.array(z.tuple([RCSchema, IDX0Schema, z.tuple([VSchema, VSchema])])) }),
  }),
  '[RG]': z.object({
    id: z.literal('[RG]'),
    render_state: z.object({ side_hints: z.array(z.tuple([RCSchema, IDX0Schema, z.array(RangeDistanceSchema)])) }),
  }),
  "[RG']": z.object({
    id: z.literal("[RG']"),
    render_state: z.object({ side_hints: z.array(z.tuple([RCSchema, IDX0Schema, RangeLetterSchema])) }),
  }),
  '[PD]': z.object({
    id: z.literal('[PD]'),
    render_state: z.object({ side_hints: z.array(z.tuple([RCRCSchema, IDX0Schema, z.number()])) }),
  }),
  '[SQ]': z.object({
    id: z.literal('[SQ]'),
    render_state: z.object({ side_hints: z.array(z.tuple([RCSchema, IDX0Schema, z.array(VSchema)])) }),
  }),
  "[SQ']": z.object({
    id: z.literal("[SQ']"),
    render_state: z.object({ side_hints: z.array(z.tuple([RCSchema, IDX0Schema, z.array(z.enum(['L', 'M', 'H']))])) }),
  }),

  '[ST]': z.object({
    id: z.literal('[ST]'),
    render_state: z.object({ pieces: z.array(StencilPieceSchema) }),
  }),
} satisfies {
  [K in Rule_ID]: ZodRuleObject<K>
}

export const RuleSchema = (function discriminatedUnionHelper<const R extends ZodRuleObject>(map: Record<string, R>) {
  return z.discriminatedUnion('id', Object.values(map) as [R, ...R[]])
})(RuleObjectMap)
export type Rule = z.infer<typeof RuleSchema>

export const UnknownRuleSchema = z.object({
  id: z.string().refine((id) => !Rule_ID.includes(id as Rule_ID)),
})
export type UnknownRule = z.infer<typeof UnknownRuleSchema>

export function isKnown(rule: Rule | UnknownRule): rule is Rule {
  return RuleSchema.safeParse(rule).success
}

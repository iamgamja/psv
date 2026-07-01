import { z } from 'zod'

const literalUnion = <T extends readonly number[]>(values: T) => z.union(values.map((v) => z.literal(v)) as [z.ZodLiteral<T[number]>, ...z.ZodLiteral<T[number]>[]])

export const V = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const VSchema = literalUnion(V)
export type V = z.infer<typeof VSchema>

export const IDX = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const IDXSchema = literalUnion(IDX)
export type IDX = z.infer<typeof IDXSchema>

/** 0-index version of `IDX` */
export const IDX0 = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
export const IDX0Schema = literalUnion(IDX0)
export type IDX0 = z.infer<typeof IDX0Schema>

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

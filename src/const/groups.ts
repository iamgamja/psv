import { z } from 'zod'
import { IDX0 } from '../types/base'
import type { Group, Groups, Rule, Rule_ID, RuleObject, TwoGroups } from '../types/Rule'
import { generator_adjacent_pos } from '../util/generator_adjacent_pos'

const GROUPS_R: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_R[r].push([r, c])

const GROUPS_C: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_C[c].push([r, c])

const GROUPS_B: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_B[Math.floor(r / 3) * 3 + Math.floor(c / 3)].push([r, c])

const GROUPS_DT: TwoGroups = Array.from(generator_adjacent_pos('king'))

export const GROUPS_QD: Groups = []
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    GROUPS_QD.push([
      [r, c],
      [r, c + 1],
      [r + 1, c],
      [r + 1, c + 1],
    ] as Group)
  }
}

export const GROUPS_TP: Groups = []
for (let r = 0; r < 7; r++) {
  for (let c = 0; c < 7; c++) {
    GROUPS_TP.push([
      [r, c],
      [r + 1, c + 1],
      [r + 2, c + 2],
    ] as Group)
    GROUPS_TP.push([
      [r, c + 2],
      [r + 1, c + 1],
      [r + 2, c],
    ] as Group)
  }
}

const Rule_ID_Has_DisJointGroup = ['[R]', '[C]', '[B]', '[SG]', '[DT]', '[LK]', "[LK']", '[MR]'] as const satisfies Rule_ID[]
const RuleIdHasDisJointGroupSchema = z.enum(Rule_ID_Has_DisJointGroup)
type Rule_ID_Has_DisJointGroup = z.infer<typeof RuleIdHasDisJointGroupSchema>

export function hasDisJointGroup(rule: Rule): rule is RuleObject<Rule_ID_Has_DisJointGroup> {
  return RuleIdHasDisJointGroupSchema.safeParse(rule.id).success
}

export function getDisJointGroups(rule: RuleObject<Rule_ID_Has_DisJointGroup>): Groups {
  switch (rule.id) {
    case '[R]':
      return GROUPS_R
    case '[C]':
      return GROUPS_C
    case '[B]':
      return GROUPS_B
    case '[DT]':
      return GROUPS_DT
    case '[SG]':
      return rule.render_state.regions
    case '[LK]':
    case "[LK']":
      return rule.render_state.edges
    case '[MR]':
      return rule.render_state.metros
  }
}

import { z } from 'zod'
import { IDX0 } from '../types/base'
import type { Groups, Rule, Rule_ID, RuleObject } from '../types/Rule'
import { generator_adjacent_pos } from '../util/generator_adjacent_pos'

const GROUPS_R: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_R[r].push([r, c])

const GROUPS_C: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_C[c].push([r, c])

const GROUPS_B: Groups = Array.from({ length: 9 }, () => [])
for (const r of IDX0) for (const c of IDX0) GROUPS_B[Math.floor(r / 3) * 3 + Math.floor(c / 3)].push([r, c])

const GROUPS_DT: Groups = Array.from(generator_adjacent_pos('king'))

const Rule_ID_Has_Group = ['[R]', '[C]', '[B]', '[SG]', '[DT]'] as const satisfies Rule_ID[]
const RuleIdHasGroupSchema = z.enum(Rule_ID_Has_Group)
type Rule_ID_Has_Group = z.infer<typeof RuleIdHasGroupSchema>

export function hasGroup(rule: Rule): rule is RuleObject<Rule_ID_Has_Group> {
  return RuleIdHasGroupSchema.safeParse(rule.id).success
}

export function getGroups(rule: RuleObject<Rule_ID_Has_Group>): Groups {
  switch (rule.id) {
    case '[R]':
      return GROUPS_R
    case '[C]':
      return GROUPS_C
    case '[B]':
      return GROUPS_B
    case '[SG]':
      return rule.render_state.regions
    case '[DT]':
      return GROUPS_DT
  }
}

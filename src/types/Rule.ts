/** @todo */

import type { IDX0 } from './base'

export const Rule_ID = ['[R]', '[C]', '[B]', '[SG]'] as const
export type Rule_ID = (typeof Rule_ID)[number]

export type POS = [IDX0, IDX0]

export type Groups = POS[][]

// export type Side = 'left' | 'right' | 'top' | 'bottom'
// export type PositionExtended = POS | [Side, IDX0]

// export type Direction = 'ROW' | 'COL'
// export type Direction_4 = 'ROW_LEFT' | 'ROW' | 'COL_TOP' | 'COL'

type RenderStateMap = {
  '[R]': null
  '[C]': null
  '[B]': null
  '[SG]': { regions: Groups }
}

export type RuleObject<K extends Rule_ID> = { id: K } & (RenderStateMap[K] extends null ? {} : { render_state: RenderStateMap[K] })

export type Rule = {
  [K in Rule_ID]: RuleObject<K>
}[Rule_ID]

export type UnknownRule = {
  id: Exclude<string, Rule_ID>
}

export function isKnown(rule: Rule | UnknownRule): rule is Rule {
  return Rule_ID.includes(rule.id as Rule_ID)
}

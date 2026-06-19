import { GROUPS_B, GROUPS_C, GROUPS_R } from '../const/const'
import { V } from '../types/base'
import type { DigitArr } from '../types/Board'
import type { Groups, Rule, Rule_ID, RuleObject } from '../types/Rule'

type HasErrorChecker<T extends Rule_ID> = (digit_arr: DigitArr, rule: RuleObject<T>) => boolean
type HasErrorCheckers = {
  [K in Rule_ID]: HasErrorChecker<K>
}

function has_dup(digit_arr: DigitArr, groups: Groups): boolean {
  for (const group of groups) {
    const visit = new Set<V>()

    for (const pos of group) {
      const [r, c] = pos
      const digit = digit_arr[r][c]

      if (!digit) continue

      if (visit.has(digit)) return true
      visit.add(digit)
    }
  }

  return false
}

const HasErrorCheckers: HasErrorCheckers = {
  '[R]': (digit_arr) => has_dup(digit_arr, GROUPS_R),
  '[C]': (digit_arr) => has_dup(digit_arr, GROUPS_C),
  '[B]': (digit_arr) => has_dup(digit_arr, GROUPS_B),
  '[SG]': (digit_arr, rule) => has_dup(digit_arr, rule.render_state.regions),
}

export function has_error(digit_arr: DigitArr, rules: Rule[]): boolean {
  for (const rule of rules) {
    // @ts-ignore
    if (HasErrorCheckers[rule.id](digit_arr, rule)) return true
  }
  return false
}

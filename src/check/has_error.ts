import { GROUPS_B, GROUPS_C, GROUPS_R } from '../const/const'
import { V } from '../types/base'
import type { Groups, Rule } from '../types/Rule'

function has_dup(digit_arr: (V | undefined)[][], groups: Groups): boolean {
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

export function has_error(digit_arr: (V | undefined)[][], rules: Rule[]): boolean {
  for (const rule of rules)
    switch (rule.id) {
      case '[R]': {
        if (has_dup(digit_arr, GROUPS_R)) return true
        break
      }
      case '[C]': {
        if (has_dup(digit_arr, GROUPS_C)) return true
        break
      }
      case '[B]': {
        if (has_dup(digit_arr, GROUPS_B)) return true
        break
      }
      case '[SG]': {
        if (has_dup(digit_arr, rule.render_state.regions)) return true
        break
      }
      default: {
        // ignore unknown rule
      }
    }

  return false
}

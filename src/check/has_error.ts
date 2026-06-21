import { getGroups } from '../const/groups'
import type { V } from '../types/base'
import type { DigitArr } from '../types/Board'
import { isKnown, type Groups, type Rule } from '../types/Rule'

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

function has_error_rule(digit_arr: DigitArr, rule: Rule): boolean {
  switch (rule.id) {
    case '[Sudoku]':
      return false
    case '[R]':
      return has_dup(digit_arr, getGroups(rule))
    case '[C]':
      return has_dup(digit_arr, getGroups(rule))
    case '[B]':
      return has_dup(digit_arr, getGroups(rule))
    case '[SG]':
      return has_dup(digit_arr, getGroups(rule))
  }
}

export function has_error(digit_arr: DigitArr, rules: Rule[]): boolean {
  for (const rule of rules.filter(isKnown)) {
    if (has_error_rule(digit_arr, rule)) return true
  }
  return false
}

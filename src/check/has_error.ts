import { getGroups } from '../const/groups'
import type { V } from '../types/base'
import type { DigitArr } from '../types/Board'
import { isKnown, type Groups, type Rule, type TwoGroups } from '../types/Rule'
import { generator_adjacent_pos } from '../util/generator_adjacent_pos'
import { differenceOf2Groups, POS2Digit } from '../util/groups'

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

/** @returns 모든 길이 2의 그룹이 f를 만족하는가? */
function has_2groups(digit_arr: DigitArr, groups: TwoGroups, f: (d1: V, d2: V) => boolean): boolean {
  for (const [d1, d2] of groups.map((group) => group.map((pos) => POS2Digit(digit_arr, pos)))) {
    if (d1 && d2 && !f(d1, d2)) return true
  }

  return false
}

function has_error_rule(digit_arr: DigitArr, rule: Rule): boolean {
  switch (rule.id) {
    case '[Sudoku]':
      return false
    case '[R]':
    case '[C]':
    case '[B]':
    case '[SG]':
    case '[DT]':
      return has_dup(digit_arr, getGroups(rule))

    case '[LK]':
      return has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1)
    case "[LK']":
      return (
        has_2groups(digit_arr, differenceOf2Groups(Array.from(generator_adjacent_pos('wasd')), rule.render_state.edges), (d1, d2) => Math.abs(d1 - d2) === 1) ||
        has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) !== 1)
      )
  }
}

export function has_error(digit_arr: DigitArr, rules: Rule[]): boolean {
  for (const rule of rules.filter(isKnown)) {
    if (has_error_rule(digit_arr, rule)) return true
  }
  return false
}

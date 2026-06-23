import { getDisJointGroups } from '../const/groups'
import type { V } from '../types/base'
import type { DigitArr } from '../types/Board'
import { isKnown, type Groups, type Rule, type TwoGroups } from '../types/Rule'
import { generator_adjacent_pos } from '../util/generator_adjacent_pos'
import { differenceOf2Groups, POS2Digit, POS2number } from '../util/groups'

function has_dup(digit_arr: DigitArr, groups: Groups): boolean {
  for (const group of groups) {
    const visit = new Set<V>()

    for (const pos of group) {
      const digit = POS2Digit(digit_arr, pos)

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
      return has_dup(digit_arr, getDisJointGroups(rule))

    case '[LK]':
      return has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1)
    case "[LK']": {
      return (
        has_2groups(digit_arr, differenceOf2Groups(Array.from(generator_adjacent_pos('wasd')), rule.render_state.edges), (d1, d2) => Math.abs(d1 - d2) === 1) ||
        has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) !== 1)
      )
    }

    case '[MT]': {
      // X가 X개보다 많이 있으면 체크
      // 모든 [MT] 셀이 채워졌을 때, 추가로 모든 X가 X개인지 체크
      const M = new Map<V, Set<number>>()
      let filled_all = true
      for (const pos of rule.render_state.diamond_cells) {
        const digit = POS2Digit(digit_arr, pos)
        const n = POS2number(pos)

        if (!digit) {
          filled_all = false
          continue
        }

        if (!M.has(digit)) M.set(digit, new Set())
        M.get(digit)!.add(n)
      }

      if (filled_all) {
        return Array.from(M.entries()).some(([v, s]) => s.size !== v)
      } else {
        return Array.from(M.entries()).some(([v, s]) => s.size > v)
      }
    }

    case '[MR]': {
      // 항상 중복 검사
      // [MR]의 전부가 채워졌을 때, 추가로 연속하는지 체크
      if (has_dup(digit_arr, rule.render_state.metros)) return true

      for (const group of rule.render_state.metros) {
        const digits = group.map((pos) => POS2Digit(digit_arr, pos))
        const filled_all = digits.every((digit) => digit)

        if (filled_all) {
          if (!digits.toSorted().every((v, i, a) => v - a[0] === i)) return true
        }
      }
      return false
    }
  }
}

export function has_error(digit_arr: DigitArr, rules: Rule[]): boolean {
  for (const rule of rules.filter(isKnown)) {
    if (has_error_rule(digit_arr, rule)) return true
  }
  return false
}

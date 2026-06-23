import { getDisJointGroups } from '../const/groups'
import type { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { isKnown, type Groups, type Rule, type TwoGroups } from '../types/Rule'
import { generator_adjacent_pos } from '../util/generator_adjacent_pos'
import { differenceOf2Groups, POS2Cell } from '../util/groups'

function check_dup(board: Board, groups: Groups): Set<Cell> {
  const res = new Set<Cell>()

  for (const group of groups) {
    const M = new Map<V, Set<Cell>>()

    for (const pos of group) {
      const [r, c] = pos
      const cell = board.cells[r][c]

      if (!cell.digit) continue

      if (!M.has(cell.digit)) M.set(cell.digit, new Set())
      M.get(cell.digit)!.add(cell)
    }

    for (const s of Array.from(M.values()).filter((s) => s.size >= 2)) for (const cell of s) res.add(cell)
  }

  return res
}

/** @returns 모든 길이 2의 그룹마다, f를 만족하지 않는 Cell들의 집합 */
function check_2groups(board: Board, groups: TwoGroups, f: (d1: V, d2: V) => boolean): Set<Cell> {
  const res = new Set<Cell>()

  for (const [cell1, cell2] of groups.map((group) => group.map((pos) => POS2Cell(board, pos)))) {
    const d1 = cell1.digit
    const d2 = cell2.digit
    if (d1 && d2 && !f(d1, d2)) {
      res.add(cell1)
      res.add(cell2)
    }
  }

  return res
}

function has_error_rule(board: Board, rule: Rule): Set<Cell> {
  switch (rule.id) {
    case '[Sudoku]':
      return new Set()

    case '[R]':
    case '[C]':
    case '[B]':
    case '[SG]':
    case '[DT]':
      return check_dup(board, getDisJointGroups(rule))

    case '[LK]':
      return check_2groups(board, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1)
    case "[LK']": {
      const res = new Set<Cell>()
      check_2groups(board, differenceOf2Groups(Array.from(generator_adjacent_pos('wasd')), rule.render_state.edges), (d1, d2) => Math.abs(d1 - d2) === 1).forEach(res.add)
      check_2groups(board, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) !== 1).forEach(res.add)
      return res
    }
  }
}

export function check_error(board: Board): Set<Cell> {
  const res = new Set<Cell>()

  for (const rule of board.rules.filter(isKnown)) {
    has_error_rule(board, rule).forEach((cell) => res.add(cell))
  }

  return res
}

import { getGroups } from '../const/groups'
import type { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { isKnown, type Groups, type Rule } from '../types/Rule'

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

function has_error_rule(board: Board, rule: Rule): Set<Cell> {
  switch (rule.id) {
    case '[Sudoku]':
      return new Set()
    case '[R]':
      return check_dup(board, getGroups(rule))
    case '[C]':
      return check_dup(board, getGroups(rule))
    case '[B]':
      return check_dup(board, getGroups(rule))
    case '[SG]':
      return check_dup(board, getGroups(rule))
  }
}

export function check_error(board: Board): Set<Cell> {
  const res = new Set<Cell>()

  for (const rule of board.rules.filter(isKnown)) {
    has_error_rule(board, rule).forEach((cell) => res.add(cell))
  }

  return res
}

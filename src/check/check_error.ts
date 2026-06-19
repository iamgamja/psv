import { GROUPS_R, GROUPS_C, GROUPS_B } from '../const/const'
import type { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { type Rule_ID, type RuleObject, type Groups, isKnown } from '../types/Rule'

type ErrorChecker<T extends Rule_ID> = (board: Board, rule: RuleObject<T>) => Set<Cell>
type ErrorCheckers = {
  [K in Rule_ID]: ErrorChecker<K>
}

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

const ErrorCheckers: ErrorCheckers = {
  '[R]': (board) => check_dup(board, GROUPS_R),
  '[C]': (board) => check_dup(board, GROUPS_C),
  '[B]': (board) => check_dup(board, GROUPS_B),
  '[SG]': (board, rule) => check_dup(board, rule.render_state.regions),
}

export function check_error(board: Board): Set<Cell> {
  const res = new Set<Cell>()

  for (const rule of board.rules.filter(isKnown)) {
    // @ts-ignore
    ErrorCheckers[rule.id](board, rule).forEach((cell) => res.add(cell))
  }

  return res
}

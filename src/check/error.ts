import { GROUPS_B, GROUPS_C, GROUPS_R } from '../const'
import { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { POS, Rule } from '../types/Rule'

function check_dup(board: Board, groups: POS[][]): Set<Cell> {
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

export function check_error(board: Board, rule: Rule): Set<Cell> {
  switch (rule.id) {
    case '[R]': {
      return check_dup(board, GROUPS_R)
    }
    case '[C]': {
      return check_dup(board, GROUPS_C)
    }
    case '[B]': {
      return check_dup(board, GROUPS_B)
    }
    case '[SG]': {
      return check_dup(board, rule.render_state.regions)
    }
    default: {
      // ignore unknown rule
      return new Set<Cell>()
    }
  }
}

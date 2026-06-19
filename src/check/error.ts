import { GROUPS_B, GROUPS_C, GROUPS_R } from '../const/const'
import { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { Groups } from '../types/Rule'

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

export function check_error(board: Board): Set<Cell> {
  const res = new Set<Cell>()

  for (const rule of board.rules)
    switch (rule.id) {
      case '[R]': {
        check_dup(board, GROUPS_R).forEach((cell) => res.add(cell))
        break
      }
      case '[C]': {
        check_dup(board, GROUPS_C).forEach((cell) => res.add(cell))
        break
      }
      case '[B]': {
        check_dup(board, GROUPS_B).forEach((cell) => res.add(cell))
        break
      }
      case '[SG]': {
        check_dup(board, rule.render_state.regions).forEach((cell) => res.add(cell))
        break
      }
      default: {
        // ignore unknown rule
      }
    }

  return res
}

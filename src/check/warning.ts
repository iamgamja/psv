import { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { State } from '../types/State'

export function check_warning(board: Board, State: State): Set<Cell> {
  const res = new Set<Cell>()

  // 1. one cell, no memo
  if (State.Setting.useCellWarning === 'on') {
    board.empty_cells.forEach((cell) => {
      if (cell.valid_memo.size === 0) res.add(cell)
    })
  }

  // 2. one group, one digit, no memo
  if (State.Setting.useGroupWarning === 'on') {
    for (const group of board.all_9_disjoint_groups) {
      const cells = group.map(([r, c]) => board.cells[r][c])
      const empty_cells = cells.filter((cell) => !cell.digit)

      for (const digit of V) {
        if (cells.every((cell) => cell.digit !== digit) && empty_cells.every((cell) => !cell.valid_memo.has(digit))) {
          empty_cells.forEach((cell) => res.add(cell))
        }
      }
    }
  }

  return res
}

import { GROUPS_B, GROUPS_C, GROUPS_R } from '../const'
import { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'

export function check_warning(board: Board): Set<Cell> {
  const res = new Set<Cell>()

  // 1. one cell, no memo
  board.empty_cells.forEach((cell) => {
    if (cell.valid_memo.size === 0) res.add(cell)
  })

  // 2. one group, one digit, no memo
  const group_rules = board.rules.filter((rule) => rule.id === '[R]' || rule.id === '[C]' || rule.id === '[B]' || rule.id === '[SG]')
  for (const rule of group_rules) {
    const groups = rule.id === '[R]' ? GROUPS_R : rule.id === '[C]' ? GROUPS_C : rule.id === '[B]' ? GROUPS_B : rule.render_state.regions
    const cell_groups = groups.map((group) => group.map(([r, c]) => board.cells[r][c]))

    for (const cells of cell_groups) {
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

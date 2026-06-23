import { getDisJointGroups, GROUPS_QD } from '../const/groups'
import { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { isKnown, type Group, type Groups, type Rule, type TwoGroups } from '../types/Rule'
import { generator_adjacent_pos } from '../util/generator_adjacent_pos'
import { differenceOf2Groups, POS2Cell } from '../util/groups'

type ParsedGroup =
  | {
      digits: V[]
      cells: Cell[]
      sub_groups: Map<V, Group>
      sub_cells: Map<V, Cell[]>
      filled_all: true
    }
  | {
      digits: (V | 0)[]
      cells: Cell[]
      sub_groups: Map<V, Group>
      sub_cells: Map<V, Cell[]>
      filled_all: false
    }
export function parseGroup(board: Board, group: Group): ParsedGroup {
  const cells = group.map((pos) => POS2Cell(board, pos))
  const digits = cells.map((cell) => cell.digit)
  const filled_all = digits.every((digit) => digit)

  const sub_groups = new Map<V, Group>()
  const sub_cells = new Map<V, Cell[]>()
  for (let i = 0; i < group.length; i++) {
    const digit = digits[i]
    if (digit) {
      if (!sub_groups.has(digit)) sub_groups.set(digit, [])
      sub_groups.get(digit)!.push(group[i])
      if (!sub_cells.has(digit)) sub_cells.set(digit, [])
      sub_cells.get(digit)!.push(cells[i])
    }
  }

  return {
    digits,
    cells,
    sub_groups,
    sub_cells,
    filled_all,
  } as ParsedGroup
}

function check_dup(board: Board, groups: Groups): Set<Cell> {
  const res = new Set<Cell>()

  for (const group of groups) {
    const M = new Map<V, Set<Cell>>()

    for (const pos of group) {
      const cell = POS2Cell(board, pos)
      const digit = cell.digit

      if (!digit) continue

      if (!M.has(digit)) M.set(digit, new Set())
      M.get(digit)!.add(cell)
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
      check_2groups(board, differenceOf2Groups(Array.from(generator_adjacent_pos('wasd')), rule.render_state.edges), (d1, d2) => Math.abs(d1 - d2) === 1).forEach((cell) =>
        res.add(cell),
      )
      check_2groups(board, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) !== 1).forEach((cell) => res.add(cell))
      return res
    }

    case '[MT]': {
      // X가 X개보다 많이 있으면 체크
      // 모든 [MT] 셀이 채워졌을 때, 추가로 모든 X가 X개인지 체크
      const res = new Set<Cell>()
      const { sub_cells, filled_all } = parseGroup(board, rule.render_state.diamond_cells)

      if (filled_all) {
        for (const [v, s] of sub_cells.entries()) if (s.length !== v) s.forEach((cell) => res.add(cell))
      } else {
        for (const [v, s] of sub_cells.entries()) if (s.length > v) s.forEach((cell) => res.add(cell))
      }

      return res
    }

    case '[MR]': {
      // 항상 중복 검사
      // [MR]의 전부가 채워졌을 때, 추가로 연속하는지 체크
      const res = new Set<Cell>()

      check_dup(board, rule.render_state.metros).forEach((cell) => res.add(cell))

      for (const group of rule.render_state.metros) {
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (!digits.toSorted().every((v, i, a) => v - a[0] === i)) for (const cell of cells) res.add(cell)
        }
      }

      return res
    }

    case '[QD]': {
      const res = new Set<Cell>()
      for (const group of GROUPS_QD) {
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (!(digits.some((d) => d % 2 === 0) && digits.some((d) => d % 2 === 1))) for (const cell of cells) res.add(cell)
        }
      }
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

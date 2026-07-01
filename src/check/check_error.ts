import { getDisJointGroups, GROUPS_QD, GROUPS_R, GROUPS_TP } from '../const/groups'
import { IDX0, POSSchema, V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { DirMap, isKnown, type Rule } from '../types/Rule'
import { type Group, type Groups, type TwoGroups } from '../types/base'
import { create_adjacent_group_of_pos, GROUPS_ADJACENT } from '../util/create_adjacent_group'
import { differenceOf2Groups, POS2Cell } from '../util/groups'
import { Prime2Set, Square2Set, Prime3Set, Square3Set, distances, distanceMap } from '../const/check_helper'

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
  const collector = new CellCollector()

  for (const group of groups) {
    const { sub_cells } = parseGroup(board, group)

    for (const cells of sub_cells.values()) if (!(cells.length <= 1)) collector.add(cells)
  }

  return collector.res
}

/** @returns 모든 완성된 길이 2의 그룹마다, f를 만족하지 않는 Cell들의 집합 */
function check_2groups(board: Board, groups: TwoGroups, f: (d1: V, d2: V) => boolean): Set<Cell> {
  const collector = new CellCollector()

  for (const group of groups) {
    const { cells, digits, filled_all } = parseGroup(board, group)

    if (filled_all) {
      if (!f(digits[0], digits[1])) collector.add(cells)
    }
  }

  return collector.res
}

class CellCollector {
  res: Set<Cell>

  constructor() {
    this.res = new Set()
  }

  add(iter: Iterable<Cell>) {
    for (const cell of iter) {
      this.res.add(cell)
    }
  }
}

function check_error_rule(board: Board, rule: Rule): Set<Cell> {
  switch (rule.id) {
    case '[Sudoku]':
      return new Set()

    case '[R]':
    case '[C]':
    case '[B]':
    case '[SG]':
    case "[SG']":
    case '[DT]':
      return check_dup(board, getDisJointGroups(rule))

    case '[LK]':
      return check_2groups(board, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1)
    case "[LK']": {
      const collector = new CellCollector()

      collector.add(check_2groups(board, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1))
      collector.add(check_2groups(board, differenceOf2Groups(GROUPS_ADJACENT['wasd'], rule.render_state.edges), (d1, d2) => Math.abs(d1 - d2) !== 1))

      return collector.res
    }

    case '[MT]': {
      const collector = new CellCollector()

      const { sub_cells, filled_all } = parseGroup(board, rule.render_state.diamond_cells)

      if (filled_all) {
        for (const [v, s] of sub_cells.entries()) if (!(s.length === v)) collector.add(s)
      } else {
        for (const [v, s] of sub_cells.entries()) if (!(s.length <= v)) collector.add(s)
      }

      return collector.res
    }

    case '[MR]': {
      const collector = new CellCollector()

      collector.add(check_dup(board, rule.render_state.metros))

      for (const group of rule.render_state.metros) {
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (!digits.toSorted().every((v, i, a) => v - a[0] === i)) collector.add(cells)
        }
      }

      return collector.res
    }

    case '[QD]': {
      const collector = new CellCollector()

      for (const group of GROUPS_QD) {
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (!(digits.some((d) => d % 2 === 0) && digits.some((d) => d % 2 === 1))) collector.add(cells)
        }
      }

      return collector.res
    }
    case "[QD']": {
      const collector = new CellCollector()

      for (const group of GROUPS_QD) {
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (!(digits.reduce((a, b) => a + b, 0) % 3 !== 0)) collector.add(cells)
        }
      }

      return collector.res
    }

    case '[TP]': {
      const collector = new CellCollector()

      for (const group of GROUPS_TP) {
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (digits[0] < digits[1] && digits[1] < digits[2]) collector.add(cells)
          else if (digits[0] > digits[1] && digits[1] > digits[2]) collector.add(cells)
        }
      }

      return collector.res
    }

    case '[LO]': {
      const collector = new CellCollector()

      for (const pos of rule.render_state.cells) {
        const cell = POS2Cell(board, pos)
        const digit = cell.digit

        const group = create_adjacent_group_of_pos(pos, 'wasd')
        const { cells, digits } = parseGroup(board, group)

        if (digit) {
          if (!(digits.filter((d) => d).every((d) => d > digit) || digits.filter((d) => d).every((d) => d < digit))) {
            collector.add([cell])
            collector.add(cells)
          }
        }
      }

      return collector.res
    }
    case "[LO']": {
      const collector = new CellCollector()

      for (const pos of rule.render_state.cells) {
        const cell = POS2Cell(board, pos)
        const digit = cell.digit

        const group = create_adjacent_group_of_pos(pos, 'wasd')
        const { cells, digits, filled_all } = parseGroup(board, group)

        if (digit && filled_all) {
          const avg = Math.floor(digits.reduce((a, b) => a + b, 0) / digits.length)
          if (!(digit === avg)) {
            collector.add([cell])
            collector.add(cells)
          }
        }
      }

      return collector.res
    }

    case '[BP]': {
      const collector = new CellCollector()

      type type_arr = ('no' | 'yes' | 'unknown')[][]
      const type_arr: type_arr = Array.from({ length: 9 }, () => Array(9).fill('unknown'))

      for (const r of IDX0) {
        for (const c of IDX0) {
          const pos = POSSchema.parse([r, c])
          const cell = POS2Cell(board, pos)
          const digit = cell.digit

          const group = create_adjacent_group_of_pos(pos, 'wasd')
          const { digits, filled_all } = parseGroup(board, group)

          if (digit && !digits.filter((d) => d).every((d) => Math.abs(d - digit) >= 3)) type_arr[r][c] = 'no'
          else if (digit && filled_all) type_arr[r][c] = digits.every((d) => Math.abs(d - digit) >= 3) ? 'yes' : 'no'
          else type_arr[r][c] = 'unknown'
        }
      }

      for (const r of IDX0) {
        const yes: Cell[] = []
        const no: Cell[] = []
        for (const c of IDX0) {
          if (type_arr[r][c] === 'yes') yes.push(POS2Cell(board, POSSchema.parse([r, c])))
          else if (type_arr[r][c] === 'no') no.push(POS2Cell(board, POSSchema.parse([r, c])))
        }

        if (!(yes.length <= 1)) collector.add(yes)
        else if (!(no.length < 9)) collector.add(no)
      }
      for (const c of IDX0) {
        const yes: Cell[] = []
        const no: Cell[] = []
        for (const r of IDX0) {
          if (type_arr[r][c] === 'yes') yes.push(POS2Cell(board, POSSchema.parse([r, c])))
          else if (type_arr[r][c] === 'no') no.push(POS2Cell(board, POSSchema.parse([r, c])))
        }

        if (!(yes.length <= 1)) collector.add(yes)
        else if (!(no.length < 9)) collector.add(no)
      }

      return collector.res
    }

    case '[PO]':
      return check_2groups(board, rule.render_state.edges, (d1, d2) => d1 < d2)

    case "[R']": {
      const collector = new CellCollector()

      const remainders_map = new Map<V, IDX0>() // (v, r)

      for (const r of IDX0) {
        const group = GROUPS_R[r]
        const cells = group.map((pos) => POS2Cell(board, pos))

        const { digits, filled_all } = parseGroup(board, group)

        const s = new Set(digits)
        const reminders = V.filter((i) => !s.has(i))

        if (filled_all) {
          if (!(reminders.length === 1)) {
            collector.add(cells)
          } else if (remainders_map.has(reminders[0])) {
            collector.add(GROUPS_R[remainders_map.get(reminders[0])!].map((pos) => POS2Cell(board, pos)))
            collector.add(cells)
          } else remainders_map.set(reminders[0], r)
        }
      }

      return collector.res
    }

    case '[PR]': {
      const collector = new CellCollector()

      for (const [r1, c1, r2, c2, isred] of rule.render_state.edges) {
        const group: Group = [
          [r1, c1],
          [r2, c2],
        ]
        const { digits, cells, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (isred) {
            if (!Prime2Set.has(parseInt(digits.join('')))) collector.add(cells)
          } else {
            if (!Square2Set.has(parseInt(digits.join('')))) collector.add(cells)
          }
        }
      }

      return collector.res
    }
    case "[PR']": {
      const collector = new CellCollector()

      for (const [r1, c1, r2, c2, r3, c3, isred] of rule.render_state.triplets) {
        const group: Group = [
          [r1, c1],
          [r2, c2],
          [r3, c3],
        ]
        const { digits, cells, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (isred) {
            if (!Prime3Set.has(parseInt(digits.join('')))) collector.add(cells)
          } else {
            if (!Square3Set.has(parseInt(digits.join('')))) collector.add(cells)
          }
        }
      }

      return collector.res
    }

    case '[RT]': {
      const collector = new CellCollector()

      for (const [r1, c1, dd] of rule.render_state.cells) {
        const pos1 = POSSchema.parse([r1, c1])
        const cell1 = POS2Cell(board, pos1)
        const digit1 = cell1.digit

        if (digit1) {
          const idx = distances.indexOf(dd)
          for (let i = 0; i < idx; i++) {
            for (const [dr, dc] of distanceMap[distances[i]]) {
              for (const [r2, c2] of [
                [r1 - dr, c1 - dc],
                [r1 - dr, c1 + dc],
                [r1 + dr, c1 - dc],
                [r1 + dr, c1 + dc],
              ]) {
                const pos2 = POSSchema.safeParse([r2, c2])
                if (!pos2.success) continue

                const cell2 = POS2Cell(board, pos2.data)
                const digit2 = cell2.digit

                if (digit1 === digit2) collector.add([cell1, cell2])
              }
            }
          }

          const group: Group = []
          for (const [dr, dc] of distanceMap[distances[idx]]) {
            for (const [r2, c2] of [
              [r1 - dr, c1 - dc],
              [r1 - dr, c1 + dc],
              [r1 + dr, c1 - dc],
              [r1 + dr, c1 + dc],
            ]) {
              const pos2 = POSSchema.safeParse([r2, c2])
              if (!pos2.success) continue

              group.push(pos2.data)
            }
          }

          const { digits, cells, filled_all } = parseGroup(board, group)
          if (filled_all) {
            if (!digits.includes(digit1)) collector.add(cells)
          }
        }
      }

      return collector.res
    }
    case "[RT']": {
      const collector = new CellCollector()

      for (const [r1, c1, dd] of rule.render_state.cells) {
        const pos1 = POSSchema.parse([r1, c1])
        const cell1 = POS2Cell(board, pos1)
        const digit1 = cell1.digit

        if (digit1) {
          const idx = distances.indexOf(dd)
          for (let i = idx + 1; i < distances.length; i++) {
            for (const [dr, dc] of distanceMap[distances[i]]) {
              for (const [r2, c2] of [
                [r1 - dr, c1 - dc],
                [r1 - dr, c1 + dc],
                [r1 + dr, c1 - dc],
                [r1 + dr, c1 + dc],
              ]) {
                const pos2 = POSSchema.safeParse([r2, c2])
                if (!pos2.success) continue

                const cell2 = POS2Cell(board, pos2.data)
                const digit2 = cell2.digit

                if (digit1 === digit2) collector.add([cell1, cell2])
              }
            }
          }

          const group: Group = []
          for (const [dr, dc] of distanceMap[distances[idx]]) {
            for (const [r2, c2] of [
              [r1 - dr, c1 - dc],
              [r1 - dr, c1 + dc],
              [r1 + dr, c1 - dc],
              [r1 + dr, c1 + dc],
            ]) {
              const pos2 = POSSchema.safeParse([r2, c2])
              if (!pos2.success) continue

              group.push(pos2.data)
            }
          }

          const { digits, cells, filled_all } = parseGroup(board, group)
          if (filled_all) {
            if (!digits.includes(digit1)) collector.add(cells)
          }
        }
      }

      return collector.res
    }

    case '[PA]': {
      const collector = new CellCollector()

      const visit = new Map<string, CellCollector>() // `${d1}${d2}` -> cells; d1 <= d2

      for (const two_group of rule.render_state.dominoes) {
        const { digits, cells, filled_all } = parseGroup(board, two_group)

        if (filled_all) {
          const s = digits.toSorted().join('')
          if (!visit.has(s)) {
            visit.set(s, new CellCollector())
          }

          visit.get(s)!.add(cells)
        }
      }

      for (const cells of Array.from(visit.values()).map((cl) => cl.res)) {
        if (cells.size != 2) collector.add(cells)
      }

      return collector.res
    }

    case '[VT]': {
      const collector = new CellCollector()

      for (const [r, c, dir] of rule.render_state.arrows) {
        const pos = POSSchema.parse([r, c])
        const cell = POS2Cell(board, pos)
        const digit = cell.digit

        if (digit) {
          const [dir_dr, dir_dc] = DirMap[dir]

          const r2 = r + dir_dr * digit
          const c2 = c + dir_dc * digit

          const pos2 = POSSchema.safeParse([r2, c2])
          if (!pos2.success) {
            collector.add([cell])
            continue
          }

          const cell2 = POS2Cell(board, pos2.data)
          const digit2 = cell2.digit

          if (digit2) {
            if (!(digit2 === 9)) collector.add([cell, cell2])
          }
        }
      }

      return collector.res
    }
  }
}

export function check_error(board: Board): Set<Cell> {
  const collector = new CellCollector()

  for (const rule of board.rules.filter(isKnown)) {
    collector.add(check_error_rule(board, rule))
  }

  return collector.res
}

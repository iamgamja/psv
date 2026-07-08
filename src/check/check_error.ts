import { getDisJointGroups, GROUPS_QD, GROUPS_R, GROUPS_TP } from '../const/groups'
import { IDX0, POSSchema, V, type POS } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { DirMap, isKnown, type Rule } from '../types/Rule'
import { type Group, type Groups, type TwoGroups } from '../types/base'
import { create_adjacent_group_of_pos, GROUPS_ADJACENT } from '../util/create_adjacent_group'
import { differenceOf2Groups, POS2Cell, POS2number } from '../util/groups'
import { Prime2Set, Square2Set, Prime3Set, Square3Set, distances, distanceMap } from '../const/check_helper'
import { pairwise } from '../util/pairwise'

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

type RangeLineType = Extract<Rule, { id: '[RG]' }>['render_state']['side_hints'][number][0]
type RangeLetter = Extract<Rule, { id: "[RG']" }>['render_state']['side_hints'][number][2]

function getRangeLineGroup(type: RangeLineType, index: number): Group {
  return IDX0.map((i) => (type === 'ROW' ? [index, i] : [i, index])) as Group
}

function collectRangeLineData(board: Board, type: RangeLineType, index: number) {
  const group = getRangeLineGroup(type, index)
  const { cells, digits, filled_all } = parseGroup(board, group)
  const pairs: { distance: number; cells: Cell[] }[] = []
  const oneNineCells: Cell[] = []

  for (let i = 0; i < digits.length; i++) {
    if (digits[i] === 1 || digits[i] === 9) oneNineCells.push(cells[i])
  }

  for (let i = 0; i < digits.length; i++) {
    for (let j = i + 1; j < digits.length; j++) {
      if ((digits[i] === 1 && digits[j] === 9) || (digits[i] === 9 && digits[j] === 1)) {
        pairs.push({ distance: j - i, cells: [cells[i], cells[j]] })
      }
    }
  }

  return { cells, filled_all, oneNineCells, pairs }
}

type StencilPiece = Extract<Rule, { id: '[ST]' }>['render_state']['pieces'][number]
type StencilValue = { pos: POS; value: V }
type StencilVariant = { cells: POS[]; values: StencilValue[]; height: number; width: number }

function parseStencilValues(values: StencilPiece['values']): StencilValue[] {
  return Object.entries(values).map(([key, value]) => {
    const [r, c] = key.split(',').map(Number)
    return { pos: POSSchema.parse([r, c]), value }
  })
}

function createStencilVariants(piece: StencilPiece): StencilVariant[] {
  const values = parseStencilValues(piece.values)
  const transforms = [
    ([r, c]: POS): [number, number] => [r, c],
    ([r, c]: POS): [number, number] => [c, -r],
    ([r, c]: POS): [number, number] => [-r, -c],
    ([r, c]: POS): [number, number] => [-c, r],
    ([r, c]: POS): [number, number] => [r, -c],
    ([r, c]: POS): [number, number] => [-r, c],
    ([r, c]: POS): [number, number] => [c, r],
    ([r, c]: POS): [number, number] => [-c, -r],
  ]

  const variants: StencilVariant[] = []
  const seen = new Set<string>()

  for (const transform of transforms) {
    const rawCells = piece.cells.map(transform)
    const rawValues = values.map(({ pos, value }) => ({ pos: transform(pos), value }))
    const minR = Math.min(...rawCells.map(([r]) => r))
    const minC = Math.min(...rawCells.map(([, c]) => c))
    const cells = rawCells.map(([r, c]) => POSSchema.parse([r - minR, c - minC]))
    const transformedValues = rawValues.map(({ pos: [r, c], value }) => ({ pos: POSSchema.parse([r - minR, c - minC]), value }))
    const height = Math.max(...cells.map(([r]) => r)) + 1
    const width = Math.max(...cells.map(([, c]) => c)) + 1
    const key = [...cells.map((pos) => pos.join(',')).toSorted(), '|', ...transformedValues.map(({ pos, value }) => `${pos.join(',')}=${value}`).toSorted()].join(';')

    if (!seen.has(key)) {
      seen.add(key)
      variants.push({ cells, values: transformedValues, height, width })
    }
  }

  return variants
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

      const type_arr: ('no' | 'yes' | 'unknown')[][] = Array.from({ length: 9 }, () => Array(9).fill('unknown'))

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

    case '[EF]': {
      const collector = new CellCollector()

      const set = new Set(rule.render_state.marked_cells.map(POS2number))

      for (const pos of rule.render_state.marked_cells) {
        const cell = POS2Cell(board, pos)
        const digit = cell.digit

        if (digit) {
          const group = create_adjacent_group_of_pos(pos, 'king').filter((pos) => set.has(POS2number(pos)))
          group.push(pos) // 자기 자신도 포함

          const { cells, digits, filled_all } = parseGroup(board, group)
          const cnt = digits.filter((d) => d).filter((d) => d <= digit).length

          if (filled_all) {
            if (!(cnt === digit)) collector.add(cells)
          } else {
            if (!(cnt <= digit)) collector.add(cells)
          }
        }
      }

      return collector.res
    }

    case '[TM]': {
      const collector = new CellCollector()

      for (const { cells: group, color } of rule.render_state.regions) {
        const { cells, digits, filled_all } = parseGroup(board, group)
        const sum = (digits as number[]).reduce((a, b) => a + b, 0)

        switch (color) {
          case 'blue': {
            if (!(sum <= 10)) collector.add(cells)
            break
          }
          case 'green': {
            if (filled_all) {
              if (!(sum === 15)) collector.add(cells)
            } else {
              if (!(sum <= 15)) collector.add(cells)
            }
            break
          }
          case 'red': {
            if (filled_all) {
              if (!(sum >= 20)) collector.add(cells)
            }
            break
          }
        }
      }

      return collector.res
    }

    case '[AQ]': {
      const collector = new CellCollector()

      for (const group of rule.render_state.regions) {
        for (let i = 0; i < group.length; i++) {
          const pos1 = group[i]
          const cell1 = POS2Cell(board, pos1)
          const digit1 = cell1.digit
          if (!digit1) continue

          for (let j = i + 1; j < group.length; j++) {
            const pos2 = group[j]
            const cell2 = POS2Cell(board, pos2)
            const digit2 = cell2.digit
            if (!digit2) continue

            if (cell1.r < cell2.r) {
              if (!(digit1 < digit2)) collector.add([cell1, cell2])
            } else if (cell1.r > cell2.r) {
              if (!(digit1 > digit2)) collector.add([cell1, cell2])
            }
          }
        }
      }

      return collector.res
    }

    case '[RF]': {
      const collector = new CellCollector()

      for (const [type, i] of rule.render_state.lines) {
        if (type === 'ROW') {
          const r = i
          for (const c of IDX0) {
            const pos = POSSchema.parse([r, c])
            const cell = POS2Cell(board, pos)
            const digit = cell.digit
            if (!digit) continue

            const pos2 = POSSchema.parse([digit - 1, c])
            const cell2 = POS2Cell(board, pos2)
            const digit2 = cell2.digit
            if (!digit2) continue

            if (!(digit2 - 1 === r)) collector.add([cell, cell2])
          }
        } else {
          const c = i
          for (const r of IDX0) {
            const pos = POSSchema.parse([r, c])
            const cell = POS2Cell(board, pos)
            const digit = cell.digit
            if (!digit) continue

            const pos2 = POSSchema.parse([r, digit - 1])
            const cell2 = POS2Cell(board, pos2)
            const digit2 = cell2.digit
            if (!digit2) continue

            if (!(digit2 - 1 === c)) collector.add([cell, cell2])
          }
        }
      }

      return collector.res
    }

    case '[RG]': {
      const collector = new CellCollector()

      for (const [type, i, distances] of rule.render_state.side_hints) {
        const expectedDistances = new Set<number>(distances)
        const { cells, filled_all, pairs } = collectRangeLineData(board, type, i)

        for (const pair of pairs) {
          if (!expectedDistances.has(pair.distance)) collector.add(pair.cells)
        }

        if (filled_all && pairs.length === 0) collector.add(cells)
      }

      return collector.res
    }

    case "[RG']": {
      const collector = new CellCollector()
      const records: { letter: RangeLetter; distance: number; cells: Cell[] }[] = []

      for (const [type, i, letter] of rule.render_state.side_hints) {
        const { cells, filled_all, oneNineCells, pairs } = collectRangeLineData(board, type, i)
        const distances = new Set(pairs.map(({ distance }) => distance))

        if (distances.size >= 2) {
          collector.add(oneNineCells)
        } else if (filled_all && pairs.length === 0) {
          collector.add(cells)
        } else if (distances.size === 1) {
          records.push({ letter, distance: Array.from(distances)[0]!, cells: oneNineCells })
        }
      }

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const a = records[i]
          const b = records[j]
          if ((a.letter === b.letter && a.distance !== b.distance) || (a.letter !== b.letter && a.distance === b.distance)) {
            collector.add(a.cells)
            collector.add(b.cells)
          }
        }
      }

      return collector.res
    }

    case '[SR]': {
      const collector = new CellCollector()

      for (const group of rule.render_state.streams) {
        let type: -1 | 0 | 1 = -1 // -1: 결정되지 않음; 0|1: (r^c^digit)&1

        for (const pos of group) {
          const cell = POS2Cell(board, pos)
          const digit = cell.digit
          if (!digit) continue

          const x = ((pos[0] ^ pos[1] ^ digit) & 1) as 0 | 1
          if (type === -1) {
            type = x
            continue
          }

          if (!(x === type)) collector.add(group.map((pos) => POS2Cell(board, pos)))
        }
      }

      return collector.res
    }

    case '[IV]': {
      const collector = new CellCollector()

      for (const group of rule.render_state.lines) {
        const { cells, digits, filled_all } = parseGroup(board, group)
        const cnt = pairwise(digits).filter(([d1, d2]) => d1 && d2 && d1 > d2).length

        if (filled_all) {
          if (!(cnt === 1)) collector.add(cells)
        } else {
          if (!(cnt <= 1)) collector.add(cells)
        }
      }

      return collector.res
    }

    case '[BD]': {
      if (board.flat_cells.every((cell) => cell.digit)) {
        const maxR = Array(9).fill(-1) // 열 c마다 이미 점유된 최대 r

        for (const start_r of rule.render_state.start_rows) {
          const pos1 = POSSchema.parse([start_r, 0])
          const cell1 = POS2Cell(board, pos1)
          const digit1 = cell1.digit

          function findPathFromStart(startR: IDX0): number[] | null {
            const path = Array(9).fill(-1)

            function dfs(r: IDX0, c: IDX0): boolean {
              if (r <= maxR[c]) return false

              const pos = POSSchema.parse([r, c])
              const cell = POS2Cell(board, pos)
              const digit = cell.digit
              if (!(digit === ((digit1 + c - 1) % 9) + 1)) return false

              path[c] = r

              if (c === 8) return true

              for (const dr of [-1, 0, +1]) {
                const next_pos = POSSchema.safeParse([r + dr, c + 1])
                if (!next_pos.success) continue

                if (dfs(next_pos.data[0], next_pos.data[1])) return true
              }

              path[c] = -1
              return false
            }

            if (dfs(startR, 0)) return path
            return null
          }

          const path = findPathFromStart(start_r)
          if (!path) {
            return new Set(rule.render_state.start_rows.map((r) => POSSchema.parse([r, 0])).map((pos) => POS2Cell(board, pos)))
          }

          for (const c of IDX0) {
            maxR[c] = Math.max(maxR[c], path[c])
          }
        }
      }

      return new Set<Cell>()
    }

    case '[TR]': {
      const collector = new CellCollector()

      if (board.flat_cells.every((cell) => cell.digit)) {
        const start = rule.render_state.start
        const end = rule.render_state.end

        const visited = new Set<number>()
        const queue = [start]
        visited.add(POS2number(start))
        let path_exists = false

        while (queue.length > 0) {
          const curr = queue.shift()!
          if (curr[0] === end[0] && curr[1] === end[1]) {
            path_exists = true
            break
          }

          const curr_cell = POS2Cell(board, curr)
          const curr_digit = curr_cell.digit
          if (!curr_digit) continue

          const next_digit = (curr_digit % 9) + 1

          const adj_group = create_adjacent_group_of_pos(curr, 'wasd')
          for (const npos of adj_group) {
            const npos_num = POS2number(npos)
            if (visited.has(npos_num)) continue

            const ncell = POS2Cell(board, npos)
            const ndigit = ncell.digit
            if (ndigit === next_digit) {
              visited.add(npos_num)
              queue.push(npos)
            }
          }
        }

        if (!path_exists) {
          const startCell = POS2Cell(board, start)
          const endCell = POS2Cell(board, end)
          collector.add([startCell, endCell])
        }
      }

      return collector.res
    }

    case "[TR']": {
      const collector = new CellCollector()

      if (board.flat_cells.every((cell) => cell.digit)) {
        const start = rule.render_state.start
        const end = rule.render_state.end

        const start_num = POS2number(start)
        const end_num = POS2number(end)

        if (start_num === end_num) {
          collector.add([POS2Cell(board, start)])
        } else {
          const src = start_num + 81
          const sink = end_num

          const adj = Array.from({ length: 162 }, () => [] as number[])
          const capacity = Array.from({ length: 162 }, () => new Float64Array(162))

          function addEdge(u: number, v: number, cap: number) {
            adj[u].push(v)
            adj[v].push(u)
            capacity[u][v] = cap
          }

          for (let u = 0; u < 81; u++) {
            if (u !== start_num && u !== end_num) {
              addEdge(u, u + 81, 1)
            }
          }

          for (const r of IDX0) {
            for (const c of IDX0) {
              const u = r * 9 + c
              if (u === end_num) continue

              const u_pos = POSSchema.parse([r, c])
              const u_cell = POS2Cell(board, u_pos)
              const u_digit = u_cell.digit
              if (!u_digit) continue

              const next_digit = (u_digit % 9) + 1
              const neighbors = create_adjacent_group_of_pos(u_pos, 'wasd')

              for (const npos of neighbors) {
                const v = POS2number(npos)
                if (v === start_num) continue

                const v_cell = POS2Cell(board, npos)
                const v_digit = v_cell.digit
                if (v_digit === next_digit) {
                  addEdge(u + 81, v, 1)
                }
              }
            }
          }

          let totalFlow = 0
          while (totalFlow < 2) {
            const parent = new Int32Array(162).fill(-1)
            const queue = [src]
            parent[src] = -2

            let found = false
            let head = 0
            while (head < queue.length) {
              const curr = queue[head++]
              if (curr === sink) {
                found = true
                break
              }

              for (const next of adj[curr]) {
                if (parent[next] === -1 && capacity[curr][next] > 0) {
                  parent[next] = curr
                  queue.push(next)
                }
              }
            }

            if (!found) break

            let curr = sink
            while (curr !== src) {
              const prev = parent[curr]
              capacity[prev][curr] -= 1
              capacity[curr][prev] += 1
              curr = prev
            }

            totalFlow += 1
          }

          if (totalFlow < 2) {
            collector.add([POS2Cell(board, start), POS2Cell(board, end)])
          }
        }
      }

      return collector.res
    }

    case '[ST]': {
      const collector = new CellCollector()

      for (const piece of rule.render_state.pieces) {
        for (const variant of createStencilVariants(piece)) {
          for (let ro = 0; ro <= 9 - variant.height; ro++) {
            for (let co = 0; co <= 9 - variant.width; co++) {
              const matchedCells: Cell[] = []
              let matched = true

              for (const {
                pos: [r, c],
                value,
              } of variant.values) {
                const pos = POSSchema.parse([ro + r, co + c])
                const cell = POS2Cell(board, pos)
                if (cell.digit !== value) {
                  matched = false
                  break
                }
                matchedCells.push(cell)
              }

              if (matched) collector.add(matchedCells)
            }
          }
        }
      }

      return collector.res
    }

    case '[ES]': {
      const collector = new CellCollector()

      const visited = Array.from({ length: 9 }, () => new Uint8Array(9))

      for (const r of IDX0) {
        for (const c of IDX0) {
          if (visited[r][c]) continue

          const pos = POSSchema.parse([r, c])
          const cell = POS2Cell(board, pos)
          const digit = cell.digit

          const is_potential_even = !digit || digit % 2 === 0

          if (is_potential_even) {
            const component: Cell[] = []
            const queue = [pos]
            visited[r][c] = 1

            let touches_edge = false

            while (queue.length > 0) {
              const curr = queue.shift()!
              const curr_cell = POS2Cell(board, curr)
              component.push(curr_cell)

              if (curr[0] === 0 || curr[0] === 8) {
                touches_edge = true
              }

              const adj = create_adjacent_group_of_pos(curr, 'wasd')
              for (const npos of adj) {
                const [nr, nc] = npos
                if (!visited[nr][nc]) {
                  const ndigit = POS2Cell(board, npos).digit
                  if (!ndigit || ndigit % 2 === 0) {
                    visited[nr][nc] = 1
                    queue.push(npos)
                  }
                }
              }
            }

            if (!touches_edge) {
              const filled_evens = component.filter((c) => c.digit && c.digit % 2 === 0)
              if (filled_evens.length > 0) {
                collector.add(filled_evens)
              }
            }
          }
        }
      }

      return collector.res
    }

    case '[EP]': {
      const collector = new CellCollector()
      const visited = Array.from({ length: 9 }, () => new Uint8Array(9))

      for (const r of IDX0) {
        for (const c of IDX0) {
          if (visited[r][c]) continue

          const pos = POSSchema.parse([r, c])
          const cell = POS2Cell(board, pos)
          const digit = cell.digit

          if (digit >= 1 && digit <= 4) {
            const component: Cell[] = []
            const queue = [pos]
            visited[r][c] = 1

            let has_adjacent_empty = false

            while (queue.length > 0) {
              const curr = queue.shift()!
              const curr_cell = POS2Cell(board, curr)
              component.push(curr_cell)

              const adj = create_adjacent_group_of_pos(curr, 'wasd')
              for (const npos of adj) {
                const [nr, nc] = npos
                const ncell = POS2Cell(board, npos)
                const ndigit = ncell.digit

                if (ndigit === 0) {
                  has_adjacent_empty = true
                } else if (!visited[nr][nc] && ndigit >= 1 && ndigit <= 4) {
                  visited[nr][nc] = 1
                  queue.push(npos)
                }
              }
            }

            if (component.length >= 4) {
              collector.add(component)
            } else if (component.length < 3 && !has_adjacent_empty) {
              collector.add(component)
            }
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

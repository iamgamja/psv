import { type ParsedGroup, Prime2Set, Prime3Set, Square2Set, Square3Set, distanceMap, distances, getLineGroup, parseGroup } from '../const/check_helper'
import { GROUPS_QD, GROUPS_R, GROUPS_TP, getDisJointGroups } from '../const/groups'
import { type LiteBoard } from '../types/Board'
import { DirMap, type RangeLetter, type Rule, isKnown } from '../types/Rule'
import { type Group, type Groups, IDX0, type POS, POSSchema, V } from '../types/base'
import { GROUPS_ADJACENT, create_adjacent_group_of_pos } from '../util/create_adjacent_group'
import { POS2number, differenceOf2Groups } from '../util/groups'
import { pairwise } from '../util/pairwise'

function has_dup(board: LiteBoard, groups: Groups): boolean {
  for (const group of groups) {
    const { digits } = parseGroup(board, group)

    for (const v of V) {
      const cnt = digits.filter((digit) => digit === v).length
      if (!(cnt <= 1)) return true
    }
  }

  return false
}

function check_groups(
  board: LiteBoard,
  groups: Groups,
  f_filled: (parsed: ParsedGroup<LiteBoard>) => boolean,
  f_not_filled?: (parsed: ParsedGroup<LiteBoard>) => boolean,
): boolean {
  for (const group of groups) {
    const parsed = parseGroup(board, group)

    if (parsed.filled_all) {
      if (!f_filled(parsed)) return true
    } else {
      if (f_not_filled && !f_not_filled(parsed)) return true
    }
  }

  return false
}

function has_error_rule(board: LiteBoard, rule: Rule): boolean {
  switch (rule.id) {
    case '[Sudoku]': {
      return false
    }
    case '[R]': {
      return has_dup(board, getDisJointGroups(rule))
    }
    case "[R']": {
      const remainders_map = new Set<V>()

      for (const r of IDX0) {
        const group = GROUPS_R[r]

        const { digits, filled_all } = parseGroup(board, group)

        const s = new Set(digits)
        const reminders = V.filter((i) => !s.has(i))

        if (filled_all) {
          if (!(reminders.length === 1)) return true
          else if (remainders_map.has(reminders[0])) return true
          else remainders_map.add(reminders[0])
        }
      }

      return false
    }
    case '[C]':
    case '[B]':
    case '[SG]':
    case "[SG']": {
      return has_dup(board, getDisJointGroups(rule))
    }

    case '[DT]': {
      return has_dup(board, getDisJointGroups(rule))
    }
    case '[LK]': {
      return check_groups(board, rule.render_state.edges, ({ digits }) => Math.abs(digits[0] - digits[1]) === 1)
    }
    case "[LK']": {
      return (
        check_groups(board, rule.render_state.edges, ({ digits }) => Math.abs(digits[0] - digits[1]) === 1) ||
        check_groups(board, differenceOf2Groups(GROUPS_ADJACENT['wasd'], rule.render_state.edges), ({ digits }) => Math.abs(digits[0] - digits[1]) !== 1)
      )
    }
    case '[PO]': {
      return check_groups(board, rule.render_state.edges, ({ digits }) => digits[0] < digits[1])
    }
    case '[LO]': {
      for (const pos of rule.render_state.cells) {
        const cell = board.getCell(pos)
        const digit = cell.digit

        const group = create_adjacent_group_of_pos(pos, 'wasd')
        const { digits } = parseGroup(board, group)

        if (digit) {
          if (!(digits.filter((d) => d).every((d) => d > digit) || digits.filter((d) => d).every((d) => d < digit))) return true
        }
      }

      return false
    }
    case "[LO']": {
      for (const pos of rule.render_state.cells) {
        const cell = board.getCell(pos)
        const digit = cell.digit

        const group = create_adjacent_group_of_pos(pos, 'wasd')
        const { digits, filled_all } = parseGroup(board, group)

        if (digit && filled_all) {
          const avg = Math.floor((digits as number[]).reduce((a, b) => a + b, 0) / digits.length)
          if (!(digit === avg)) return true
        }
      }

      return false
    }
    case '[TP]': {
      return check_groups(board, GROUPS_TP, ({ digits }) => !((digits[0] < digits[1] && digits[1] < digits[2]) || (digits[0] > digits[1] && digits[1] > digits[2])))
    }
    case '[QD]': {
      return check_groups(board, GROUPS_QD, ({ digits }) => digits.some((d) => d % 2 === 0) && digits.some((d) => d % 2 === 1))
    }
    case "[QD']": {
      return check_groups(board, GROUPS_QD, ({ digits }) => (digits as number[]).reduce((a, b) => a + b, 0) % 3 !== 0)
    }

    case '[TM]': {
      for (const { cells: group, color } of rule.render_state.regions) {
        const { digits, filled_all } = parseGroup(board, group)
        const sum = (digits as number[]).reduce((a, b) => a + b, 0)

        switch (color) {
          case 'blue': {
            if (!(sum <= 10)) return true
            break
          }
          case 'green': {
            if (filled_all) {
              if (!(sum === 15)) return true
            } else {
              if (!(sum <= 15)) return true
            }
            break
          }
          case 'red': {
            if (filled_all) {
              if (!(sum >= 20)) return true
            }
            break
          }
        }
      }

      return false
    }
    case '[AQ]': {
      for (const group of rule.render_state.regions) {
        for (let i = 0; i < group.length; i++) {
          const pos1 = group[i]
          const cell1 = board.getCell(pos1)
          const digit1 = cell1.digit
          if (!digit1) continue

          for (let j = i + 1; j < group.length; j++) {
            const pos2 = group[j]
            const cell2 = board.getCell(pos2)
            const digit2 = cell2.digit
            if (!digit2) continue

            if (pos1[0] < pos2[0]) {
              if (!(digit1 < digit2)) return true
            } else if (pos1[0] > pos2[0]) {
              if (!(digit1 > digit2)) return true
            }
          }
        }
      }

      return false
    }
    case '[PA]': {
      const visit = new Set<string>() // `${d1}${d2}`; d1 <= d2

      for (const two_group of rule.render_state.dominoes) {
        const { digits, filled_all } = parseGroup(board, two_group)

        if (filled_all) {
          const s = digits.toSorted().join('')
          if (visit.has(s)) return true
          visit.add(s)
        }
      }

      return false
    }

    case '[MR]': {
      if (has_dup(board, rule.render_state.metros)) return true

      return check_groups(board, rule.render_state.metros, ({ digits }) => digits.toSorted().every((v, i, a) => v - a[0] === i))
    }
    case '[SR]': {
      for (const group of rule.render_state.streams) {
        let type: -1 | 0 | 1 = -1 // -1: 결정되지 않음; 0|1: (r^c^digit)&1

        for (const pos of group) {
          const cell = board.getCell(pos)
          const digit = cell.digit
          if (!digit) continue

          const x = ((pos[0] ^ pos[1] ^ digit) & 1) as 0 | 1
          if (type === -1) {
            type = x
            continue
          }

          if (!(x === type)) return true
        }
      }

      return false
    }
    case '[IV]': {
      return check_groups(
        board,
        rule.render_state.lines,
        ({ digits }) => pairwise(digits).filter(([d1, d2]) => d1 && d2 && d1 > d2).length === 1,
        ({ digits }) => pairwise(digits).filter(([d1, d2]) => d1 && d2 && d1 > d2).length <= 1,
      )
    }

    case '[TR]': {
      if (board.empty_cells.length === 0) {
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

          const curr_cell = board.getCell(curr)
          const curr_digit = curr_cell.digit
          if (!curr_digit) continue

          const next_digit = (curr_digit % 9) + 1

          const adj_group = create_adjacent_group_of_pos(curr, 'wasd')
          for (const npos of adj_group) {
            const npos_num = POS2number(npos)
            if (visited.has(npos_num)) continue

            const ncell = board.getCell(npos)
            const ndigit = ncell.digit
            if (ndigit === next_digit) {
              visited.add(npos_num)
              queue.push(npos)
            }
          }
        }

        return !path_exists
      }

      return false
    }
    case "[TR']": {
      if (board.empty_cells.length === 0) {
        const start = rule.render_state.start
        const end = rule.render_state.end

        const start_num = POS2number(start)
        const end_num = POS2number(end)

        if (start_num === end_num) {
          return true
        }

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
            const u_cell = board.getCell(u_pos)
            const u_digit = u_cell.digit
            if (!u_digit) continue

            const next_digit = (u_digit % 9) + 1
            const neighbors = create_adjacent_group_of_pos(u_pos, 'wasd')

            for (const npos of neighbors) {
              const v = POS2number(npos)
              if (v === start_num) continue

              const v_cell = board.getCell(npos)
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

        return totalFlow < 2
      }

      return false
    }
    case '[BD]': {
      if (board.empty_cells.length === 0) {
        const maxR = Array(9).fill(-1) // 열 c마다 이미 점유된 최대 r

        for (const start_r of rule.render_state.start_rows) {
          const pos1 = POSSchema.parse([start_r, 0])
          const cell1 = board.getCell(pos1)
          const digit1 = cell1.digit

          function findPathFromStart(startR: IDX0): number[] | null {
            const path = Array(9).fill(-1)

            function dfs(r: IDX0, c: IDX0): boolean {
              if (r <= maxR[c]) return false

              const pos = POSSchema.parse([r, c])
              const cell = board.getCell(pos)
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
            return true
          }

          for (const c of IDX0) {
            maxR[c] = Math.max(maxR[c], path[c])
          }
        }
      }

      return false
    }

    case '[VT]': {
      for (const [r, c, dir] of rule.render_state.arrows) {
        const pos = POSSchema.parse([r, c])
        const cell = board.getCell(pos)
        const digit = cell.digit

        if (digit) {
          const [dir_dr, dir_dc] = DirMap[dir]

          const r2 = r + dir_dr * digit
          const c2 = c + dir_dc * digit

          const pos2 = POSSchema.safeParse([r2, c2])
          if (!pos2.success) return true

          const cell2 = board.getCell(pos2.data)
          const digit2 = cell2.digit

          if (digit2) {
            if (!(digit2 === 9)) return true
          }
        }
      }

      return false
    }
    case '[RT]': {
      for (const [r1, c1, dd] of rule.render_state.cells) {
        const pos1 = POSSchema.parse([r1, c1])
        const cell1 = board.getCell(pos1)
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

                const cell2 = board.getCell(pos2.data)
                const digit2 = cell2.digit

                if (digit1 === digit2) return true
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

          const { digits, filled_all } = parseGroup(board, group)
          if (filled_all) {
            if (!digits.includes(digit1)) return true
          }
        }
      }

      return false
    }
    case "[RT']": {
      for (const [r1, c1, dd] of rule.render_state.cells) {
        const pos1 = POSSchema.parse([r1, c1])
        const cell1 = board.getCell(pos1)
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

                const cell2 = board.getCell(pos2.data)
                const digit2 = cell2.digit

                if (digit1 === digit2) return true
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

          const { digits, filled_all } = parseGroup(board, group)
          if (filled_all) {
            if (!digits.includes(digit1)) return true
          }
        }
      }

      return false
    }
    case '[RF]': {
      for (const [type, i] of rule.render_state.lines) {
        if (type === 'ROW') {
          const r = i
          for (const c of IDX0) {
            const pos = POSSchema.parse([r, c])
            const cell = board.getCell(pos)
            const digit = cell.digit
            if (!digit) continue

            const pos2 = POSSchema.parse([digit - 1, c])
            const cell2 = board.getCell(pos2)
            const digit2 = cell2.digit
            if (!digit2) continue

            if (!(digit2 - 1 === r)) return true
          }
        } else {
          const c = i
          for (const r of IDX0) {
            const pos = POSSchema.parse([r, c])
            const cell = board.getCell(pos)
            const digit = cell.digit
            if (!digit) continue

            const pos2 = POSSchema.parse([r, digit - 1])
            const cell2 = board.getCell(pos2)
            const digit2 = cell2.digit
            if (!digit2) continue

            if (!(digit2 - 1 === c)) return true
          }
        }
      }

      return false
    }

    case '[MT]': {
      const { digits, filled_all } = parseGroup(board, rule.render_state.diamond_cells)

      for (const v of V) {
        const cnt = digits.filter((digit) => digit === v).length
        if (cnt === 0) continue

        if (filled_all) {
          if (!(cnt === v)) return true
        } else {
          if (!(cnt <= v)) return true
        }
      }

      return false
    }
    case '[BP]': {
      const type_arr: ('no' | 'yes' | 'unknown')[][] = Array.from({ length: 9 }, () => Array(9).fill('unknown'))

      for (const r of IDX0) {
        for (const c of IDX0) {
          const pos = POSSchema.parse([r, c])
          const cell = board.getCell(pos)
          const digit = cell.digit

          const group = create_adjacent_group_of_pos(pos, 'wasd')
          const { digits, filled_all } = parseGroup(board, group)

          if (digit && digits.filter((d) => d).some((d) => Math.abs(d - digit) < 3)) type_arr[r][c] = 'no'
          else if (digit && filled_all) type_arr[r][c] = digits.every((d) => Math.abs(d - digit) >= 3) ? 'yes' : 'no'
          else type_arr[r][c] = 'unknown'
        }
      }

      for (const r of IDX0) {
        let cnt_yes = 0
        let cnt_no = 0
        for (const c of IDX0) {
          if (type_arr[r][c] === 'yes') cnt_yes++
          else if (type_arr[r][c] === 'no') cnt_no++
        }

        if (!(cnt_yes <= 1)) return true
        else if (!(cnt_no < 9)) return true
      }
      for (const c of IDX0) {
        let cnt_yes = 0
        let cnt_no = 0
        for (const r of IDX0) {
          if (type_arr[r][c] === 'yes') cnt_yes++
          else if (type_arr[r][c] === 'no') cnt_no++
        }

        if (!(cnt_yes <= 1)) return true
        else if (!(cnt_no < 9)) return true
      }

      return false
    }
    case '[EF]': {
      const set = new Set(rule.render_state.marked_cells.map(POS2number))

      for (const pos of rule.render_state.marked_cells) {
        const cell = board.getCell(pos)
        const digit = cell.digit

        if (digit) {
          const group = create_adjacent_group_of_pos(pos, 'king').filter((pos) => set.has(POS2number(pos)))
          group.push(pos) // 자기 자신도 포함

          const { digits, filled_all } = parseGroup(board, group)
          const cnt = digits.filter((d) => d).filter((d) => d <= digit).length

          if (filled_all) {
            if (!(cnt === digit)) return true
          } else {
            if (!(cnt <= digit)) return true
          }
        }
      }

      return false
    }

    case '[ES]': {
      const visited = Array.from({ length: 9 }, () => new Uint8Array(9))

      for (const r of IDX0) {
        for (const c of IDX0) {
          if (visited[r][c]) continue

          const pos = POSSchema.parse([r, c])
          const cell = board.getCell(pos)
          const digit = cell.digit
          const is_potential_even = !digit || digit % 2 === 0

          if (is_potential_even) {
            const queue = [pos]
            visited[r][c] = 1

            let touches_edge = false
            let has_filled_even = digit && digit % 2 === 0

            while (queue.length > 0) {
              const curr = queue.shift()!
              if (curr[0] === 0 || curr[0] === 8) {
                touches_edge = true
              }

              const adj = create_adjacent_group_of_pos(curr, 'wasd')
              for (const npos of adj) {
                const [nr, nc] = npos
                if (!visited[nr][nc]) {
                  const ncell = board.getCell(npos)
                  const ndigit = ncell.digit
                  if (!ndigit || ndigit % 2 === 0) {
                    visited[nr][nc] = 1
                    queue.push(npos)
                    if (ndigit && ndigit % 2 === 0) {
                      has_filled_even = true
                    }
                  }
                }
              }
            }

            if (!touches_edge && has_filled_even) {
              return true
            }
          }
        }
      }

      return false
    }
    case '[EP]': {
      const visited = Array.from({ length: 9 }, () => new Uint8Array(9))

      for (const r of IDX0) {
        for (const c of IDX0) {
          if (visited[r][c]) continue

          const pos = POSSchema.parse([r, c])
          const cell = board.getCell(pos)
          const digit = cell.digit
          if (digit >= 1 && digit <= 4) {
            const queue = [pos]
            visited[r][c] = 1

            let size = 0
            let has_adjacent_empty = false

            while (queue.length > 0) {
              const curr = queue.shift()!
              size++

              const adj = create_adjacent_group_of_pos(curr, 'wasd')
              for (const npos of adj) {
                const [nr, nc] = npos
                const ncell = board.getCell(npos)
                const ndigit = ncell.digit
                if (ndigit === 0) {
                  has_adjacent_empty = true
                } else if (!visited[nr][nc] && ndigit >= 1 && ndigit <= 4) {
                  visited[nr][nc] = 1
                  queue.push(npos)
                }
              }
            }

            if (size >= 4) return true
            if (size < 3 && !has_adjacent_empty) return true
          }
        }
      }

      return false
    }

    case '[PR]': {
      for (const [r1, c1, r2, c2, isred] of rule.render_state.edges) {
        const group: Group = [
          [r1, c1],
          [r2, c2],
        ]
        group.sort((pos1, pos2) => POS2number(pos1) - POS2number(pos2))
        const { digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (isred) {
            if (!Prime2Set.has(parseInt(digits.join('')))) return true
          } else {
            if (!Square2Set.has(parseInt(digits.join('')))) return true
          }
        }
      }

      return false
    }
    case "[PR']": {
      for (const [r1, c1, r2, c2, r3, c3, isred] of rule.render_state.triplets) {
        const group: Group = [
          [r1, c1],
          [r2, c2],
          [r3, c3],
        ]
        group.sort((pos1, pos2) => POS2number(pos1) - POS2number(pos2))
        const { digits, filled_all } = parseGroup(board, group)

        if (filled_all) {
          if (isred) {
            if (!Prime3Set.has(parseInt(digits.join('')))) return true
          } else {
            if (!Square3Set.has(parseInt(digits.join('')))) return true
          }
        }
      }

      return false
    }

    case '[QT]': {
      for (const [type, i, [x, y]] of rule.render_state.side_hints) {
        const group = getLineGroup(type, i)
        const cellX = board.getCell(group[x - 1])
        const digitX = cellX.digit
        const cellY = board.getCell(group[y - 1])
        const digitY = cellY.digit

        if (!digitX || !digitY) continue

        const xthIsY = digitX === y
        const ythIsX = digitY === x

        if (xthIsY === ythIsX) return true
      }

      return false
    }
    case '[RG]': {
      for (const [type, index, arr] of rule.render_state.side_hints) {
        const expectedDistances = new Set<number>(arr)

        const group = getLineGroup(type, index)
        const { digits, filled_all } = parseGroup(board, group)
        const distances = new Set<number>()

        for (let i = 0; i < digits.length; i++) {
          for (let j = i + 1; j < digits.length; j++) {
            if ((digits[i] === 1 && digits[j] === 9) || (digits[i] === 9 && digits[j] === 1)) {
              distances.add(j - i)
            }
          }
        }

        for (const distance of distances) {
          if (!expectedDistances.has(distance)) return true
        }

        if (filled_all && distances.size === 0) return true
      }

      return false
    }
    case "[RG']": {
      const records: { letter: RangeLetter; distance: number }[] = []

      for (const [type, index, letter] of rule.render_state.side_hints) {
        const group = getLineGroup(type, index)
        const { digits, filled_all } = parseGroup(board, group)
        const distances = new Set<number>()

        for (let i = 0; i < digits.length; i++) {
          for (let j = i + 1; j < digits.length; j++) {
            if ((digits[i] === 1 && digits[j] === 9) || (digits[i] === 9 && digits[j] === 1)) {
              distances.add(j - i)
            }
          }
        }

        if (distances.size >= 2) return true
        if (filled_all && distances.size === 0) return true

        if (distances.size === 1) {
          const distance = distances.values().next().value!
          for (const record of records) {
            if ((record.letter === letter && record.distance !== distance) || (record.letter !== letter && record.distance === distance)) return true
          }
          records.push({ letter, distance })
        }
      }

      return false
    }
    case '[PD]': {
      for (const [type, i, x] of rule.render_state.side_hints) {
        const line = getLineGroup(type, i)
        const group = type === 'ROW_LEFT' || type === 'COL_TOP' ? line.slice(0, 3) : line.slice(-3)

        const { digits, filled_all } = parseGroup(board, group)
        if (filled_all) {
          if (!((digits as number[]).reduce((a, b) => a * b, 1) === x)) return true
        }
      }

      return false
    }
    case '[SQ]': {
      for (const [type, i, arr] of rule.render_state.side_hints) {
        const group = getLineGroup(type, i)

        const { digits, filled_all } = parseGroup(board, group)
        if (filled_all) {
          const group2 = group.filter((_, i) => arr.includes(digits[i]))

          const { digits: digits2, filled_all: filled_all2 } = parseGroup(board, group2)
          if (!filled_all2) throw new Error('unreachable')

          let i = 0
          let j = 0

          while (i < arr.length && j < digits2.length) {
            const value = arr[i]

            if (digits2[j] !== value) return true

            let count1 = 0
            while (i < arr.length && arr[i] === value) {
              ++count1
              ++i
            }

            let count2 = 0
            while (j < digits2.length && digits2[j] === value) {
              ++count2
              ++j
            }

            if (count2 < count1) return true
          }

          if (i !== arr.length || j !== digits2.length) return true
        }
      }

      return false
    }
    case "[SQ']": {
      for (const [type, i, arr] of rule.render_state.side_hints) {
        const group = getLineGroup(type, i)

        const { digits, filled_all } = parseGroup(board, group)
        if (filled_all) {
          const lmhs = digits.map((d) => (d <= 3 ? 'L' : d <= 6 ? 'M' : 'H'))

          let j = 0

          for (const x of lmhs) {
            if (j < arr.length && x === arr[j]) {
              ++j
            }
          }

          if (!(j === arr.length)) return true
        }
      }

      return false
    }

    case '[ST]': {
      for (const piece of rule.render_state.pieces) {
        const values = Object.entries(piece.values).map(([key, value]) => {
          const [r, c] = key.split(',').map(Number)
          return { pos: POSSchema.parse([r, c]), value }
        })
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

        const variants = []
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

        for (const variant of variants) {
          for (let ro = 0; ro <= 9 - variant.height; ro++) {
            for (let co = 0; co <= 9 - variant.width; co++) {
              let matched = true

              for (const {
                pos: [r, c],
                value,
              } of variant.values) {
                const pos = POSSchema.parse([ro + r, co + c])
                if (board.getCell(pos).digit !== value) {
                  matched = false
                  break
                }
              }

              if (matched) return true
            }
          }
        }
      }

      return false
    }
  }
}

export function has_error(board: LiteBoard, rules?: Rule[]): boolean {
  for (const rule of (rules ?? board.rules).filter(isKnown)) {
    if (has_error_rule(board, rule)) return true
  }
  return false
}

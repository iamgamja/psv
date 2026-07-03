import { getDisJointGroups, GROUPS_QD, GROUPS_R, GROUPS_TP } from '../const/groups'
import { Prime2Set, Square2Set, Prime3Set, Square3Set, distanceMap, distances } from '../const/check_helper'
import { IDX0, IDX0Schema, POSSchema, V } from '../types/base'
import type { DigitArr } from '../types/Board'
import { DirMap, isKnown, type Rule } from '../types/Rule'
import { type Group, type Groups, type TwoGroups, type POS } from '../types/base'
import { create_adjacent_group_of_pos, GROUPS_ADJACENT } from '../util/create_adjacent_group'
import { differenceOf2Groups, POS2Digit, POS2number } from '../util/groups'
import { pairwise } from '../util/pairwise'

type ParsedGroup =
  | {
      digits: V[]
      sub_groups: Map<V, Group>
      filled_all: true
    }
  | {
      digits: (V | 0)[]
      sub_groups: Map<V, Group>
      filled_all: false
    }
export function parseGroup(digit_arr: DigitArr, group: Group): ParsedGroup {
  const digits = group.map((pos) => POS2Digit(digit_arr, pos))
  const filled_all = digits.every((digit) => digit)

  const sub_groups = new Map<V, Group>()
  for (let i = 0; i < group.length; i++) {
    const digit = digits[i]
    if (digit) {
      if (!sub_groups.has(digit)) sub_groups.set(digit, [])
      sub_groups.get(digit)!.push(group[i])
    }
  }

  return {
    digits,
    sub_groups,
    filled_all,
  } as ParsedGroup
}

function has_dup(digit_arr: DigitArr, groups: Groups): boolean {
  for (const group of groups) {
    const { sub_groups } = parseGroup(digit_arr, group)

    for (const group of sub_groups.values()) if (!(group.length <= 1)) return true
  }

  return false
}

/** @returns 어떤 완성된 그룹이 f를 만족하지 않으면 true */
function has_2groups(digit_arr: DigitArr, groups: TwoGroups, f: (d1: V, d2: V) => boolean): boolean {
  for (const group of groups) {
    const { digits, filled_all } = parseGroup(digit_arr, group)

    if (filled_all) {
      if (!f(digits[0], digits[1])) return true
    }
  }

  return false
}

function has_error_rule(digit_arr: DigitArr, rule: Rule): boolean {
  switch (rule.id) {
    case '[Sudoku]':
      return false
    case '[R]':
    case '[C]':
    case '[B]':
    case '[SG]':
    case "[SG']":
    case '[DT]':
      return has_dup(digit_arr, getDisJointGroups(rule))

    case '[LK]':
      return has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1)
    case "[LK']": {
      return (
        has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => Math.abs(d1 - d2) === 1) ||
        has_2groups(digit_arr, differenceOf2Groups(GROUPS_ADJACENT['wasd'], rule.render_state.edges), (d1, d2) => Math.abs(d1 - d2) !== 1)
      )
    }

    case '[MT]': {
      const { sub_groups, filled_all } = parseGroup(digit_arr, rule.render_state.diamond_cells)

      if (filled_all) {
        if (!Array.from(sub_groups.entries()).every(([v, s]) => s.length === v)) return true
      } else {
        if (!Array.from(sub_groups.entries()).every(([v, s]) => s.length <= v)) return true
      }

      return false
    }

    case '[MR]': {
      if (has_dup(digit_arr, rule.render_state.metros)) return true

      for (const group of rule.render_state.metros) {
        const { digits, filled_all } = parseGroup(digit_arr, group)

        if (filled_all) {
          if (!digits.toSorted().every((v, i, a) => v - a[0] === i)) return true
        }
      }

      return false
    }

    case '[QD]': {
      for (const group of GROUPS_QD) {
        const { digits, filled_all } = parseGroup(digit_arr, group)

        if (filled_all) {
          if (!(digits.some((d) => d % 2 === 0) && digits.some((d) => d % 2 === 1))) return true
        }
      }
      return false
    }
    case "[QD']": {
      for (const group of GROUPS_QD) {
        const { digits, filled_all } = parseGroup(digit_arr, group)

        if (filled_all) {
          if (!(digits.reduce((a, b) => a + b, 0) % 3 !== 0)) return true
        }
      }
      return false
    }

    case '[TP]': {
      for (const group of GROUPS_TP) {
        const { digits, filled_all } = parseGroup(digit_arr, group)

        if (filled_all) {
          if (digits[0] < digits[1] && digits[1] < digits[2]) return true
          else if (digits[0] > digits[1] && digits[1] > digits[2]) return true
        }
      }

      return false
    }

    case '[LO]': {
      for (const pos of rule.render_state.cells) {
        const digit = POS2Digit(digit_arr, pos)

        const group = create_adjacent_group_of_pos(pos, 'wasd')
        const { digits } = parseGroup(digit_arr, group)

        if (digit) {
          if (!(digits.filter((d) => d).every((d) => d > digit) || digits.filter((d) => d).every((d) => d < digit))) return true
        }
      }

      return false
    }
    case "[LO']": {
      for (const pos of rule.render_state.cells) {
        const digit = POS2Digit(digit_arr, pos)

        const group = create_adjacent_group_of_pos(pos, 'wasd')
        const { digits, filled_all } = parseGroup(digit_arr, group)

        if (digit && filled_all) {
          const avg = Math.floor(digits.reduce((a, b) => a + b, 0) / digits.length)
          if (!(digit === avg)) return true
        }
      }

      return false
    }

    case '[BP]': {
      type type_arr = ('no' | 'yes' | 'unknown')[][]
      const type_arr: type_arr = Array.from({ length: 9 }, () => Array(9).fill('unknown'))

      for (const r of IDX0) {
        for (const c of IDX0) {
          const pos = POSSchema.parse([r, c])
          const digit = POS2Digit(digit_arr, pos)

          const group = create_adjacent_group_of_pos(pos, 'wasd')
          const { digits, filled_all } = parseGroup(digit_arr, group)

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

    case '[PO]':
      return has_2groups(digit_arr, rule.render_state.edges, (d1, d2) => d1 < d2)

    case "[R']": {
      const remainders_map = new Set<V>()

      for (const r of IDX0) {
        const group = GROUPS_R[r]

        const { digits, filled_all } = parseGroup(digit_arr, group)

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

    case '[PR]': {
      for (const [r1, c1, r2, c2, isred] of rule.render_state.edges) {
        const group: Group = [
          [r1, c1],
          [r2, c2],
        ]
        const { digits, filled_all } = parseGroup(digit_arr, group)

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
        const { digits, filled_all } = parseGroup(digit_arr, group)

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

    case '[RT]': {
      for (const [r1, c1, dd] of rule.render_state.cells) {
        const pos1 = POSSchema.parse([r1, c1])
        const digit1 = POS2Digit(digit_arr, pos1)

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

                const digit2 = POS2Digit(digit_arr, pos2.data)

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

          const { digits, filled_all } = parseGroup(digit_arr, group)
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
        const digit1 = POS2Digit(digit_arr, pos1)

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

                const digit2 = POS2Digit(digit_arr, pos2.data)

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

          const { digits, filled_all } = parseGroup(digit_arr, group)
          if (filled_all) {
            if (!digits.includes(digit1)) return true
          }
        }
      }

      return false
    }

    case '[PA]': {
      const visit = new Set<string>() // `${d1}${d2}`; d1 <= d2

      for (const two_group of rule.render_state.dominoes) {
        const { digits, filled_all } = parseGroup(digit_arr, two_group)

        if (filled_all) {
          const s = digits.toSorted().join('')
          if (visit.has(s)) return true
          visit.add(s)
        }
      }

      return false
    }

    case '[VT]': {
      for (const [r, c, dir] of rule.render_state.arrows) {
        const pos = POSSchema.parse([r, c])
        const digit = POS2Digit(digit_arr, pos)

        if (digit) {
          const [dir_dr, dir_dc] = DirMap[dir]

          const r2 = r + dir_dr * digit
          const c2 = c + dir_dc * digit

          const pos2 = POSSchema.safeParse([r2, c2])
          if (!pos2.success) return true

          const digit2 = POS2Digit(digit_arr, pos2.data)

          if (digit2) {
            if (!(digit2 === 9)) return true
          }
        }
      }

      return false
    }

    case '[EF]': {
      const set = new Set(rule.render_state.marked_cells.map(POS2number))

      for (const pos of rule.render_state.marked_cells) {
        const digit = POS2Digit(digit_arr, pos)

        if (digit) {
          const group = create_adjacent_group_of_pos(pos, 'king').filter((pos) => set.has(POS2number(pos)))
          group.push(pos) // 자기 자신도 포함

          const { digits, filled_all } = parseGroup(digit_arr, group)
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

    case '[TM]': {
      for (const { cells: group, color } of rule.render_state.regions) {
        const { digits, filled_all } = parseGroup(digit_arr, group)
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
          const digit1 = POS2Digit(digit_arr, pos1)
          if (!digit1) continue

          for (let j = i + 1; j < group.length; j++) {
            const pos2 = group[j]
            const digit2 = POS2Digit(digit_arr, pos2)
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

    case '[RF]': {
      for (const [type, i] of rule.render_state.lines) {
        if (type === 'ROW') {
          const r = i
          for (const c of IDX0) {
            const pos = POSSchema.parse([r, c])
            const digit = POS2Digit(digit_arr, pos)
            if (!digit) continue

            const pos2 = POSSchema.parse([digit - 1, c])
            const digit2 = POS2Digit(digit_arr, pos2)
            if (!digit2) continue

            if (!(digit2 - 1 === r)) return true
          }
        } else {
          const c = i
          for (const r of IDX0) {
            const pos = POSSchema.parse([r, c])
            const digit = POS2Digit(digit_arr, pos)
            if (!digit) continue

            const pos2 = POSSchema.parse([r, digit - 1])
            const digit2 = POS2Digit(digit_arr, pos2)
            if (!digit2) continue

            if (!(digit2 - 1 === c)) return true
          }
        }
      }

      return false
    }

    case '[SR]': {
      for (const group of rule.render_state.streams) {
        let type: -1 | 0 | 1 = -1 // -1: 결정되지 않음; 0|1: (r^c^digit)&1

        for (const pos of group) {
          const digit = POS2Digit(digit_arr, pos)
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
      for (const group of rule.render_state.lines) {
        const { digits, filled_all } = parseGroup(digit_arr, group)
        const cnt = pairwise(digits).filter(([d1, d2]) => d1 && d2 && d1 > d2).length

        if (filled_all) {
          if (!(cnt === 1)) return true
        } else {
          if (!(cnt <= 1)) return true
        }
      }

      return false
    }

    case '[BD]': {
      if (digit_arr.flat().every((digit) => digit)) {
        const maxR = Array(9).fill(-1) // 열 c마다 이미 점유된 최대 r

        for (const start_r of rule.render_state.start_rows) {
          const pos1 = POSSchema.parse([start_r, 0])
          const digit1 = POS2Digit(digit_arr, pos1)

          function findPathFromStart(startR: IDX0): number[] | null {
            const path = Array(9).fill(-1)

            function dfs(r: IDX0, c: IDX0): boolean {
              if (r <= maxR[c]) return false

              const pos = POSSchema.parse([r, c])
              const digit = POS2Digit(digit_arr, pos)
              if (!(digit === ((digit1 + c - 1) % 9) + 1)) return false

              path[c] = r

              if (c === 8) return true

              for (const dr of [-1, 0, +1]) {
                const r2 = IDX0Schema.safeParse(r + dr)
                if (!r2.success) continue

                if (dfs(r2.data, IDX0Schema.parse(c + 1))) return true
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

          for (let c = 0; c <= 8; c++) {
            maxR[c] = Math.max(maxR[c], path[c])
          }
        }
      }

      return false
    }

    case '[TR]': {
      if (digit_arr.flat().every((digit) => digit)) {
        const start = rule.render_state.start
        const end = rule.render_state.end

        const visited = new Set<number>()
        const queue: POS[] = [start]
        visited.add(POS2number(start))
        let path_exists = false

        while (queue.length > 0) {
          const curr = queue.shift()!
          if (curr[0] === end[0] && curr[1] === end[1]) {
            path_exists = true
            break
          }

          const curr_digit = POS2Digit(digit_arr, curr)
          if (!curr_digit) continue

          const next_digit = (curr_digit % 9) + 1

          const adj_group = create_adjacent_group_of_pos(curr, 'wasd')
          for (const npos of adj_group) {
            const npos_num = POS2number(npos)
            if (visited.has(npos_num)) continue

            const ndigit = POS2Digit(digit_arr, npos)
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
      if (digit_arr.flat().every((digit) => digit)) {
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

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const u = r * 9 + c
            if (u === end_num) continue

            const u_pos: POS = [r as IDX0, c as IDX0]
            const u_digit = POS2Digit(digit_arr, u_pos)
            if (!u_digit) continue

            const next_digit = (u_digit % 9) + 1
            const neighbors = create_adjacent_group_of_pos(u_pos, 'wasd')

            for (const npos of neighbors) {
              const v = POS2number(npos)
              if (v === start_num) continue

              const v_digit = POS2Digit(digit_arr, npos)
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

    case '[ES]': {
      const visited = Array.from({ length: 9 }, () => new Uint8Array(9))

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (visited[r][c]) continue

          const digit = digit_arr[r][c]
          const is_potential_even = !digit || digit % 2 === 0

          if (is_potential_even) {
            const queue: POS[] = [[r as IDX0, c as IDX0]]
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
                  const ndigit = digit_arr[nr][nc]
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
  }
}

export function has_error(digit_arr: DigitArr, rules: Rule[]): boolean {
  for (const rule of rules.filter(isKnown)) {
    if (has_error_rule(digit_arr, rule)) return true
  }
  return false
}

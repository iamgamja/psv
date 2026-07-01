import { SIZE_CELL } from '../const/const'
import { getDisJointGroups, GROUPS_R } from '../const/groups'
import { IDX0, POSSchema } from '../types/base'
import type { Board } from '../types/Board'
import { DirMap, isKnown, type Rule } from '../types/Rule'
import { type Group } from '../types/base'
import { GROUPS_ADJACENT } from '../util/create_adjacent_group'
import { hasPOSs, POS2number } from '../util/groups'
import { pairwise } from '../util/pairwise'
import { SoftDistinctColorGenerator } from '../util/SoftDistinctColorGenerator'

const container = document.querySelector('#board-container')!
const W = container.clientWidth
const H = container.clientHeight

const svg = document.querySelector<SVGSVGElement>('#rule-render-svg')!
svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

// ---------

type POSlike = [number, number]

type X = number
type Y = number
type Coord = [X, Y]

function calculateCenter(pos1: POSlike, pos2?: POSlike | null): Coord {
  if (!pos2) return [(pos1[1] + 1) * SIZE_CELL + SIZE_CELL / 2, (pos1[0] + 1) * SIZE_CELL + SIZE_CELL / 2]

  const [x1, y1] = calculateCenter(pos1)
  const [x2, y2] = calculateCenter(pos2)
  return [(x1 + x2) / 2, (y1 + y2) / 2]
}

// ---------

const DrawWidth = {
  border_light: 0.5,
  border_regular: 1,
  border_heavy: 3,

  hint_lightest: 3,
  hint_light: 6,
  hint_regular: 10,
  hint_heavy: 25,
} as const

const DrawRadius = {
  smallest: SIZE_CELL * 0.1,
  small: SIZE_CELL * 0.2,
  regular: SIZE_CELL * 0.35,
  big: SIZE_CELL * 0.45,
} as const

const DrawTextSize = {
  small: SIZE_CELL * 0.3,
  regular: SIZE_CELL * 0.5,
  big: SIZE_CELL * 0.8,
}

interface DrawOptions {
  dotted?: boolean
  stroke_color?: string
  fill_color?: string
  thickness?: keyof typeof DrawWidth
  size?: keyof typeof DrawRadius
}

interface ParsedDrawOptions {
  dotted: boolean
  stroke_color: string
  fill_color: string
  strokeWidth: number
  r: number
}

interface DrawLineOptions {
  dotted?: boolean
  color?: string
  thickness?: keyof typeof DrawWidth
  round?: boolean
}

interface ParsedDrawLineOptions {
  dotted: boolean
  color: string
  strokeWidth: number
  round: boolean
}

interface DrawTextOptions {
  color?: string
  fontSize?: keyof typeof DrawTextSize
  align?: 'left' | 'center' | 'right'
}

interface ParsedDrawTextOptions {
  color: string
  fontSize: number
  align: 'left' | 'center' | 'right'
}

function parseDrawOptions(options?: DrawOptions): ParsedDrawOptions {
  return {
    dotted: options?.dotted ?? false,
    stroke_color: options?.stroke_color ?? '#000000',
    fill_color: options?.fill_color ?? '#ffffff',
    strokeWidth: options?.thickness ? DrawWidth[options.thickness] : DrawWidth.border_regular,
    r: options?.size ? DrawRadius[options.size] : DrawRadius.regular,
  }
}

function parseDrawLineOptions(options?: DrawLineOptions): ParsedDrawLineOptions {
  return {
    dotted: options?.dotted ?? false,
    color: options?.color ?? '#000000',
    strokeWidth: options?.thickness ? DrawWidth[options.thickness] : DrawWidth.border_regular,
    round: options?.round ?? true,
  }
}

function parseDrawTextOptions(options?: DrawTextOptions): ParsedDrawTextOptions {
  return {
    color: options?.color ?? '#000000',
    fontSize: options?.fontSize ? DrawTextSize[options.fontSize] : DrawTextSize.small,
    align: options?.align ?? 'center',
  }
}

const Draw = {
  _createRectangle(w: Y, a: X, s: Y, d: X, { dotted, stroke_color, fill_color, strokeWidth }: ParsedDrawOptions) {
    const ele = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

    ele.setAttribute('x', a.toString())
    ele.setAttribute('y', w.toString())
    ele.setAttribute('width', (d - a).toString())
    ele.setAttribute('height', (s - w).toString())
    ele.setAttribute('fill', fill_color)
    ele.setAttribute('stroke', stroke_color)
    ele.setAttribute('stroke-width', strokeWidth.toString())
    if (dotted) ele.setAttribute('stroke-dasharray', '2')

    svg.appendChild(ele)
  },
  /**
   * @param n 정다각형의 변 개수
   * @param direction radian 단위. 오른쪽을 0으로 하고, 반시계방향을 +로 한다.
   */
  _createPolygon(x: X, y: Y, n: number, direction: number, { dotted, stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
    const ele = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

    const points = Array.from({ length: n }, (_, i) => {
      const angle = direction + 2 * Math.PI * (i / n)

      return `${x + r * Math.cos(angle)},${y - r * Math.sin(angle)}`
    })

    ele.setAttribute('points', points.join(' '))

    ele.setAttribute('fill', fill_color)
    ele.setAttribute('stroke', stroke_color)
    ele.setAttribute('stroke-width', strokeWidth.toString())
    if (dotted) ele.setAttribute('stroke-dasharray', '2')

    svg.appendChild(ele)
  },
  _createLine(x1: X, y1: Y, x2: X, y2: Y, { dotted, color, strokeWidth, round }: ParsedDrawLineOptions) {
    const ele = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    ele.setAttribute('x1', x1.toString())
    ele.setAttribute('y1', y1.toString())
    ele.setAttribute('x2', x2.toString())
    ele.setAttribute('y2', y2.toString())
    ele.setAttribute('stroke', color)
    ele.setAttribute('stroke-width', strokeWidth.toString())
    if (round) ele.setAttribute('stroke-linecap', 'round')
    if (dotted) ele.setAttribute('stroke-dasharray', '2')

    svg.appendChild(ele)
  },
  _createText(x: X, y: Y, text: string, { color, fontSize, align }: ParsedDrawTextOptions) {
    const ele = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    ele.setAttribute('x', x.toString())
    ele.setAttribute('y', y.toString())
    ele.setAttribute('fill', color)
    ele.setAttribute('font-size', fontSize.toString())

    ele.setAttribute('text-anchor', align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle')

    ele.setAttribute('dominant-baseline', 'middle')

    ele.textContent = text

    svg.appendChild(ele)
  },

  Circle(pos1: POSlike, pos2?: POSlike | null, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: !pos2 ? 'regular' : 'smallest',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    Draw._createPolygon(x, y, 50, 0, parseDrawOptions(options))
  },
  Diamond(pos1: POSlike, pos2?: POSlike | null, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: !pos2 ? 'regular' : 'smallest',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    Draw._createPolygon(x, y, 4, 0, parseDrawOptions(options))
  },
  Triangle(pos1: POSlike, pos2?: POSlike | null, options_?: DrawOptions & { direction?: number }) {
    const options: DrawOptions = {
      size: !pos2 ? 'regular' : 'small',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    const direction = !pos2 ? (options_?.direction ?? 0) : Math.atan2(-(pos2[0] - pos1[0]), pos2[1] - pos1[1])
    Draw._createPolygon(x, y, 3, direction, parseDrawOptions(options))
  },
  Hexagon(pos1: POSlike, pos2?: POSlike | null, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: !pos2 ? 'regular' : 'small',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    Draw._createPolygon(x, y, 6, 0, parseDrawOptions(options))
  },

  Divider(pos1: POSlike, pos2: POSlike, options?: DrawLineOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)
    const [cx, cy] = calculateCenter(pos1, pos2)

    const newX1 = cx - (y1 - cy)
    const newY1 = cy + (x1 - cx)
    const newX2 = cx - (y2 - cy)
    const newY2 = cy + (x2 - cx)

    Draw._createLine(newX1, newY1, newX2, newY2, parseDrawLineOptions(options))
  },
  Line(pos1: POSlike, pos2: POSlike, options?: DrawLineOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)

    Draw._createLine(x1, y1, x2, y2, parseDrawLineOptions(options))
  },
  Cage(group: Group, options_?: DrawOptions) {
    const parsedRectOptions = parseDrawOptions({
      size: 'regular',
      ...options_,
      dotted: false,
      stroke_color: '#00000000',
    })
    const parsedLineOptions = parseDrawLineOptions({
      dotted: options_?.dotted,
      color: options_?.stroke_color,
      thickness: 'border_regular',
    })

    const r = parsedRectOptions.r

    const set = new Set(group.map(POS2number))

    for (const pos of group) {
      const hasPos = (dr: number, dc: number) => {
        const parsed = POSSchema.safeParse([pos[0] + dr, pos[1] + dc])
        return parsed.success && set.has(POS2number(parsed.data))
      }
      const has_map = {
        Q: hasPos(-1, -1),
        W: hasPos(-1, 0),
        E: hasPos(-1, 1),

        A: hasPos(0, -1),
        D: hasPos(0, 1),

        Z: hasPos(1, -1),
        X: hasPos(1, 0),
        C: hasPos(1, 1),
      }

      const [x, y] = calculateCenter(pos)

      const W = y - SIZE_CELL / 2
      const A = x - SIZE_CELL / 2
      const S = y + SIZE_CELL / 2
      const D = x + SIZE_CELL / 2

      const w = y - r
      const a = x - r
      const s = y + r
      const d = x + r

      // fill
      Draw._createRectangle(w, a, s, d, parsedRectOptions)
      if (has_map.W) Draw._createRectangle(W, a, w, d, parsedRectOptions)
      if (has_map.A) Draw._createRectangle(w, A, s, a, parsedRectOptions)
      if (has_map.X) Draw._createRectangle(s, a, S, d, parsedRectOptions)
      if (has_map.D) Draw._createRectangle(w, d, s, D, parsedRectOptions)

      if (has_map.Q && has_map.W && has_map.A) Draw._createRectangle(W, A, w, a, parsedRectOptions)
      if (has_map.E && has_map.W && has_map.D) Draw._createRectangle(W, d, w, D, parsedRectOptions)

      if (has_map.Z && has_map.X && has_map.A) Draw._createRectangle(s, A, S, a, parsedRectOptions)
      if (has_map.C && has_map.X && has_map.D) Draw._createRectangle(s, d, S, D, parsedRectOptions)

      // stroke
      if (!has_map.W) Draw._createLine(a, w, d, w, parsedLineOptions)
      if (!has_map.A) Draw._createLine(a, w, a, s, parsedLineOptions)
      if (!has_map.X) Draw._createLine(a, s, d, s, parsedLineOptions)
      if (!has_map.D) Draw._createLine(d, w, d, s, parsedLineOptions)

      if (has_map.A && !(has_map.Q && has_map.W)) Draw._createLine(A, w, a, w, parsedLineOptions)
      if (has_map.A && !(has_map.Z && has_map.X)) Draw._createLine(A, s, a, s, parsedLineOptions)

      if (has_map.W && !(has_map.Q && has_map.A)) Draw._createLine(a, W, a, w, parsedLineOptions)
      if (has_map.W && !(has_map.E && has_map.D)) Draw._createLine(d, W, d, w, parsedLineOptions)

      if (has_map.X && !(has_map.Z && has_map.A)) Draw._createLine(a, s, a, S, parsedLineOptions)
      if (has_map.X && !(has_map.C && has_map.D)) Draw._createLine(d, s, d, S, parsedLineOptions)

      if (has_map.D && !(has_map.E && has_map.W)) Draw._createLine(d, w, D, w, parsedLineOptions)
      if (has_map.D && !(has_map.C && has_map.X)) Draw._createLine(d, s, D, s, parsedLineOptions)
    }
  },
  Stream(group: Group, options_?: DrawLineOptions) {
    const parsedOptions = parseDrawLineOptions({
      thickness: 'hint_regular',
      round: false,
      ...options_,
    })

    const r = parsedOptions.strokeWidth / 2

    const set = new Set(group.map(POS2number))

    for (const pos of group) {
      const hasPos = (dr: number, dc: number) => {
        const parsed = POSSchema.safeParse([pos[0] + dr, pos[1] + dc])
        return parsed.success && set.has(POS2number(parsed.data))
      }
      const has_map = {
        W: hasPos(-1, 0),
        A: hasPos(0, -1),
        S: hasPos(1, 0),
        D: hasPos(0, 1),
      }

      const [x, y] = calculateCenter(pos)

      const W = y - SIZE_CELL / 2
      const A = x - SIZE_CELL / 2
      const S = y + SIZE_CELL / 2
      const D = x + SIZE_CELL / 2

      const w = y - r
      const a = x - r
      const s = y + r
      const d = x + r

      Draw._createLine(x, w, x, s, parsedOptions)
      if (has_map.W) Draw._createLine(x, w, x, W, parsedOptions)
      if (has_map.A) Draw._createLine(a, y, A, y, parsedOptions)
      if (has_map.S) Draw._createLine(x, s, x, S, parsedOptions)
      if (has_map.D) Draw._createLine(d, y, D, y, parsedOptions)
    }
  },
  StreamOrder(group: Group, options_?: DrawLineOptions) {
    const parsedOptions = parseDrawLineOptions({
      thickness: 'hint_regular',
      round: false,
      ...options_,
    })

    const r = parsedOptions.strokeWidth / 2

    for (const [pos1, pos2] of pairwise(group)) {
      const [x, y] = calculateCenter(pos1, pos2)
      const [x1, y1] = calculateCenter(pos1)
      const [x2, y2] = calculateCenter(pos2)

      Draw._createLine(x, y, x1 + Math.sign(x1 - x) * r, y1 + Math.sign(y1 - y) * r, parsedOptions)
      Draw._createLine(x, y, x2 + Math.sign(x2 - x) * r, y2 + Math.sign(y1 - y) * r, parsedOptions)
    }
  },
  Text(pos: POSlike, text: string, options?: DrawTextOptions) {
    const parsedOptions = parseDrawTextOptions(options)

    const [x, y] = calculateCenter(pos)

    switch (parsedOptions.align) {
      case 'left': {
        Draw._createText(x - SIZE_CELL * 0.3, y, text, parsedOptions)
        return true
      }
      case 'center': {
        Draw._createText(x, y, text, parsedOptions)
        return true
      }
      case 'right': {
        Draw._createText(x + SIZE_CELL * 0.3, y, text, parsedOptions)
        return true
      }
    }
  },

  Fill(pos: POSlike, options?: DrawOptions) {
    const [x, y] = calculateCenter(pos)

    Draw._createRectangle(y - SIZE_CELL / 2, x - SIZE_CELL / 2, y + SIZE_CELL / 2, x + SIZE_CELL / 2, parseDrawOptions(options))
  },
}

// ---------

const color_generator = new SoftDistinctColorGenerator()

function render_rule(rule: Rule): boolean {
  switch (rule.id) {
    case '[Sudoku]': {
      // 보드 가장자리
      for (const r of IDX0)
        for (const [c1, c2] of [
          [0, -1],
          [8, 9],
        ])
          Draw.Divider([r, c1], [r, c2], { thickness: 'border_heavy' })
      for (const c of IDX0)
        for (const [r1, r2] of [
          [0, -1],
          [8, 9],
        ])
          Draw.Divider([r1, c], [r2, c], { thickness: 'border_heavy' })

      return true
    }

    case '[R]': {
      GROUPS_ADJACENT['wasd']
        .filter(([pos1, pos2]) => {
          return !getDisJointGroups(rule).some((group) => hasPOSs(group, pos1, pos2))
        })
        .forEach(([pos1, pos2]) => {
          Draw.Divider(pos1, pos2, { thickness: 'border_regular' })
        })
      return true
    }
    case "[R']": {
      GROUPS_ADJACENT['wasd']
        .filter(([pos1, pos2]) => {
          return !GROUPS_R.some((group) => hasPOSs(group, pos1, pos2))
        })
        .forEach(([pos1, pos2]) => {
          Draw.Divider(pos1, pos2, { color: '#700000', thickness: 'border_regular' })
        })
      return true
    }
    case '[C]': {
      GROUPS_ADJACENT['wasd']
        .filter(([pos1, pos2]) => {
          return !getDisJointGroups(rule).some((group) => hasPOSs(group, pos1, pos2))
        })
        .forEach(([pos1, pos2]) => {
          Draw.Divider(pos1, pos2, { thickness: 'border_regular' })
        })
      return true
    }
    case '[B]': {
      GROUPS_ADJACENT['wasd']
        .filter(([pos1, pos2]) => {
          return !getDisJointGroups(rule).some((group) => hasPOSs(group, pos1, pos2))
        })
        .forEach(([pos1, pos2]) => {
          Draw.Divider(pos1, pos2, { thickness: 'border_heavy' })
        })
      return true
    }
    case '[SG]': {
      GROUPS_ADJACENT['wasd']
        .filter(([pos1, pos2]) => {
          return !rule.render_state.regions.some((group) => hasPOSs(group, pos1, pos2))
        })
        .forEach(([pos1, pos2]) => {
          Draw.Divider(pos1, pos2, { thickness: 'border_heavy' })
        })
      return true
    }
    case "[SG']": {
      rule.render_state.regions.forEach((group) => {
        const color = color_generator.next()
        Draw.Cage(group, { stroke_color: color + 'ff', fill_color: color + '99' })
      })
      return true
    }

    case '[LK]':
    case "[LK']": {
      rule.render_state.edges.forEach(([pos1, pos2]) => {
        Draw.Diamond(pos1, pos2)
      })
      return true
    }

    case '[MT]': {
      rule.render_state.diamond_cells.forEach((pos) => {
        Draw.Diamond(pos)
      })
      return true
    }

    case '[MR]': {
      rule.render_state.metros.forEach((group) => {
        const color = color_generator.next() + 'cc'
        pairwise(group).forEach(([pos1, pos2]) => {
          Draw.Line(pos1, pos2, { color, thickness: 'hint_lightest' })
        })
      })
      return true
    }

    case '[LO]': {
      rule.render_state.cells.forEach((pos) => {
        Draw.Circle(pos, null, { stroke_color: '#b9ff49', fill_color: '#b9ff4954' })
      })
      return true
    }
    case "[LO']": {
      rule.render_state.cells.forEach((pos) => {
        Draw.Circle(pos, null, { stroke_color: '#49f9ff', fill_color: '#49f9ff54' })
      })
      return true
    }

    case '[PO]': {
      rule.render_state.edges.forEach(([pos1, pos2]) => {
        Draw.Triangle(pos1, pos2, { stroke_color: '#ffffff', fill_color: '#000000' })
      })
      return true
    }

    case '[PR]': {
      rule.render_state.edges.forEach(([r1, c1, r2, c2, isred]) => {
        Draw.Hexagon([r1, c1], [r2, c2], { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
      })
      return true
    }
    case "[PR']": {
      rule.render_state.triplets.forEach(([r1, c1, r2, c2, r3, c3, isred]) => {
        Draw.Hexagon([r1, c1], [r2, c2], { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
        Draw.Hexagon([r2, c2], [r3, c3], { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
      })
      return true
    }

    case '[RT]':
    case "[RT']": {
      rule.render_state.cells.forEach(([r, c, dd]) => {
        Draw.Text([r, c], '√' + dd.toString(), { color: '#8e8e8eee', fontSize: 'regular' })
      })
      return true
    }

    case '[PA]': {
      rule.render_state.dominoes.forEach((two_group) => {
        Draw.Cage(two_group, { dotted: true, stroke_color: '#6d4dfaff', fill_color: '#6d4dfa4b' })
      })
      return true
    }

    case '[VT]': {
      rule.render_state.arrows.forEach(([r, c, dir]) => {
        const [dr, dc] = DirMap[dir]
        Draw.Triangle(POSSchema.parse([r, c]), null, { size: 'small', stroke_color: '#ff7b82', fill_color: '#ff7b82', direction: Math.atan2(-dr, dc) })
      })
      return true
    }

    case '[EF]': {
      rule.render_state.marked_cells.forEach((pos) => {
        Draw.Circle(pos, null, { stroke_color: '#ffe749', fill_color: '#00000000' })
        Draw.Fill(pos, { fill_color: '#ffe74954' })
      })
      return true
    }

    case '[TM]': {
      rule.render_state.regions.forEach(({ cells: group, color }) => {
        const color_code = color === 'red' ? '#fe19196b' : color === 'green' ? '#12de2d6b' : '#192cfe6b'
        Draw.Line(group[0], group[2], { color: color_code, thickness: 'hint_heavy' })
      })
      return true
    }

    case '[AQ]': {
      rule.render_state.regions.forEach((group) => {
        Draw.Cage(group, { dotted: true, stroke_color: '#3bd1fa', fill_color: '#3bd1fa4b' })
      })
      return true
    }

    case '[RF]': {
      rule.render_state.lines.forEach(([type, i]) => {
        if (type === 'ROW') Draw.Line([i, 0 - 0.5], [i, 8 + 0.5], { color: '#fe4b196b', thickness: 'hint_regular', round: false })
        else Draw.Line([0 - 0.5, i], [8 + 0.5, i], { color: '#fe4b196b', thickness: 'hint_regular', round: false })
      })
      return true
    }

    case '[SR]': {
      rule.render_state.streams.forEach((group) => {
        Draw.Stream(group, { color: '#32bbff6b' })
      })
      return true
    }

    case '[IV]': {
      rule.render_state.lines.forEach((group) => {
        Draw.StreamOrder(group, { color: '#29e8536b', thickness: 'hint_light' })
        Draw.Circle(group[0], null, { stroke_color: '#00000000', fill_color: '#29e8536b', size: 'small' })
      })
      return true
    }

    case '[DT]':
    case '[QD]':
    case "[QD']":
    case '[TP]':
    case '[BP]':
      return true
  }
}

// TODO: 렌더링 순서 결정

export function renderRules(board: Board) {
  for (const rule of board.rules.filter(isKnown)) {
    render_rule(rule)
  }
}

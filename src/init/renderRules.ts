import { SIZE_CELL } from '../const/const'
import { GROUPS_B, GROUPS_R, getDisJointGroups } from '../const/groups'
import { type Board } from '../types/Board'
import { DirMap, type RCRC, type Rule, Rule_ID, isKnown } from '../types/Rule'
import { type Group } from '../types/base'
import { IDX0, POSSchema } from '../types/base'
import { SoftDistinctColorGenerator } from '../util/SoftDistinctColorGenerator'
import { GROUPS_ADJACENT } from '../util/create_adjacent_group'
import { POS2number, hasPOSs, isAdjacent } from '../util/groups'
import { pairwise } from '../util/pairwise'

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
  border_light: SIZE_CELL * (0.5 / 32),
  border_regular: SIZE_CELL * (1 / 32),
  border_heavy: SIZE_CELL * (3 / 32),

  hint_lightest: SIZE_CELL * (3 / 32),
  hint_light: SIZE_CELL * (6 / 32),
  hint_regular: SIZE_CELL * (10 / 32),
  hint_heavy: SIZE_CELL * (25 / 32),
} as const

const DrawRadius = {
  smallest: SIZE_CELL * 0.1,
  smaller: SIZE_CELL * 0.15,
  small: SIZE_CELL * 0.2,
  regular: SIZE_CELL * 0.35,
  big: SIZE_CELL * 0.45,
} as const

const DrawTextSize = {
  small: SIZE_CELL * 0.3,
  regular: SIZE_CELL * 0.5,
  big: SIZE_CELL * 0.8,
} as const

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
  vAlign?: 'top' | 'center' | 'bottom'
  maxLength?: number
}

interface ParsedDrawTextOptions {
  color: string
  fontSize: number
  align: 'left' | 'center' | 'right'
  vAlign: 'top' | 'center' | 'bottom'
  maxLength: number
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
    vAlign: options?.vAlign ?? 'center',
    maxLength: options?.maxLength ?? 3,
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
  _createPath(points: Coord[], { dotted, color, strokeWidth, round }: ParsedDrawLineOptions) {
    if (points.length < 2) return true

    const ele = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    const d = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')

    ele.setAttribute('d', d)
    ele.setAttribute('fill', '#00000000')
    ele.setAttribute('stroke', color)
    ele.setAttribute('stroke-width', strokeWidth.toString())
    if (round) {
      ele.setAttribute('stroke-linecap', 'round')
      ele.setAttribute('stroke-linejoin', 'round')
    }
    if (dotted) ele.setAttribute('stroke-dasharray', '2')

    svg.appendChild(ele)
  },
  _createText(x: X, y: Y, text: string, { color, fontSize, align, vAlign, maxLength }: ParsedDrawTextOptions) {
    const ele = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    ele.setAttribute('x', x.toString())
    ele.setAttribute('y', y.toString())
    ele.setAttribute('fill', color)
    ele.setAttribute('font-size', fontSize.toString())

    ele.setAttribute('text-anchor', align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle')
    ele.setAttribute('dominant-baseline', 'middle')

    const lines = text.match(new RegExp(`.{1,${maxLength}}`, 'g')) ?? ['']
    if (lines.length === 1) {
      ele.textContent = text
    } else {
      lines.forEach((line, i) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspan.setAttribute('x', x.toString())
        if (vAlign === 'top') tspan.setAttribute('dy', i === 0 ? '0em' : '1.1em')
        if (vAlign === 'center') tspan.setAttribute('dy', i === 0 ? `${-(lines.length - 1) * 0.55}em` : '1.1em')
        if (vAlign === 'bottom') tspan.setAttribute('dy', i === 0 ? `${-(lines.length - 1) * 1.1}em` : '1.1em')
        tspan.textContent = line
        ele.appendChild(tspan)
      })
    }

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
      size: !pos2 ? 'regular' : 'smaller',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    Draw._createPolygon(x, y, 4, 0, parseDrawOptions(options))
  },
  Triangle(pos1: POSlike, pos2?: POSlike | null, options_?: DrawOptions & { direction?: number }) {
    const options: DrawOptions = {
      size: !pos2 ? 'regular' : 'smaller',
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
  Fill(pos: POSlike, options?: DrawOptions) {
    const [x, y] = calculateCenter(pos)

    Draw._createRectangle(y - SIZE_CELL / 2, x - SIZE_CELL / 2, y + SIZE_CELL / 2, x + SIZE_CELL / 2, parseDrawOptions(options))
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
  Path(group: POSlike[], options?: DrawLineOptions) {
    Draw._createPath(
      group.map((pos) => calculateCenter(pos)),
      parseDrawLineOptions(options),
    )
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
  Text(pos: POSlike, text: string, options?: DrawTextOptions) {
    const parsedOptions = parseDrawTextOptions(options)

    let [x, y] = calculateCenter(pos)

    switch (parsedOptions.align) {
      case 'left': {
        x -= SIZE_CELL * 0.4
        break
      }
      case 'right': {
        x += SIZE_CELL * 0.4
        break
      }
    }
    switch (parsedOptions.vAlign) {
      case 'top': {
        y -= SIZE_CELL * 0.25
        break
      }
      case 'bottom': {
        y += SIZE_CELL * 0.3
        break
      }
    }

    Draw._createText(x, y, text, parsedOptions)
  },
  SideText(type: RCRC, index: IDX0, text: string, options_?: DrawTextOptions) {
    switch (type) {
      case 'ROW': {
        Draw.Text([index, 9], text, { fontSize: 'small', align: 'left', ...options_ })
        return true
      }
      case 'ROW_LEFT': {
        Draw.Text([index, -1], text, { fontSize: 'small', align: 'right', ...options_ })
        return true
      }
      case 'COL': {
        Draw.Text([9, index], text, { fontSize: 'small', ...options_ })
        return true
      }
      case 'COL_TOP': {
        Draw.Text([-1, index], text, { fontSize: 'small', ...options_ })
        return true
      }
    }
  },
}

// ---------

// TODO: 스텐실은 지원하지 않음
const render_order = [
  // divider
  '[Sudoku]',
  '[R]',
  "[R']",
  '[C]',
  '[B]',
  "[B']",
  '[SG]',

  // background
  '[RT]',
  "[RT']",
  '[LI]',

  // cage
  '[TM]',
  '[AQ]',
  '[PA]',
  "[SG']",

  // shape
  '[LO]',
  "[LO']",
  '[TR]',
  "[TR']",
  '[EF]',
  '[VT]',
  "[VT']",
  '[MT]',

  // line
  '[SR]',
  '[RF]',
  '[IV]',
  '[MR]',

  // divider shape
  '[BD]',
  '[PR]',
  "[PR']",
  '[LK]',
  "[LK']",
  '[PO]',

  // side
  '[QT]',
  '[RG]',
  "[RG']",
  '[PD]',
  '[SQ]',
  "[SQ']",
] as const

type Renderable_Rule_ID = (typeof render_order)[number]

function render_rule(rule: Extract<Rule, { id: Renderable_Rule_ID }>, color_generator: SoftDistinctColorGenerator): boolean {
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
    case "[B']": {
      GROUPS_ADJACENT['wasd']
        .filter(([pos1, pos2]) => {
          return !GROUPS_B.some((group) => hasPOSs(group, pos1, pos2))
        })
        .forEach(([pos1, pos2]) => {
          Draw.Divider(pos1, pos2, { thickness: 'border_heavy' })
        })

      for (let idx = 0; idx < 9; idx++) {
        const group = GROUPS_B[idx]
        const [h1, h2] = rule.render_state.hints[idx]

        group.forEach((pos) => {
          if (((pos[0] ^ pos[1]) & 1) === 0) {
            Draw.Fill(pos, { stroke_color: '#00000000', fill_color: '#ffe74954' })
          }
        })

        const r_min = Math.floor(idx / 3) * 3
        const c_min = (idx % 3) * 3
        Draw.Text([r_min, c_min], `${h1} ${h2}`, {
          align: 'left',
          vAlign: 'top',
          fontSize: 'small',
          maxLength: 5,
          color: '#444444',
        })
      }
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

    case '[RT]':
    case "[RT']": {
      rule.render_state.cells.forEach(([r, c, dd]) => {
        Draw.Text([r, c], '√' + dd.toString(), { color: '#8e8e8eee', fontSize: 'regular' })
      })
      return true
    }
    case '[LI]': {
      rule.render_state.cells.forEach(([r, c, v]) => {
        Draw.Text([r, c], v.toString(), { color: '#8e8e8eee', fontSize: 'regular' })
      })
      return true
    }

    case '[TM]': {
      rule.render_state.regions.forEach(({ cells: group, color }) => {
        const color_code = color === 'red' ? '#fe19196b' : color === 'green' ? '#12de2d6b' : '#192cfe6b'
        Draw.Path(group, { color: color_code, thickness: 'hint_heavy' })
      })
      return true
    }
    case '[AQ]': {
      rule.render_state.regions.forEach((group) => {
        Draw.Cage(group, { dotted: true, stroke_color: '#3bd1fa', fill_color: '#3bd1fa4b' })
      })
      return true
    }
    case '[PA]': {
      rule.render_state.dominoes.forEach((two_group) => {
        Draw.Cage(two_group, { dotted: true, stroke_color: '#6d4dfaff', fill_color: '#6d4dfa4b' })
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
    case '[TR]':
    case "[TR']": {
      Draw.Circle(rule.render_state.start, null, { stroke_color: '#3b82f6', fill_color: '#3b82f654' })
      Draw.Circle(rule.render_state.end, null, { stroke_color: '#f97316', fill_color: '#f9731654' })
      return true
    }
    case '[EF]': {
      rule.render_state.marked_cells.forEach((pos) => {
        Draw.Circle(pos, null, { stroke_color: '#ffe749', fill_color: '#00000000' })
        Draw.Fill(pos, { fill_color: '#ffe74954' })
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
    case "[VT']": {
      rule.render_state.arrows.forEach(([r, c, dir]) => {
        const [dr, dc] = DirMap[dir]
        Draw.Triangle(POSSchema.parse([r, c]), null, { size: 'small', stroke_color: '#c084fc', fill_color: '#c084fc', direction: Math.atan2(-dr, dc) })
      })
      return true
    }
    case '[MT]': {
      rule.render_state.diamond_cells.forEach((pos) => {
        Draw.Diamond(pos)
      })
      return true
    }

    case '[SR]': {
      rule.render_state.streams.forEach((group) => {
        Draw.Stream(group, { color: '#32bbff6b' })
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
    case '[IV]': {
      rule.render_state.lines.forEach((group) => {
        Draw.Path(group, { color: '#29e8536b', thickness: 'hint_light' })
        Draw.Circle(group[0], null, { stroke_color: '#00000000', fill_color: '#29e8536b', size: 'small' })
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

    case '[BD]': {
      rule.render_state.start_rows.forEach((r) => {
        const color = color_generator.next()
        Draw.Divider([r, 0], [r, -1], { color: color, thickness: 'border_heavy' })
        Draw.Diamond([r, 0], [r, -1], { stroke_color: color, fill_color: color + '6b', size: 'small' })
      })
      return true
    }
    case '[PR]': {
      rule.render_state.edges.forEach(([r1, c1, r2, c2, isred]) => {
        const group: Group = [
          [r1, c1],
          [r2, c2],
        ]
        group.sort((pos1, pos2) => POS2number(pos1) - POS2number(pos2))

        const [pos1, pos2] = group

        Draw.Hexagon(pos1, pos2, { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
        if (!isAdjacent(pos1, pos2, 'wasd')) Draw.Line(pos1, pos2, { color: '#dddddd', dotted: true })
      })
      return true
    }
    case "[PR']": {
      rule.render_state.triplets.forEach(([r1, c1, r2, c2, r3, c3, isred]) => {
        const group: Group = [
          [r1, c1],
          [r2, c2],
          [r3, c3],
        ]
        group.sort((pos1, pos2) => POS2number(pos1) - POS2number(pos2))

        const [pos1, pos2, pos3] = group

        Draw.Hexagon(pos1, pos2, { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
        Draw.Hexagon(pos2, pos3, { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
        if (!isAdjacent(pos1, pos2, 'wasd') || !isAdjacent(pos2, pos3, 'wasd') || !((r1 === r2 && r2 === r3) || (c1 === c2 && c2 === c3))) {
          Draw.Line(pos1, pos2, { color: '#dddddd', dotted: true })
          Draw.Line(pos2, pos3, { color: '#dddddd', dotted: true })
        }
      })
      return true
    }
    case '[LK]':
    case "[LK']": {
      rule.render_state.edges.forEach(([pos1, pos2]) => {
        Draw.Diamond(pos1, pos2)
        if (!isAdjacent(pos1, pos2, 'wasd')) Draw.Line(pos1, pos2, { color: '#dddddd', dotted: true })
      })
      return true
    }
    case '[PO]': {
      rule.render_state.edges.forEach(([pos1, pos2]) => {
        Draw.Triangle(pos1, pos2, { stroke_color: '#ffffff', fill_color: '#000000' })
        if (!isAdjacent(pos1, pos2, 'wasd')) Draw.Line(pos1, pos2, { color: '#dddddd', dotted: true })
      })
      return true
    }

    case '[QT]': {
      rule.render_state.side_hints.forEach(([type, index, [x, y]]) => {
        Draw.SideText(type, index, `${x} ${y}`, { color: '#22c55e' })
      })
      return true
    }
    case '[RG]': {
      rule.render_state.side_hints.forEach(([type, index, distances]) => {
        Draw.SideText(type, index, distances.join(''), { color: '#3b82f6' })
      })
      return true
    }
    case "[RG']": {
      rule.render_state.side_hints.forEach(([type, index, letter]) => {
        Draw.SideText(type, index, letter, { color: '#3b82f6' })
      })
      return true
    }
    case '[PD]': {
      rule.render_state.side_hints.forEach(([type, index, x]) => {
        Draw.SideText(type, index, x.toString(), { color: '#e7af36' })
      })
      return true
    }
    case '[SQ]':
    case "[SQ']": {
      rule.render_state.side_hints.forEach(([type, index, arr]) => {
        Draw.SideText(type, index, arr.join(''), { color: '#f64e3b' })
      })
      return true
    }
  }
}

function isRenderable(rule: Rule): rule is Extract<Rule, { id: Renderable_Rule_ID }> {
  return (render_order as readonly Rule_ID[]).includes(rule.id)
}

export function renderRules(board: Board) {
  svg.replaceChildren() // clear

  const color_generator = new SoftDistinctColorGenerator()

  const sorted_rules = board.rules
    .filter(isKnown)
    .filter(isRenderable)
    .sort((rule1, rule2) => render_order.indexOf(rule1.id) - render_order.indexOf(rule2.id))
  for (const rule of sorted_rules) {
    render_rule(rule, color_generator)
  }
}

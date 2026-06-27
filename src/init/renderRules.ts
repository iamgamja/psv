import { SIZE_CELL } from '../const/const'
import { getDisJointGroups, GROUPS_R } from '../const/groups'
import { IDX0 } from '../types/base'
import type { Board } from '../types/Board'
import { isKnown, type Group, type Rule } from '../types/Rule'
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

function calculateCenter(pos1: POSlike, pos2?: POSlike): Coord {
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

  hint_light: 3,
  hint_regular: 10,
  hint_heavy: 25,
} as const

const DrawRadius = {
  smallest: SIZE_CELL * 0.1,
  small: SIZE_CELL * 0.2,
  regular: SIZE_CELL * 0.35,
  big: SIZE_CELL * 0.45,
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

function createRectangle(w: Y, a: X, s: Y, d: X, { dotted, stroke_color, fill_color, strokeWidth }: ParsedDrawOptions) {
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
}

function createCircle(x: X, y: Y, { dotted, stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const ele = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

  ele.setAttribute('cx', x.toString())
  ele.setAttribute('cy', y.toString())
  ele.setAttribute('r', r.toString())
  ele.setAttribute('fill', fill_color)
  ele.setAttribute('stroke', stroke_color)
  ele.setAttribute('stroke-width', strokeWidth.toString())
  if (dotted) ele.setAttribute('stroke-dasharray', '2')

  svg.appendChild(ele)
}
function createDiamond(x: X, y: Y, { dotted, stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const ele = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

  const p1 = `${x},${y - r}` // 상
  const p2 = `${x + r},${y}` // 우
  const p3 = `${x},${y + r}` // 하
  const p4 = `${x - r},${y}` // 좌
  ele.setAttribute('points', `${p1} ${p2} ${p3} ${p4}`)

  ele.setAttribute('fill', fill_color)
  ele.setAttribute('stroke', stroke_color)
  ele.setAttribute('stroke-width', strokeWidth.toString())
  if (dotted) ele.setAttribute('stroke-dasharray', '2')

  svg.appendChild(ele)
}
/**
 * @param direction degree 단위. 오른쪽을 0으로 하고, 반시계방향을 +로 한다.
 */
function createTriangle(x: X, y: Y, direction: number, { dotted, stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const ele = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

  const points = [0, 120, 240].map((a) => {
    const rad = ((direction + a) * Math.PI) / 180
    return `${x + r * Math.cos(rad)},${y - r * Math.sin(rad)}`
  })
  ele.setAttribute('points', points.join(' '))

  ele.setAttribute('fill', fill_color)
  ele.setAttribute('stroke', stroke_color)
  ele.setAttribute('stroke-width', strokeWidth.toString())
  if (dotted) ele.setAttribute('stroke-dasharray', '2')

  svg.appendChild(ele)
}
function createHexagon(x: X, y: Y, { dotted, stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const ele = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

  const p1 = `${x},${y - r}` // 상
  const p2 = `${x + r * 0.866},${y - r * 0.5}` // 우상
  const p3 = `${x + r * 0.866},${y + r * 0.5}` // 우하
  const p4 = `${x},${y + r}` // 하
  const p5 = `${x - r * 0.866},${y + r * 0.5}` // 좌하
  const p6 = `${x - r * 0.866},${y - r * 0.5}` // 좌상
  ele.setAttribute('points', `${p1} ${p2} ${p3} ${p4} ${p5} ${p6}`)

  ele.setAttribute('fill', fill_color)
  ele.setAttribute('stroke', stroke_color)
  ele.setAttribute('stroke-width', strokeWidth.toString())
  if (dotted) ele.setAttribute('stroke-dasharray', '2')

  svg.appendChild(ele)
}

function createLine(x1: X, y1: Y, x2: X, y2: Y, { dotted, color, strokeWidth, round }: ParsedDrawLineOptions) {
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
}

const Draw = {
  Circle(pos: POSlike, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: 'regular',
      ...options_,
    }
    const [x, y] = calculateCenter(pos)

    createCircle(x, y, parseDrawOptions(options))
  },
  MidCircle(pos1: POSlike, pos2: POSlike, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: 'smallest',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    createCircle(x, y, parseDrawOptions(options))
  },
  Diamond(pos: POSlike, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: 'regular',
      ...options_,
    }
    const [x, y] = calculateCenter(pos)

    createDiamond(x, y, parseDrawOptions(options))
  },
  MidDiamond(pos1: POSlike, pos2: POSlike, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: 'smallest',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    createDiamond(x, y, parseDrawOptions(options))
  },
  MidTriangle(pos1: POSlike, pos2: POSlike, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: 'small',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)
    const direction = (Math.atan2(-(pos2[0] - pos1[0]), pos2[1] - pos1[1]) * 180) / Math.PI

    createTriangle(x, y, direction, parseDrawOptions(options))
  },
  MidHexagon(pos1: POSlike, pos2: POSlike, options_?: DrawOptions) {
    const options: DrawOptions = {
      size: 'small',
      ...options_,
    }
    const [x, y] = calculateCenter(pos1, pos2)

    createHexagon(x, y, parseDrawOptions(options))
  },

  Divider(pos1: POSlike, pos2: POSlike, options?: DrawLineOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)
    const [cx, cy] = calculateCenter(pos1, pos2)

    const newX1 = cx - (y1 - cy)
    const newY1 = cy + (x1 - cx)
    const newX2 = cx - (y2 - cy)
    const newY2 = cy + (x2 - cx)

    createLine(newX1, newY1, newX2, newY2, parseDrawLineOptions(options))
  },
  Line(pos1: POSlike, pos2: POSlike, options?: DrawLineOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)

    createLine(x1, y1, x2, y2, parseDrawLineOptions(options))
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
      const n = POS2number(pos)
      const has_map = {
        Q: set.has(n - 9 - 1),
        W: set.has(n - 9),
        E: set.has(n - 9 + 1),

        A: set.has(n - 1),
        D: set.has(n + 1),

        Z: set.has(n + 9 - 1),
        X: set.has(n + 9),
        C: set.has(n + 9 + 1),
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
      createRectangle(w, a, s, d, parsedRectOptions)
      if (has_map.W) createRectangle(W, a, w, d, parsedRectOptions)
      if (has_map.A) createRectangle(w, A, s, a, parsedRectOptions)
      if (has_map.X) createRectangle(s, a, S, d, parsedRectOptions)
      if (has_map.D) createRectangle(w, d, s, D, parsedRectOptions)

      if (has_map.Q && has_map.W && has_map.A) createRectangle(W, A, w, a, parsedRectOptions)
      if (has_map.E && has_map.W && has_map.D) createRectangle(W, d, w, D, parsedRectOptions)

      if (has_map.Z && has_map.X && has_map.A) createRectangle(s, A, S, a, parsedRectOptions)
      if (has_map.C && has_map.X && has_map.D) createRectangle(s, d, S, D, parsedRectOptions)

      // stroke
      if (!has_map.W) createLine(a, w, d, w, parsedLineOptions)
      if (!has_map.A) createLine(a, w, a, s, parsedLineOptions)
      if (!has_map.X) createLine(a, s, d, s, parsedLineOptions)
      if (!has_map.D) createLine(d, w, d, s, parsedLineOptions)

      if (has_map.A && !(has_map.Q && has_map.W)) createLine(A, w, a, w, parsedLineOptions)
      if (has_map.A && !(has_map.Z && has_map.X)) createLine(A, s, a, s, parsedLineOptions)

      if (has_map.W && !(has_map.Q && has_map.A)) createLine(a, W, a, w, parsedLineOptions)
      if (has_map.W && !(has_map.E && has_map.D)) createLine(d, W, d, w, parsedLineOptions)

      if (has_map.X && !(has_map.Z && has_map.A)) createLine(a, s, a, S, parsedLineOptions)
      if (has_map.X && !(has_map.C && has_map.D)) createLine(d, s, d, S, parsedLineOptions)

      if (has_map.D && !(has_map.E && has_map.W)) createLine(d, w, D, w, parsedLineOptions)
      if (has_map.D && !(has_map.C && has_map.X)) createLine(d, s, D, s, parsedLineOptions)
    }
  },
}

// ---------

/**
@todo 렌더링 아이디어

- MR
Draw.Line([0, 0], [1, 1], { color: '#fe4b196b', thickness: 'hint_light' })
Draw.Line([0, 2], [1, 1], { color: '#fe4b196b', thickness: 'hint_light' })
Draw.Line([0, 2], [1, 2], { color: '#fe4b196b', thickness: 'hint_light' })

- RF
Draw.Line([5, 0 - 0.5], [5, 8 + 0.5], { color: '#fe4b196b', thickness: 'hint_regular', round: false })

- TM
Draw.Line([7, 0], [7, 2], {color: '#fe4b196b', thickness: 'hint_heavy'})
*/

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
        Draw.MidDiamond(pos1, pos2)
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
          Draw.Line(pos1, pos2, { color, thickness: 'hint_light' })
        })
      })
      return true
    }

    case '[LO]': {
      rule.render_state.cells.forEach((pos) => {
        Draw.Circle(pos, { stroke_color: '#b9ff49', fill_color: '#b9ff4954' })
      })
      return true
    }
    case "[LO']": {
      rule.render_state.cells.forEach((pos) => {
        Draw.Circle(pos, { stroke_color: '#49f9ff', fill_color: '#49f9ff54' })
      })
      return true
    }

    case '[PO]': {
      rule.render_state.edges.forEach(([pos1, pos2]) => {
        Draw.MidTriangle(pos1, pos2, { stroke_color: '#ffffff', fill_color: '#000000' })
      })
      return true
    }

    case '[PR]': {
      rule.render_state.edges.forEach(([r1, c1, r2, c2, isred]) => {
        Draw.MidHexagon([r1, c1], [r2, c2], { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
      })
      return true
    }
    case "[PR']": {
      rule.render_state.triplets.forEach(([r1, c1, r2, c2, r3, c3, isred]) => {
        Draw.MidHexagon([r1, c1], [r2, c2], { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
        Draw.MidHexagon([r2, c2], [r3, c3], { stroke_color: '#ffffff', fill_color: isred ? '#ff0000cc' : '#0000ffcc' })
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

import { SIZE_CELL } from '../const/const'
import { getDisJointGroups, GROUPS_R } from '../const/groups'
import { IDX0 } from '../types/base'
import type { Board } from '../types/Board'
import { isKnown, type Rule } from '../types/Rule'
import { GROUPS_ADJACENT } from '../util/create_adjacent_group'
import { hasPOSs } from '../util/groups'
import { pairwise } from '../util/pairwise'
import { SoftDistinctColorGenerator } from '../util/SoftDistinctColorGenerator'

const container = document.querySelector('#board-container')!
const W = container.clientWidth
const H = container.clientHeight

const svg = document.querySelector<SVGSVGElement>('#rule-render-svg')!
svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

// ---------

type POSlike = [number, number]

declare const __brand: unique symbol
type Brand<B> = { [__brand]: B }

type X = number & Brand<'X'>
type Y = number & Brand<'Y'>
type Coord = [X, Y]

function calculateCenter(pos1: POSlike, pos2?: POSlike): Coord {
  if (!pos2) return [(pos1[1] + 1) * SIZE_CELL + SIZE_CELL / 2, (pos1[0] + 1) * SIZE_CELL + SIZE_CELL / 2] as Coord

  const [x1, y1] = calculateCenter(pos1)
  const [x2, y2] = calculateCenter(pos2)
  return [(x1 + x2) / 2, (y1 + y2) / 2] as Coord
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
  stroke_color?: string
  fill_color?: string
  thickness?: keyof typeof DrawWidth
  size?: keyof typeof DrawRadius
}

interface ParsedDrawOptions {
  stroke_color: string
  fill_color: string
  strokeWidth: number
  r: number
}

interface DrawLineOptions {
  color?: string
  thickness?: keyof typeof DrawWidth
  round?: boolean
}

interface ParsedDrawLineOptions {
  color: string
  strokeWidth: number
  round: boolean
}

function parseDrawOptions(options?: DrawOptions): ParsedDrawOptions {
  return {
    stroke_color: options?.stroke_color ?? '#000000',
    fill_color: options?.fill_color ?? '#ffffff',
    strokeWidth: options?.thickness ? DrawWidth[options.thickness] : DrawWidth.border_regular,
    r: options?.size ? DrawRadius[options.size] : DrawRadius.regular,
  }
}

function parseDrawLineOptions(options?: DrawLineOptions): ParsedDrawLineOptions {
  return {
    color: options?.color ?? '#000000',
    strokeWidth: options?.thickness ? DrawWidth[options.thickness] : DrawWidth.border_regular,
    round: options?.round ?? true,
  }
}

function createCircle(x: X, y: Y, { stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

  circle.setAttribute('cx', x.toString())
  circle.setAttribute('cy', y.toString())
  circle.setAttribute('r', r.toString())
  circle.setAttribute('fill', fill_color)
  circle.setAttribute('stroke', stroke_color)
  circle.setAttribute('stroke-width', strokeWidth.toString())

  svg.appendChild(circle)
}
function createDiamond(x: X, y: Y, { stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

  const p1 = `${x},${y - r}` // 상
  const p2 = `${x + r},${y}` // 우
  const p3 = `${x},${y + r}` // 하
  const p4 = `${x - r},${y}` // 좌
  diamond.setAttribute('points', `${p1} ${p2} ${p3} ${p4}`)

  diamond.setAttribute('fill', fill_color)
  diamond.setAttribute('stroke', stroke_color)
  diamond.setAttribute('stroke-width', strokeWidth.toString())

  svg.appendChild(diamond)
}
/**
 * @param direction degree 단위. 오른쪽을 0으로 하고, 반시계방향을 +로 한다.
 */
function createTriangle(x: X, y: Y, direction: number, { stroke_color, fill_color, strokeWidth, r }: ParsedDrawOptions) {
  const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

  const points = [0, 120, 240].map((a) => {
    const rad = ((direction + a) * Math.PI) / 180
    return `${x + r * Math.cos(rad)},${y - r * Math.sin(rad)}`
  })
  triangle.setAttribute('points', points.join(' '))

  triangle.setAttribute('fill', fill_color)
  triangle.setAttribute('stroke', stroke_color)
  triangle.setAttribute('stroke-width', strokeWidth.toString())

  svg.appendChild(triangle)
}

function createLine(x1: X, y1: Y, x2: X, y2: Y, { color, strokeWidth, round }: ParsedDrawLineOptions) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')

  line.setAttribute('x1', x1.toString())
  line.setAttribute('y1', y1.toString())
  line.setAttribute('x2', x2.toString())
  line.setAttribute('y2', y2.toString())
  // line.setAttribute('fill', color)
  line.setAttribute('stroke', color)
  line.setAttribute('stroke-width', strokeWidth.toString())
  if (round) line.setAttribute('stroke-linecap', 'round')

  svg.appendChild(line)
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

  Divider(pos1: POSlike, pos2: POSlike, options?: DrawLineOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)
    const [cx, cy] = calculateCenter(pos1, pos2)

    const newX1 = (cx - (y1 - cy)) as X
    const newY1 = (cy + (x1 - cx)) as Y
    const newX2 = (cx - (y2 - cy)) as X
    const newY2 = (cy + (x2 - cx)) as Y

    createLine(newX1, newY1, newX2, newY2, parseDrawLineOptions(options))
  },
  Line(pos1: POSlike, pos2: POSlike, options?: DrawLineOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)

    createLine(x1, y1, x2, y2, parseDrawLineOptions(options))
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
        const color = color_generator.next()
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

    case '[DT]':
    case '[QD]':
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

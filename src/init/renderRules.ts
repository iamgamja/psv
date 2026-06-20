import { SIZE_CELL } from '../const/const'
import { IDX0 } from '../types/base'
import type { Board } from '../types/Board'
import { isKnown, type Rule_ID, type RuleObject, type POS } from '../types/Rule'

const container = document.querySelector('#board-container')!
const W = container.clientWidth
const H = container.clientHeight

const svg = document.querySelector<SVGSVGElement>('#rule-render-svg')!
svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

// ---------

declare const __brand: unique symbol
type Brand<B> = { [__brand]: B }

type X = number & Brand<'X'>
type Y = number & Brand<'Y'>
type Coord = [X, Y]

function calculateCenter(pos1: POS, pos2?: POS): Coord {
  if (!pos2) return [(pos1[1] + 1) * SIZE_CELL + SIZE_CELL / 2, (pos1[0] + 1) * SIZE_CELL + SIZE_CELL / 2] as Coord

  const [x1, y1] = calculateCenter(pos1)
  const [x2, y2] = calculateCenter(pos2)
  return [(x1 + x2) / 2, (y1 + y2) / 2] as Coord
}

// ---------

interface DrawOptions {
  color?: string
  thickness: 'light' | 'regular' | 'heavy'
}

interface ParsedDrawOptions {
  color: string
  strokeWidth: string
}

function parseDrawOptions(options?: DrawOptions): ParsedDrawOptions {
  return {
    color: options?.color ?? '#000000',
    strokeWidth: options?.thickness === 'light' ? '0.5px' : options?.thickness === 'heavy' ? '3px' : '1px',
  }
}

function createCircle(x: X, y: Y, r: number, { color, strokeWidth }: ParsedDrawOptions) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

  circle.setAttribute('cx', x.toString())
  circle.setAttribute('cy', y.toString())
  circle.setAttribute('r', r.toString())
  circle.setAttribute('fill', '#00000000')
  circle.setAttribute('stroke', color)
  circle.setAttribute('stroke-width', strokeWidth)

  svg.appendChild(circle)
}

function createLine(x1: X, y1: Y, x2: X, y2: Y, { color, strokeWidth }: ParsedDrawOptions) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')

  line.setAttribute('x1', x1.toString())
  line.setAttribute('y1', y1.toString())
  line.setAttribute('x2', x2.toString())
  line.setAttribute('y2', y2.toString())
  // line.setAttribute('fill', color)
  line.setAttribute('stroke', color)
  line.setAttribute('stroke-width', strokeWidth)

  svg.appendChild(line)
}

const Draw = {
  Circle(pos: POS, options: DrawOptions) {
    const [x, y] = calculateCenter(pos)

    createCircle(x, y, SIZE_CELL * 0.35, parseDrawOptions(options))
  },
  Divider(pos1: POS, pos2: POS, options: DrawOptions) {
    const [x1, y1] = calculateCenter(pos1)
    const [x2, y2] = calculateCenter(pos2)
    const [cx, cy] = calculateCenter(pos1, pos2)

    const newX1 = (cx - (y1 - cy)) as X
    const newY1 = (cy + (x1 - cx)) as Y
    const newX2 = (cx - (y2 - cy)) as X
    const newY2 = (cy + (x2 - cx)) as Y

    createLine(newX1, newY1, newX2, newY2, parseDrawOptions(options))
  },
}

// --------- 

type Renderer<T extends Rule_ID> = (board: Board, rule: RuleObject<T>) => void
type Renderers = {
  [K in Rule_ID]: Renderer<K>
}

function* generator_adjacent_pos() {
  for (const r1 of IDX0) {
    for (const c1 of IDX0) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const r2 = r1 + dr
        const c2 = c1 + dc
        if (!(0 <= r2 && r2 < 9 && 0 <= c2 && c2 < 9)) continue
        yield [
          [r1, c1],
          [r2, c2],
        ] as [POS, POS]
      }
    }
  }
}

const Renderers: Renderers = {
  '[Sudoku]': () => {
    for (const r of IDX0)
      for (const [c1, c2] of [
        [0, -1],
        [8, 9],
      ])
        Draw.Divider([r, c1 as IDX0], [r, c2 as IDX0], { thickness: 'heavy' })
    for (const c of IDX0)
      for (const [r1, r2] of [
        [0, -1],
        [8, 9],
      ])
        Draw.Divider([r1 as IDX0, c], [r2 as IDX0, c], { thickness: 'heavy' })
  },
  '[R]': () => {
    Array.from(generator_adjacent_pos())
      .filter(([pos1, pos2]) => pos1[0] !== pos2[0])
      .forEach(([pos1, pos2]) => {
        Draw.Divider(pos1, pos2, { thickness: 'regular' })
      })
  },
  '[C]': () => {
    Array.from(generator_adjacent_pos())
      .filter(([pos1, pos2]) => pos1[1] !== pos2[1])
      .forEach(([pos1, pos2]) => {
        Draw.Divider(pos1, pos2, { thickness: 'regular' })
      })
  },
  '[B]': () => {
    Array.from(generator_adjacent_pos())
      .filter(([pos1, pos2]) => Math.floor(pos1[0] / 3) !== Math.floor(pos2[0] / 3) || Math.floor(pos1[1] / 3) !== Math.floor(pos2[1] / 3))
      .forEach(([pos1, pos2]) => {
        Draw.Divider(pos1, pos2, { thickness: 'heavy' })
      })
  },
  '[SG]': (board, rule) => {
    Array.from(generator_adjacent_pos())
      .filter(([[r1, c1], [r2, c2]]) => {
        const cell1 = board.cells[r1][c1]
        const cell2 = board.cells[r2][c2]
        return !rule.render_state.regions.map((group) => group.map(([r, c]) => board.cells[r][c])).some((cells) => cells.includes(cell1) && cells.includes(cell2))
      })
      .forEach(([pos1, pos2]) => {
        Draw.Divider(pos1, pos2, { thickness: 'heavy' })
      })
  },
}

export function renderRules(board: Board) {
  for (const rule of board.rules.filter(isKnown)) {
    // @ts-ignore
    Renderers[rule.id](board, rule)
  }
}

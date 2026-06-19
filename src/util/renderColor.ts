import type { V } from '../types/base'
import { SIZE_CELL } from '../const/const'
import { color_map } from '../const/color_map'

const CX = SIZE_CELL / 2
const CY = SIZE_CELL / 2
const R = (SIZE_CELL / 2) * Math.SQRT2

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function buildWedgePath(startDeg: number, endDeg: number): string {
  const start = polarToCartesian(CX, CY, R, startDeg)
  const end = polarToCartesian(CX, CY, R, endDeg)

  const delta = endDeg - startDeg
  const largeArcFlag = delta > 180 ? 1 : 0

  return [`M ${CX} ${CY}`, `L ${start.x} ${start.y}`, `A ${R} ${R} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`, 'Z'].join(' ')
}

export function initColor(color_element: HTMLDivElement) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('svg-color')
  svg.setAttribute('viewBox', `0 0 ${SIZE_CELL} ${SIZE_CELL}`)
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.setAttribute('aria-hidden', 'true')
  color_element.appendChild(svg)
}

export function renderColor(color: Set<V>, color_element: HTMLDivElement): void {
  let svg = color_element.firstChild!

  while (svg.firstChild) {
    svg.removeChild(svg.firstChild)
  }

  const colors = Array.from(color).sort()

  if (colors.length === 0) {
    return
  }

  if (colors.length === 1) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', CX.toString())
    circle.setAttribute('cy', CY.toString())
    circle.setAttribute('r', R.toString())
    circle.setAttribute('fill', color_map[colors[0]])
    svg.appendChild(circle)
    return
  }

  const step = 360 / colors.length

  for (let i = 0; i < colors.length; i++) {
    const startDeg = -90 + step * i
    const endDeg = -90 + step * (i + 1)

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', buildWedgePath(startDeg, endDeg))
    path.setAttribute('fill', color_map[colors[i]])
    svg.appendChild(path)
  }
}

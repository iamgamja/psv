import type { Cell } from '../types/Cell'
import { V, type IDX } from '../types/base'
import { SIZE_CELL } from '../const'
import { initColor } from './renderColor'

/** r, c: 0-index. 1-9 is in-board, 0 and 10 are out-of-board */
function create_element(className: string, r: IDX, c: IDX): HTMLDivElement {
  const element = document.createElement('div')
  element.classList.add('cell', className)
  element.style.left = `${c * SIZE_CELL}px`
  element.style.top = `${r * SIZE_CELL}px`
  element.dataset.r = r.toString()
  element.dataset.c = c.toString()
  return element
}

const container_element = document.querySelector<HTMLDivElement>('#board-container')!

export const cells: Cell[][] = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => {
    const color_element = container_element.appendChild(create_element('cell-color', (r + 1) as IDX, (c + 1) as IDX))
    const num_element = container_element.appendChild(create_element('cell-num', (r + 1) as IDX, (c + 1) as IDX))
    const memo_element = container_element.appendChild(create_element('cell-memo', (r + 1) as IDX, (c + 1) as IDX))
    const error_element = container_element.appendChild(create_element('cell-error', (r + 1) as IDX, (c + 1) as IDX))
    const warning_element = container_element.appendChild(create_element('cell-warning', (r + 1) as IDX, (c + 1) as IDX))
    const selected_element = container_element.appendChild(create_element('cell-selected', (r + 1) as IDX, (c + 1) as IDX))

    // init memo
    for (const v of V) {
      const ele = document.createElement('div')
      ele.classList.add('memo')
      ele.textContent = v.toString()
      memo_element.appendChild(ele)
    }

    // init color
    initColor(color_element)

    return {
      r: (r + 1) as IDX,
      c: (c + 1) as IDX,
      memo: new Set(V),
      color: new Set(),
      color_element: color_element,
      num_element: num_element,
      memo_element: memo_element,
      error_element: error_element,
      warning_element: warning_element,
      selected_element: selected_element,
    }
  }),
)

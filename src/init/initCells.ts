import type { Cell } from '../types/Cell'
import { IDX, V } from '../types/base'
import { SIZE_CELL } from '../const/const'
import { initColor } from '../util/renderColor'
import { createElement } from '../util/createElement'
import type { LevelData } from '../types/LevelData'
import type { State } from '../types/State'

/** r, c: 0-index. 1-9 is in-board, 0 and 10 are out-of-board */
function create_cell_element(className: string, r: IDX, c: IDX): HTMLDivElement {
  const element = createElement('div', { className: ['cell', className] })
  element.style.left = `${c * SIZE_CELL}px`
  element.style.top = `${r * SIZE_CELL}px`
  element.dataset.r = r.toString()
  element.dataset.c = c.toString()
  return element
}

const container_element = document.querySelector<HTMLDivElement>('#board-container')!

export function initCells(level: LevelData, { Setting }: State): Cell[][] {
  return IDX.map((r) =>
    IDX.map((c) => {
      const is_static = level.board[r - 1][c - 1] !== 0

      const color_element = container_element.appendChild(create_cell_element('cell-color', r, c))
      const num_element = container_element.appendChild(create_cell_element('cell-num', r, c))
      const memo_element = container_element.appendChild(create_cell_element('cell-memo', r, c))
      const error_element = container_element.appendChild(create_cell_element('cell-error', r, c))
      const warning_element = container_element.appendChild(create_cell_element('cell-warning', r, c))
      const selected_element = container_element.appendChild(create_cell_element('cell-selected', r, c))

      // num color
      if (is_static) num_element.classList.add('static')

      // init memo
      for (const v of V) {
        memo_element.appendChild(createElement('div', { className: 'memo', content: v.toString() }))
      }

      // init color
      initColor(color_element)

      return {
        r,
        c,

        digit: level.board[r - 1][c - 1],
        valid_memo: Setting.fillMemoWhenInit === 'on' && !is_static ? new Set(V) : new Set(),
        candidate_memo: Setting.fillMemoWhenInit === 'on' && !is_static ? new Set(V) : new Set(),
        color: new Set(),
        is_static,

        color_element: color_element,
        num_element: num_element,
        memo_element: memo_element,
        error_element: error_element,
        warning_element: warning_element,
        selected_element: selected_element,
      }
    }),
  )
}

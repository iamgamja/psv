import type { Cell, Board, type_IDX, type_V } from '../types'

const SIZE_CELL = 32

/** r, c: 0-index. 1-9 is in-board, 0 and 10 are out-of-board */
function create_element(className: string, r: number, c: number): HTMLDivElement {
  const element = document.createElement('div')
  element.classList.add('cell', className)
  element.style.left = `${c * SIZE_CELL}px`
  element.style.top = `${r * SIZE_CELL}px`
  element.setAttribute('r', r.toString())
  element.setAttribute('c', c.toString())
  return element
}

const container_element = document.querySelector<HTMLDivElement>('#board-container')!

const cells: Cell[][] = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => {
    const color_element = container_element.appendChild(create_element('cell-color', r + 1, c + 1))
    const num_element = container_element.appendChild(create_element('cell-num', r + 1, c + 1))
    const memo_element = container_element.appendChild(create_element('cell-memo', r + 1, c + 1))
    const error_element = container_element.appendChild(create_element('cell-error', r + 1, c + 1))
    const warning_element = container_element.appendChild(create_element('cell-warning', r + 1, c + 1))
    const selected_element = container_element.appendChild(create_element('cell-selected', r + 1, c + 1))

    const memos = {} as Record<type_V, HTMLDivElement>
    for (let i = 1; i <= 9; i++) {
      const ele = document.createElement('div')
      ele.classList.add('memo', `memo-${i}`)
      ele.textContent = i.toString()
      memo_element.appendChild(ele)

      memos[i as type_V] = ele
    }

    return {
      r: (r + 1) as type_IDX,
      c: (c + 1) as type_IDX,
      memo: new Set(),
      color: new Set(),
      color_element: color_element,
      num_element: num_element,
      memo_element: memo_element,
      memos: memos,
      error_element: error_element,
      warning_element: warning_element,
      selected_element: selected_element,
    }
  }),
)

export function initBoard(): Board {
  const board: Board = {
    cells,
    rules: [],
    selected: new Set(),
    errors: new Set(),
    warnings: new Set(),

    set_digit(digit?: type_V) {
      this.selected.forEach((cell) => {
        cell.digit = digit
      })
      this._check_errors()
      this._check_warnings()
      this.render()
    },
    add_memo(digit: type_V) {
      this.selected.forEach((cell) => {
        cell.memo.add(digit)
      })
      this._check_warnings()
      this.render()
    },

    toggle_digit(digit: type_V) {
      if ([...this.selected.values()].every((cell) => cell.digit === digit)) {
        this.set_digit()
      } else {
        this.set_digit(digit)
      }
    },
    remove_memo(digit: type_V) {
      this.selected.forEach((cell) => {
        cell.memo.delete(digit)
      })
      this._check_warnings()
      this.render()
    },
    clear_memo() {
      this.selected.forEach((cell) => {
        cell.memo.clear()
      })
      this._check_warnings()
      this.render()
    },
    toggle_memo(digit: type_V) {
      if ([...this.selected.values()].every((cell) => cell.memo.has(digit))) {
        this.remove_memo(digit)
      } else {
        this.add_memo(digit)
      }
    },

    add_color(digit: type_V) {
      this.selected.forEach((cell) => {
        cell.color.add(digit)
      })
      this.render()
    },
    remove_color(digit: type_V) {
      this.selected.forEach((cell) => {
        cell.color.delete(digit)
      })
      this.render()
    },
    clear_color() {
      this.selected.forEach((cell) => {
        cell.color.clear()
      })
      this._check_warnings()
      this.render()
    },
    toggle_color(digit: type_V) {
      if ([...this.selected.values()].every((cell) => cell.color.has(digit))) {
        this.remove_color(digit)
      } else {
        this.add_color(digit)
      }
    },

    add_selected(cell: Cell) {
      this.selected.add(cell)
      this.render()
    },
    remove_selected(cell: Cell) {
      this.selected.delete(cell)
      this.render()
    },
    clear_selected() {
      this.selected.clear()
      this.render()
    },

    set_selected_by_digit(digit: type_V) {
      this.selected.clear()
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          if (cell.digit === digit) {
            this.selected.add(cell)
          }
        }),
      )
      this.render()
    },
    set_selected_by_memo(digit: type_V) {
      this.selected.clear()
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          if (cell.memo.has(digit)) {
            this.selected.add(cell)
          }
        }),
      )
      this.render()
    },
    set_selected_by_color(digit: type_V) {
      this.selected.clear()
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          if (cell.color.has(digit)) {
            this.selected.add(cell)
          }
        }),
      )
      this.render()
    },
    set_selected_by_candidate(digit: type_V) {
      this.selected.clear()
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          if (cell.digit === null && cell.memo.has(digit)) {
            this.selected.add(cell)
          }
        }),
      )
      this.render()
    },

    set_selected_by_selected_scope() {
      // @todo
    },

    _check_errors() {
      this.errors.clear()

      // @todo
    },
    _check_warnings() {
      this.warnings.clear()

      // @todo
    },

    render() {
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          // @todo color
          cell.num_element.textContent = cell.digit?.toString() ?? ''
          for (let i = 1; i <= 9; i++) {
            cell.memos[i as type_V].classList.toggle('hide', !(cell.digit === undefined && cell.memo.has(i as type_V)))
          }

          cell.selected_element.classList.toggle('selected', this.selected.has(cell))
          cell.error_element.classList.toggle('error', this.errors.has(cell))
          cell.warning_element.classList.toggle('warning', this.warnings.has(cell))
        }),
      )
    },

    container_element: container_element,
  }

  board.render()
  return board
}



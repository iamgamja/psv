import type { Cell, Board, type_V } from '../types'
import { cells } from './initCells'
import { renderColor } from './renderColor'

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
      if (Array.from(this.selected).every((cell) => cell.digit === digit)) {
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
      if (Array.from(this.selected).every((cell) => cell.memo.has(digit))) {
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
      if (Array.from(this.selected).every((cell) => cell.color.has(digit))) {
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
          if (cell.digit === undefined && cell.memo.has(digit)) {
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
          renderColor(cell.color, cell.color_element)
          cell.num_element.textContent = cell.digit?.toString() ?? ''
          for (let i = 1; i <= 9; i++) {
            cell.memo_element.children[i - 1].classList.toggle('hide', !(cell.digit === undefined && cell.memo.has(i as type_V)))
          }

          cell.selected_element.classList.toggle('selected', this.selected.has(cell))
          cell.error_element.classList.toggle('error', this.errors.has(cell))
          cell.warning_element.classList.toggle('warning', this.warnings.has(cell))
        }),
      )
    },

    container_element: document.querySelector<HTMLDivElement>('#board-container')!,
  }

  board.render()
  return board
}

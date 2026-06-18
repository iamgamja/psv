import { check_error } from '../check/error'
import { check_warning } from '../check/warning'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import { V } from '../types/base'
import { cells } from './initCells'
import { renderColor } from './renderColor'

export function initBoard(): Board {
  const board: Board = {
    cells,
    rules: [{ id: '[R]' }, { id: '[C]' }, { id: '[B]' }],
    selected: new Set(),
    errors: new Set(),
    warnings: new Set(),

    set_digit(digit?: V) {
      this.selected.forEach((cell) => {
        cell.digit = digit
      })
      this._check_errors()
      this._check_warnings()
      this.render()
    },
    add_memo(digit: V) {
      this.selected.forEach((cell) => {
        cell.memo.add(digit)
      })
      this._check_warnings()
      this.render()
    },

    toggle_digit(digit: V) {
      if (Array.from(this.selected).every((cell) => cell.digit === digit)) {
        this.set_digit()
      } else {
        this.set_digit(digit)
      }
    },
    remove_memo(digit: V) {
      this.selected.forEach((cell) => {
        if (cell.digit) return
        cell.memo.delete(digit)
      })
      this._check_warnings()
      this.render()
    },
    clear_memo() {
      this.selected.forEach((cell) => {
        if (cell.digit) return
        cell.memo.clear()
      })
      this._check_warnings()
      this.render()
    },
    toggle_memo(digit: V) {
      if (
        Array.from(this.selected)
          .filter((cell) => cell.digit === undefined)
          .every((cell) => cell.memo.has(digit))
      ) {
        this.remove_memo(digit)
      } else {
        this.add_memo(digit)
      }
    },

    add_color(digit: V) {
      this.selected.forEach((cell) => {
        cell.color.add(digit)
      })
      this.render()
    },
    remove_color(digit: V) {
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
    toggle_color(digit: V) {
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

    set_selected_by_digit(digit: V) {
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
    set_selected_by_memo(digit: V) {
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
    set_selected_by_color(digit: V) {
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
    set_selected_by_candidate(digit: V) {
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

      for (const rule of this.rules) {
        check_error(this, rule).forEach((cell) => this.errors.add(cell))
      }
    },
    _check_warnings() {
      this.warnings.clear()

      board.warnings = check_warning(board)
    },

    render() {
      this.cells.forEach((row) =>
        row.forEach((cell) => {
          renderColor(cell.color, cell.color_element)
          cell.num_element.textContent = cell.digit?.toString() ?? ''
          for (const v of V) {
            cell.memo_element.children[v - 1].classList.toggle('hide', !(cell.digit === undefined && cell.memo.has(v)))
          }

          cell.selected_element.classList.toggle('selected', this.selected.has(cell))
          cell.error_element.classList.toggle('error', this.errors.has(cell))
          cell.warning_element.classList.toggle('warning', this.warnings.has(cell))
        }),
      )
    },

    container_element: document.querySelector<HTMLDivElement>('#board-container')!,
  }

  board._check_errors()
  board._check_warnings()
  board.render()
  return board
}

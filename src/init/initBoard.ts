import { check_error } from '../check/error'
import { has_error } from '../check/has_error'
import { check_warning } from '../check/warning'
import { GROUPS_R, GROUPS_C, GROUPS_B } from '../const'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { Rule } from '../types/Rule'
import { V } from '../types/base'
import { cells } from './initCells'
import { renderColor } from './renderColor'

export function initBoard(): Board {
  const rules: Rule[] = [{ id: '[R]' }, { id: '[C]' }, { id: '[B]' }]

  const board: Board = {
    cells,
    flat_cells: cells.flat(),
    get empty_cells() {
      return this.flat_cells.filter((cell) => !cell.digit)
    },

    create_digit_arr() {
      return Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => this.cells[r][c].digit))
    },

    rules: rules,
    all_groups: rules
      .filter((rule) => rule.id === '[R]' || rule.id === '[C]' || rule.id === '[B]' || rule.id === '[SG]')
      .map((rule) => (rule.id === '[R]' ? GROUPS_R : rule.id === '[C]' ? GROUPS_C : rule.id === '[B]' ? GROUPS_B : rule.render_state.regions))
      .flat(),

    selected: new Set(),
    get empty_selected() {
      return Array.from(this.selected).filter((cell) => !cell.digit)
    },
    errors: new Set(),
    warnings: new Set(),

    set_digit(digit?: V) {
      this.selected.forEach((cell) => {
        cell.digit = digit
      })
      this._check_errors()
      this._induct()
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

    add_memo(digit: V) {
      this.empty_selected.forEach((cell) => {
        cell.candidate_memo.add(digit)
        this._induct(cell)
      })
      this._check_warnings()
      this.render()
    },
    remove_memo(digit: V) {
      this.empty_selected.forEach((cell) => {
        cell.candidate_memo.delete(digit)
        this._induct(cell)
      })
      this._check_warnings()
      this.render()
    },
    clear_memo() {
      this.empty_selected.forEach((cell) => {
        cell.candidate_memo.clear()
        this._induct(cell)
      })
      this._check_warnings()
      this.render()
    },
    toggle_memo(digit: V) {
      if (this.empty_selected.every((cell) => cell.candidate_memo.has(digit))) {
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
      this.flat_cells.forEach((cell) => {
        if (cell.digit === digit) {
          this.selected.add(cell)
        }
      })
      this.render()
    },
    set_selected_by_memo(digit: V) {
      this.selected.clear()
      this.empty_cells.forEach((cell) => {
        if (cell.candidate_memo.has(digit)) {
          this.selected.add(cell)
        }
      })
      this.render()
    },
    set_selected_by_color(digit: V) {
      this.selected.clear()
      this.flat_cells.forEach((cell) => {
        if (cell.color.has(digit)) {
          this.selected.add(cell)
        }
      })
      this.render()
    },
    set_selected_by_candidate(digit: V) {
      this.selected.clear()
      this.empty_cells.forEach((cell) => {
        if (cell.valid_memo.has(digit)) {
          this.selected.add(cell)
        }
      })
      this.render()
    },

    set_selected_by_selected_scope() {
      // 현재 선택된 셀들이 모두 같은 그룹에 포함되어 있을 때, 그 그룹의 셀을 선택한다.
      // 단, 원래 선택되어 있던 셀들은 제외한다.
      const last_selected = Array.from(this.selected)
      if (last_selected.length === 0) return

      this.selected.clear()
      for (const group of board.all_groups) {
        const is_target_group = last_selected.every((selected_cell) => group.some(([r, c]) => r === selected_cell.r - 1 && c === selected_cell.c - 1))

        if (is_target_group) {
          for (const [r, c] of group) {
            const cell = board.cells[r][c]
            if (cell) {
              this.selected.add(cell)
            }
          }
        }
      }

      last_selected.forEach((cell) => this.selected.delete(cell))
      board.render()
    },

    _check_errors() {
      this.errors = check_error(this)
    },
    _check_warnings() {
      this.warnings = check_warning(this)
    },
    _induct(cell?: Cell) {
      // 실행 순서: _check_errors, _induct, _check_warnings
      // 따라서 이미 에러 체크가 끝났으므로 this.errors를 통해 현재 보드에 에러가 있는지 검사할 수 있다.
      if (this.errors.size > 0) return

      if (!cell) {
        this.empty_cells.forEach((cell) => this._induct(cell))
        return
      }

      if (cell.digit) return

      const digit_arr = this.create_digit_arr()

      cell.valid_memo.clear()

      for (const digit of cell.candidate_memo) {
        digit_arr[cell.r - 1][cell.c - 1] = digit

        if (!has_error(digit_arr, this.rules)) cell.valid_memo.add(digit)

        digit_arr[cell.r - 1][cell.c - 1] = undefined
      }
    },

    render() {
      this.flat_cells.forEach((cell) => {
        renderColor(cell.color, cell.color_element)
        cell.num_element.textContent = cell.digit?.toString() ?? ''
        for (const v of V) {
          cell.memo_element.children[v - 1].classList.toggle('hide', !(!cell.digit && cell.candidate_memo.has(v)))
          cell.memo_element.children[v - 1].classList.toggle('invalid', !cell.valid_memo.has(v))
        }

        cell.selected_element.classList.toggle('selected', this.selected.has(cell))
        cell.error_element.classList.toggle('error', this.errors.has(cell))
        cell.warning_element.classList.toggle('warning', this.warnings.has(cell))
      })
    },

    container_element: document.querySelector<HTMLDivElement>('#board-container')!,
  }

  board._check_errors()
  board._check_warnings()
  board.render()
  return board
}

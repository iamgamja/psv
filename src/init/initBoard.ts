import { check_error } from '../check/check_error'
import { has_error } from '../check/has_error'
import { check_warning } from '../check/warning'
import { getGroups, hasGroup } from '../const/groups'
import { HistoryManager } from '../util/HistoryManager'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { LevelData } from '../types/LevelData'
import { IDX0, V } from '../types/base'
import { initCells } from './initCells'
import { renderColor } from '../util/renderColor'
import { isKnown } from '../types/Rule'
import { showToast } from '../util/toast'
import type { State } from '../types/State'
import { renderRules } from './renderRules'
import { hasCells } from '../util/hasCells'

export function initBoard(level: LevelData, State: State): Board {
  const cells = initCells(level, State)

  const board: Board = {
    cells,
    flat_cells: cells.flat(),
    get empty_cells() {
      return this.flat_cells.filter((cell) => !cell.digit)
    },

    create_digit_arr() {
      return IDX0.map((r) => IDX0.map((c) => this.cells[r][c].digit))
    },

    level,
    rules: level.rules,
    all_groups: level.rules.filter(isKnown).filter(hasGroup).map(getGroups).flat(),
    all_9_groups: level.rules
      .filter(isKnown)
      .filter(hasGroup)
      .map(getGroups)
      .filter((groups) => groups.length === 9)
      .flat(),

    selected: new Set(),
    get empty_selected() {
      return Array.from(this.selected).filter((cell) => !cell.digit)
    },
    get nonstatic_selected() {
      return Array.from(this.selected).filter((cell) => !cell.is_static)
    },
    errors: new Set(),
    warnings: new Set(),

    set_digit(digit, targets) {
      ;(targets ?? this.nonstatic_selected).forEach((cell) => {
        cell.digit = digit
      })
      this._check_errors()
      this._induct()
      this._check_warnings()
      this.render()
      this.commit()
      this._check_completed()
    },
    remove_digit(targets) {
      ;(targets ?? this.nonstatic_selected).forEach((cell) => {
        cell.digit = 0
      })
      this._check_errors()
      this._induct()
      this._check_warnings()
      this.render()
      this.commit()
    },
    toggle_digit(digit, mode, targets) {
      if ((targets ?? this.nonstatic_selected).every((cell) => cell.digit === digit)) {
        this.remove_digit(targets)
      } else if (this.nonstatic_selected.every((cell) => cell.digit !== digit)) {
        this.set_digit(digit, targets)
      } else {
        if (mode === 'add_prefer') this.set_digit(digit, targets)
        else this.remove_digit(targets)
      }
    },

    add_memo(digit, targets) {
      ;(targets ?? this.empty_selected).forEach((cell) => {
        cell.candidate_memo.add(digit)
        this._induct(cell)
      })
      this._check_warnings()
      this.render()
      this.commit()
    },
    remove_memo(digit, targets) {
      ;(targets ?? this.empty_selected).forEach((cell) => {
        cell.candidate_memo.delete(digit)
        this._induct(cell)
      })
      this._check_warnings()
      this.render()
      this.commit()
    },
    clear_memo(targets) {
      ;(targets ?? this.empty_selected).forEach((cell) => {
        cell.candidate_memo.clear()
        this._induct(cell)
      })
      this._check_warnings()
      this.render()
      this.commit()
    },
    toggle_memo(digit, mode, targets) {
      if ((targets ?? this.empty_selected).every((cell) => cell.candidate_memo.has(digit))) {
        this.remove_memo(digit, targets)
      } else if ((targets ?? this.empty_selected).every((cell) => !cell.candidate_memo.has(digit))) {
        this.add_memo(digit, targets)
      } else {
        if (mode === 'add_prefer') this.add_memo(digit, targets)
        else this.remove_memo(digit, targets)
      }
    },

    add_color(digit, targets) {
      ;(targets ?? this.selected).forEach((cell) => {
        cell.color.add(digit)
      })
      this.render()
      this.commit()
    },
    remove_color(digit, targets) {
      ;(targets ?? this.selected).forEach((cell) => {
        cell.color.delete(digit)
      })
      this.render()
      this.commit()
    },
    clear_color(targets) {
      ;(targets ?? this.selected).forEach((cell) => {
        cell.color.clear()
      })
      this.render()
      this.commit()
    },
    toggle_color(digit, mode, targets) {
      if (Array.from(targets ?? this.selected).every((cell) => cell.color.has(digit))) {
        this.remove_color(digit, targets)
      } else if (Array.from(targets ?? this.selected).every((cell) => !cell.color.has(digit))) {
        this.add_color(digit, targets)
      } else {
        if (mode === 'add_prefer') this.add_color(digit, targets)
        else this.remove_color(digit, targets)
      }
    },

    add_selected(cell) {
      this.selected.add(cell)
      this.render()
    },
    remove_selected(cell) {
      this.selected.delete(cell)
      this.render()
    },
    clear_selected() {
      this.selected.clear()
      this.render()
    },

    set_selected_by_digit(digit) {
      this.selected.clear()
      this.flat_cells.forEach((cell) => {
        if (cell.digit === digit) {
          this.selected.add(cell)
        }
      })
      this.render()
    },
    set_selected_by_memo(digit) {
      this.selected.clear()
      this.empty_cells.forEach((cell) => {
        if (cell.candidate_memo.has(digit)) {
          this.selected.add(cell)
        }
      })
      this.render()
    },
    set_selected_by_color(digit) {
      this.selected.clear()
      this.flat_cells.forEach((cell) => {
        if (cell.color.has(digit)) {
          this.selected.add(cell)
        }
      })
      this.render()
    },
    set_selected_by_candidate(digit) {
      this.selected.clear()
      this.empty_cells.forEach((cell) => {
        if (cell.valid_memo.has(digit)) {
          this.selected.add(cell)
        }
      })
      this.render()
    },

    set_selected_by_selected_scope() {
      // 선택된 칸 모두와 중복할 수 없는(같은 그룹에 있는) 칸을 선택한다.
      // 단, 원래 선택되어 있던 셀들은 제외한다.
      const last_selected = Array.from(this.selected)
      if (last_selected.length === 0) return

      this.selected.clear()
      for (const cell of this.flat_cells) {
        if (last_selected.every((selected_cell) => this.all_groups.some((group) => hasCells(group, cell, selected_cell)))) this.selected.add(cell)
      }

      last_selected.forEach((cell) => this.selected.delete(cell))
      this.render()
    },

    can_auto(State) {
      return (
        (State.Setting.useCellAuto === 'on' && this.empty_cells.some((cell) => cell.valid_memo.size === 1)) ||
        (State.Setting.useGroupAuto === 'on' &&
          this.all_9_groups.some((group) => {
            const digits = new Set(group.map(([r, c]) => this.cells[r][c].digit))
            return V.some((digit) => !digits.has(digit) && group.map(([r, c]) => this.cells[r][c]).filter((cell) => !cell.digit && cell.valid_memo.has(digit)).length === 1)
          }))
      )
    },

    auto(State) {
      if (State.Setting.useCellAuto === 'on')
        // 1. one cell, one memo
        this.empty_cells
          .filter((cell) => cell.valid_memo.size === 1)
          .forEach((cell) => {
            cell.digit = cell.valid_memo.values().next().value!
          })

      if (State.Setting.useGroupAuto === 'on')
        // 2. one group, one digit, one memo
        for (const group of this.all_9_groups) {
          const cells = group.map(([r, c]) => this.cells[r][c])
          const empty_cells = cells.filter((cell) => !cell.digit)

          for (const digit of V) {
            if (cells.some((cell) => cell.digit === digit)) continue

            const targets = empty_cells.filter((cell) => cell.valid_memo.has(digit))
            if (targets.length !== 1) continue

            targets[0].digit = digit
          }
        }

      this._check_errors()
      this._induct()
      this._check_warnings()
      this.render()
      this.commit()
      this._check_completed()
    },

    _check_errors() {
      this.errors = check_error(this)
    },
    _check_warnings() {
      this.warnings = check_warning(this, State)
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

        if (!has_error(digit_arr, this.rules.filter(isKnown))) cell.valid_memo.add(digit)

        digit_arr[cell.r - 1][cell.c - 1] = 0
      }
    },
    _check_completed() {
      if (this.errors.size === 0 && this.warnings.size === 0 && this.flat_cells.every((cell) => cell.digit)) {
        const res = this.flat_cells.map((cell) => cell.digit).join('')
        navigator.clipboard.writeText(res)
        showToast(`${this.level.id}번 정답이 복사되었습니다.`, 'success')
      }
    },

    render() {
      this.flat_cells.forEach((cell) => {
        renderColor(cell.color, cell.color_element)
        cell.num_element.textContent = cell.digit === 0 ? '' : cell.digit.toString()
        for (const v of V) {
          cell.memo_element.children[v - 1].classList.toggle('hide', !(!cell.digit && cell.candidate_memo.has(v)))
          cell.memo_element.children[v - 1].classList.toggle('invalid', !cell.valid_memo.has(v))
        }

        cell.selected_element.classList.toggle('selected', this.selected.has(cell))
        cell.error_element.classList.toggle('error', this.errors.has(cell))
        cell.warning_element.classList.toggle('warning', this.warnings.has(cell))
      })
    },

    commit() {
      history_manager.commit()
    },
    get can_undo() {
      return history_manager.canUndo
    },
    undo() {
      history_manager.undo()
      this.render()
    },
    get can_redo() {
      return history_manager.canRedo
    },
    redo() {
      history_manager.redo()
      this.render()
    },

    create_branch() {
      history_manager.createBranch()
      this.render()
    },
    create_branch_with_digit(cell, digit) {
      history_manager.createBranchWithDigit(cell, digit)
      this.render()
    },
    get can_reject_branch() {
      return history_manager.canRejectBranch
    },
    reject_branch() {
      history_manager.rejectBranch()
      this.render()
    },
    get can_cancel_branch() {
      return history_manager.canCancelBranch
    },
    cancel_branch() {
      history_manager.cancelBranch()
      this.render()
    },

    get branch_history() {
      return history_manager.branchHistory
    },

    reset() {
      history_manager.reset()
      location.reload()
    },
  }

  const history_manager = new HistoryManager(board)

  renderRules(board)

  board.render()
  return board
}

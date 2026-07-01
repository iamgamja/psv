import type { V } from './base'
import type { Cell } from './Cell'
import type { SettingState, State } from './State'
import type { LevelData } from './LevelData'
import type { Rule, UnknownRule } from './Rule'
import type { Groups } from './base'

export type DigitArr = (V | 0)[][]

export type Board = {
  cells: Cell[][] // 9x9
  flat_cells: Cell[]
  get empty_cells(): Cell[]

  create_digit_arr(): DigitArr // 9x9

  level: LevelData
  rules: (Rule | UnknownRule)[]
  all_disjoint_groups: Groups
  all_9_disjoint_groups: Groups

  selected: Set<Cell>
  get empty_selected(): Cell[]
  get nonstatic_selected(): Cell[]
  errors: Set<Cell>
  warnings: Set<Cell>

  set_digit(digit: V, targets?: Cell[]): void
  remove_digit(targets?: Cell[]): void
  toggle_digit(digit: V, mode: SettingState['toggleMode'], targets?: Cell[]): void

  add_memo(digit: V, targets?: Cell[]): void
  remove_memo(digit: V, targets?: Cell[]): void
  clear_memo(targets?: Cell[]): void
  toggle_memo(digit: V, mode: SettingState['toggleMode'], targets?: Cell[]): void

  add_color(digit: V, targets?: Cell[]): void
  remove_color(digit: V, targets?: Cell[]): void
  clear_color(targets?: Cell[]): void
  toggle_color(digit: V, mode: SettingState['toggleMode'], targets?: Cell[]): void

  add_selected(cell: Cell): void
  remove_selected(cell: Cell): void
  clear_selected(): void

  set_selected_by_digit(digit: V): void
  set_selected_by_memo(digit: V): void
  set_selected_by_color(digit: V): void
  set_selected_by_candidate(digit: V): void

  set_selected_by_selected_scope(): void

  can_auto(State: State): boolean
  auto(State: State): void

  _check_errors(): void
  _check_warnings(): void
  _induct(cell?: Cell): void
  _check_completed(): void

  render(): void
  commit(): void
  get can_undo(): boolean
  undo(): void
  get can_redo(): boolean
  redo(): void

  create_branch(): void
  create_branch_with_digit(cell: Cell, digit: V): void
  get can_reject_branch(): boolean
  reject_branch(): void
  get can_cancel_branch(): boolean
  cancel_branch(): void

  get branch_history(): string

  reset(): void
}

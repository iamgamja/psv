import type { V } from './base'
import type { Cell } from './Cell'
import type { LevelData } from './LevelData'
import type { Groups, Rule } from './Rule'

export type Board = {
  cells: Cell[][] // 9x9
  flat_cells: Cell[]
  get empty_cells(): Cell[]

  create_digit_arr(): (V | undefined)[][] // 9x9

  level: LevelData
  rules: Rule[]
  all_groups: Groups

  selected: Set<Cell>
  get empty_selected(): Cell[]
  errors: Set<Cell>
  warnings: Set<Cell>

  set_digit(digit?: V): void
  toggle_digit(digit: V): void

  add_memo(digit: V): void
  remove_memo(digit: V): void
  clear_memo(): void
  toggle_memo(digit: V): void

  add_color(digit: V): void
  remove_color(digit: V): void
  clear_color(): void
  toggle_color(digit: V): void

  add_selected(cell: Cell): void
  remove_selected(cell: Cell): void
  clear_selected(): void

  set_selected_by_digit(digit: V): void
  set_selected_by_memo(digit: V): void
  set_selected_by_color(digit: V): void
  set_selected_by_candidate(digit: V): void

  set_selected_by_selected_scope(): void

  get can_auto(): boolean
  auto(): void

  _check_errors(): void
  _check_warnings(): void
  _induct(cell?: Cell): void

  render(): void
  commit(): void
  get can_undo(): boolean
  undo(): void
  get can_redo(): boolean
  redo(): void
}

export type type_V = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type type_IDX = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type Mode1 = 'num' | 'memo' | 'color'
export type Mode2 = null | 'select' | 'branch'

export type GameState = {
  mode1: Mode1
  mode2: Mode2
}

export type Cell = {
  r: type_IDX
  c: type_IDX

  digit?: type_V
  memo: Set<type_V>
  color: Set<type_V>

  color_element: HTMLDivElement
  num_element: HTMLDivElement
  memo_element: HTMLDivElement
  memos: Record<type_V, HTMLDivElement>
  error_element: HTMLDivElement
  warning_element: HTMLDivElement
  selected_element: HTMLDivElement
}

/** @todo */
export type Rule = null

export type Board = {
  cells: Cell[][] // 9x9
  rules: Rule[]

  selected: Set<Cell>
  errors: Set<Cell>
  warnings: Set<Cell>

  set_digit(digit?: type_V): void
  toggle_digit(digit: type_V): void

  add_memo(digit: type_V): void
  remove_memo(digit: type_V): void
  clear_memo(): void
  toggle_memo(digit: type_V): void

  add_color(digit: type_V): void
  remove_color(digit: type_V): void
  clear_color(): void
  toggle_color(digit: type_V): void

  add_selected(cell: Cell): void
  remove_selected(cell: Cell): void
  clear_selected(): void

  set_selected_by_digit(digit: type_V): void
  set_selected_by_memo(digit: type_V): void
  set_selected_by_color(digit: type_V): void
  set_selected_by_candidate(digit: type_V): void

  set_selected_by_selected_scope(): void

  _check_errors(): void
  _check_warnings(): void

  render(): void

  container_element: HTMLDivElement
}

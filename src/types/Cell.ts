import type { IDX, V } from './base'

export type Cell = {
  r: IDX
  c: IDX

  digit?: V
  valid_memo: Set<V>
  candidate_memo: Set<V>
  color: Set<V>

  color_element: HTMLDivElement
  num_element: HTMLDivElement
  memo_element: HTMLDivElement
  error_element: HTMLDivElement
  warning_element: HTMLDivElement
  selected_element: HTMLDivElement
}

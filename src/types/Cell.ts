import type { IDX, V } from './base'

export type Cell = {
  r: IDX
  c: IDX

  digit?: V
  valid_memo: Set<V>
  candidate_memo: Set<V> // @todo: 이거 나중에 그냥 memo로 수정해도 되지 않을까
  color: Set<V>

  color_element: HTMLDivElement
  num_element: HTMLDivElement
  memo_element: HTMLDivElement
  error_element: HTMLDivElement
  warning_element: HTMLDivElement
  selected_element: HTMLDivElement
}

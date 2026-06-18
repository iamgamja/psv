export type Mode1 = 'num' | 'memo' | 'color'
export type Mode2 = null | 'select' | 'branch'

export type GameState = {
  mode1: Mode1
  mode2: Mode2
}

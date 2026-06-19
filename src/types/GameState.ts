export type GameState = {
  mode1: 'num' | 'memo' | 'color'
  mode2: null | 'select' | 'branch'
}

export type ToggleMode = 'add_prefer' | 'remove_prefer'

export type SettingState = {
  toggleMode: ToggleMode
}

import { type LevelData } from '../types/LevelData'
import { type GameState, type SettingState } from '../types/State'

export const default_level: LevelData = {
  id: '#00000',
  difficulty: 0.0,
  board: Array.from({ length: 9 }, () => Array(9).fill(0)),
  rules: [{ id: '[Sudoku]' }, { id: '[R]' }, { id: '[C]' }, { id: '[B]' }],
}

export const default_game_state: GameState = {
  mode1: 'num',
  mode2: null,
}

export const default_setting: SettingState = {
  toggleMode: 'remove_prefer',
  fillMemoWhenInit: 'on',
  useCellAuto: 'on',
  useGroupAuto: 'on',
  useCellWarning: 'on',
  useGroupWarning: 'on',
  dimMemo: 'all',
}

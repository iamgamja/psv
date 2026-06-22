import { z } from 'zod'
import type { Board } from './Board'
import type { Input } from './Input'

export type GameState = {
  mode1: 'num' | 'memo' | 'color'
  mode2: null | 'select' | 'branch'
}

export const SettingStateSchema = z.object({
  toggleMode: z.enum(['add_prefer', 'remove_prefer']),
  fillMemoWhenInit: z.enum(['on', 'off']),
  useCellAuto: z.enum(['on', 'off']),
  useGroupAuto: z.enum(['on', 'off']),
  useCellWarning: z.enum(['on', 'off']),
  useGroupWarning: z.enum(['on', 'off']),
})
export type SettingState = z.infer<typeof SettingStateSchema>

export interface State {
  Game: GameState
  Setting: SettingState
  board?: Board
  input?: Input
}

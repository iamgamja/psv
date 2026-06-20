import { z } from 'zod'

export type GameState = {
  mode1: 'num' | 'memo' | 'color'
  mode2: null | 'select' | 'branch'
}

export const SettingStateSchema = z.object({
  toggleMode: z.enum(['add_prefer', 'remove_prefer']),
  fillMemoWhenInit: z.enum(['on', 'off']),
})
export type SettingState = z.infer<typeof SettingStateSchema>

export interface State {
  Game: GameState
  Setting: SettingState
}

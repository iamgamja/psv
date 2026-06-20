import { z } from 'zod'

export type GameState = {
  mode1: 'num' | 'memo' | 'color'
  mode2: null | 'select' | 'branch'
}

const ToggleModeSchema = z.enum(['add_prefer', 'remove_prefer'])
export type ToggleMode = z.infer<typeof ToggleModeSchema>

const FillMemoWhenInitSchema = z.enum(['on', 'off'])
export type FillMemoWhenInit = z.infer<typeof FillMemoWhenInitSchema>

export const SettingStateSchema = z.object({
  toggleMode: ToggleModeSchema,
  fillMemoWhenInit: FillMemoWhenInitSchema,
})
export type SettingState = z.infer<typeof SettingStateSchema>

export interface State {
  Game: GameState
  Setting: SettingState
}

import type { GameState, SettingState } from './types/GameState'
import { initBoard } from './init/initBoard'
import { initInput } from './init/initInput'
import { loadLevel } from './init/loadLevel'
import { default_level } from './const/default_level'

const params = new URLSearchParams(document.location.search)

const level = loadLevel(params.get('data') ?? '') ?? default_level

const gameState: GameState = {
  mode1: 'num',
  mode2: null,
}

const settingState: SettingState = {
  toggleMode: 'remove_prefer',
}

const board = initBoard(level)
initInput(board, gameState, settingState)

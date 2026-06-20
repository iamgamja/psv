import { initBoard } from './init/initBoard'
import { initInput } from './init/initInput'
import { initLevel } from './init/initLevel'
import { default_game_state, default_level, default_setting } from './const/default'
import { loadSetting } from './init/saveloadSetting'
import type { State } from './types/State'

const params = new URLSearchParams(document.location.search)
const level = initLevel(params.get('data') ?? '') ?? default_level

const State: State = {
  Game: default_game_state,
  Setting: loadSetting() ?? default_setting,
}

const board = initBoard(level, State)
initInput(board, State)

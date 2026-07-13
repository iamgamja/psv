import { default_game_state, default_level } from './const/default'
import { initBoard } from './init/initBoard'
import { initInput } from './init/initInput'
import { initLevel, parseBase64 } from './init/initLevel'
import { loadSetting } from './init/saveloadSetting'
import { type State } from './types/State'

const params = new URLSearchParams(document.location.search)

const code = await parseBase64(params.get('code') || params.get('data') || '')
// update url
const url = new URL(window.location.href)
url.searchParams.set('code', code)
history.pushState(null, '', url.toString())

const level = (await initLevel(code)) ?? default_level

const State: State = {
  Game: default_game_state,
  Setting: loadSetting(),
}

State.board = initBoard(level, State, false)
State.input = initInput(State)

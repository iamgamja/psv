import './styles/main.css'
import './styles/board.css'
import './styles/input.css'

import type { GameState } from './types/GameState'
import { initBoard } from './init/initBoard'
import { initInput } from './init/initInput'

const gameState: GameState = {
  mode1: 'num',
  mode2: null,
}

const board = initBoard()
initInput(board, gameState)


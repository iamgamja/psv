import './styles/main.css'
import './styles/board.css'
import './styles/input.css'

import type { GameState } from './types'
import { initBoard } from './init/initBoard'
import { initInput } from './init/initInput'

const gameState: GameState = {
  mode1: 'num',
  mode2: null,
}

const board = initBoard()
initInput(board, gameState)

// debug
board.cells[0][0].selected_element.addEventListener('click', () => {
  if (board.selected.has(board.cells[3][3])) board.selected.delete(board.cells[3][3])
  else board.selected.add(board.cells[3][3])
  board.render()
})

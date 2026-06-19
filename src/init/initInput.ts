import type { Board } from '../types/Board'
import type { GameState } from '../types/GameState'
import { V } from '../types/base'
import { color_map } from '../const/color_map'
import { entries } from '../util/entries'
import { enableLongPress } from '../util/enableLongPress'
import { attachDragSelection } from '../util/attachDragSelection'
import { initInfoModal, initSettingModal } from './initModal'

const input_element = document.querySelector<HTMLDivElement>('#input')!

const buttons = {
  number: {
    1: input_element.querySelector<HTMLButtonElement>('#input-number-1')!,
    2: input_element.querySelector<HTMLButtonElement>('#input-number-2')!,
    3: input_element.querySelector<HTMLButtonElement>('#input-number-3')!,
    4: input_element.querySelector<HTMLButtonElement>('#input-number-4')!,
    5: input_element.querySelector<HTMLButtonElement>('#input-number-5')!,
    6: input_element.querySelector<HTMLButtonElement>('#input-number-6')!,
    7: input_element.querySelector<HTMLButtonElement>('#input-number-7')!,
    8: input_element.querySelector<HTMLButtonElement>('#input-number-8')!,
    9: input_element.querySelector<HTMLButtonElement>('#input-number-9')!,
  },

  mode1: {
    num: input_element.querySelector<HTMLButtonElement>('#input-mode-num')!,
    memo: input_element.querySelector<HTMLButtonElement>('#input-mode-memo')!,
    color: input_element.querySelector<HTMLButtonElement>('#input-mode-color')!,
  },
  mode2: {
    select: input_element.querySelector<HTMLButtonElement>('#input-select')!,
    branch: input_element.querySelector<HTMLButtonElement>('#input-branch')!,
  },

  auto: input_element.querySelector<HTMLButtonElement>('#input-auto')!,
  delete: input_element.querySelector<HTMLButtonElement>('#input-delete')!,

  info: input_element.querySelector<HTMLButtonElement>('#input-info')!,
  undo: input_element.querySelector<HTMLButtonElement>('#input-undo')!,
  redo: input_element.querySelector<HTMLButtonElement>('#input-redo')!,
  setting: input_element.querySelector<HTMLButtonElement>('#input-setting')!,
}

export function initInput(board: Board, gameState: GameState) {
  const info_modal = initInfoModal(board)
  const setting_modal = initSettingModal(board)

  // eventlistner for mode
  entries(buttons.mode1).forEach(([key, button]) => {
    button.addEventListener('click', () => {
      gameState.mode1 = key
      render()
    })
  })

  entries(buttons.mode2).forEach(([key, button]) => {
    button.addEventListener('click', () => {
      gameState.mode2 = gameState.mode2 === key ? null : key
      render()
    })
  })

  // event listner for board
  entries(buttons.number).forEach(([key_, button]) => {
    const key = parseInt(key_) as V
    button.addEventListener('click', () => {
      if (gameState.mode2 === null || gameState.mode2 === 'select') {
        if (gameState.mode1 === 'num') {
          if (board.selected.size === 0) board.set_selected_by_digit(key)
          else board.toggle_digit(key)
        } else if (gameState.mode1 === 'memo') {
          if (board.selected.size === 0) board.set_selected_by_memo(key)
          else board.toggle_memo(key) // @todo: add/remove 우선 기능
        } else {
          // color
          if (board.selected.size === 0) board.set_selected_by_color(key)
          else board.toggle_color(key) // @todo: add/remove 우선 기능
        }
      } else {
        // branch
        // @todo
      }
      render()
    })
  })

  buttons.delete.addEventListener('click', () => {
    if (gameState.mode1 === 'num') {
      board.set_digit()
    } else if (gameState.mode1 === 'memo') {
      board.clear_memo()
    } else {
      // color
      board.clear_color()
    }
    render()
  })

  entries(buttons.number).forEach(([key_, button]) => {
    const key = parseInt(key_) as V

    enableLongPress(button)
    button.addEventListener('longpress', () => {
      board.set_selected_by_candidate(key)
    })
  })

  buttons.auto.addEventListener('click', () => {
    board.auto()
    render()
  })

  enableLongPress(buttons.mode2.select)
  buttons.mode2.select.addEventListener('longpress', () => {
    board.set_selected_by_selected_scope()
  })

  buttons.undo.addEventListener('click', () => {
    board.undo()
    render()
  })
  buttons.redo.addEventListener('click', () => {
    board.redo()
    render()
  })

  buttons.info.addEventListener('click', () => {
    info_modal.open()
  })
  buttons.setting.addEventListener('click', () => {
    setting_modal.open()
  })

  // @todo: in branch mode, replace mode1 buttons

  attachDragSelection(board, gameState)

  // render
  function render() {
    // set active state
    entries(buttons.mode1).forEach(([key, button]) => {
      button.classList.toggle('active', key === gameState.mode1)
    })
    entries(buttons.mode2).forEach(([key, button]) => {
      button.classList.toggle('active', key === gameState.mode2)
    })

    // set disabled state
    buttons.mode1.num.disabled = gameState.mode2 === 'branch'
    buttons.mode1.memo.disabled = gameState.mode2 === 'branch'
    buttons.mode1.color.disabled = gameState.mode2 === 'branch'
    buttons.mode2.select.disabled = gameState.mode2 === 'branch'
    buttons.auto.disabled = gameState.mode2 === 'branch' || !board.can_auto
    buttons.delete.disabled = gameState.mode2 === 'branch'
    buttons.undo.disabled = gameState.mode2 === 'branch' || !board.can_undo
    buttons.redo.disabled = gameState.mode2 === 'branch' || !board.can_redo

    // if color mode, set bg-color of number buttons
    entries(buttons.number).forEach(([key, button]) => {
      button.style.backgroundColor = gameState.mode1 === 'color' ? color_map[key] : ''
    })
  }

  render()
}

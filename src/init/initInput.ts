import { color_map } from '../const/color_map'
import { type Input } from '../types/Input'
import { type State } from '../types/State'
import { V } from '../types/base'
import { attachDragSelection } from '../util/attachDragSelection'
import { enableLongPress } from '../util/enableLongPress'
import { entries } from '../util/entries'

import { initInfoModal, initSettingModal } from './initModal'

const input_element = document.querySelector('#input')!

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

  branch_sub: {
    create_without_digit: input_element.querySelector<HTMLButtonElement>('#input-branch-create-without-digit')!,
    reject: input_element.querySelector<HTMLButtonElement>('#input-branch-reject')!,
    cancel: input_element.querySelector<HTMLButtonElement>('#input-branch-cancel')!,
  },

  auto: input_element.querySelector<HTMLButtonElement>('#input-auto')!,
  delete: input_element.querySelector<HTMLButtonElement>('#input-delete')!,

  info: input_element.querySelector<HTMLButtonElement>('#input-info')!,
  undo: input_element.querySelector<HTMLButtonElement>('#input-undo')!,
  redo: input_element.querySelector<HTMLButtonElement>('#input-redo')!,
  setting: input_element.querySelector<HTMLButtonElement>('#input-setting')!,
}

const branch_history_element = document.querySelector<HTMLOutputElement>('#branch-history')!

export function initInput(State: State): Input {
  const board = State.board!

  const input: Input = {
    info_modal: initInfoModal(board),
    setting_modal: initSettingModal(State),

    render() {
      // set active state
      entries(buttons.mode1).forEach(([key, button]) => {
        button.classList.toggle('active', key === State.Game.mode1)
      })
      entries(buttons.mode2).forEach(([key, button]) => {
        button.classList.toggle('active', key === State.Game.mode2)
      })

      // set disabled state
      buttons.mode2.select.disabled = State.Game.mode2 === 'branch'
      buttons.auto.disabled = (State.Setting.useCellAuto === 'off' && State.Setting.useGroupAuto === 'off') || State.Game.mode2 === 'branch' || !board.can_auto(State)
      buttons.auto.classList.toggle('invisible', State.Setting.useCellAuto === 'off' && State.Setting.useGroupAuto === 'off')
      buttons.delete.disabled = State.Game.mode2 === 'branch'
      buttons.undo.disabled = State.Game.mode2 === 'branch' || !board.can_undo
      buttons.redo.disabled = State.Game.mode2 === 'branch' || !board.can_redo
      buttons.branch_sub.reject.disabled = !board.can_reject_branch
      buttons.branch_sub.cancel.disabled = !board.can_cancel_branch

      // if color mode, set bg-color of number buttons
      entries(buttons.number).forEach(([key, button]) => {
        button.style.backgroundColor = State.Game.mode1 === 'color' ? color_map[key] : ''
      })

      // in branch mode, replace mode1 buttons
      buttons.mode1.num.classList.toggle('hide', State.Game.mode2 === 'branch')
      buttons.mode1.memo.classList.toggle('hide', State.Game.mode2 === 'branch')
      buttons.mode1.color.classList.toggle('hide', State.Game.mode2 === 'branch')
      buttons.branch_sub.create_without_digit.classList.toggle('hide', State.Game.mode2 !== 'branch')
      buttons.branch_sub.reject.classList.toggle('hide', State.Game.mode2 !== 'branch')
      buttons.branch_sub.cancel.classList.toggle('hide', State.Game.mode2 !== 'branch')

      // branch history
      branch_history_element.textContent = State.Game.mode2 === 'branch' ? board.branch_history : ''
    },
  }

  // eventlistner for mode
  entries(buttons.mode1).forEach(([key, button]) => {
    button.addEventListener('click', () => {
      State.Game.mode1 = key
      input.render()
    })
  })

  entries(buttons.mode2).forEach(([key, button]) => {
    button.addEventListener('click', () => {
      State.Game.mode2 = State.Game.mode2 === key ? null : key
      input.render()
    })
  })

  // event listner for board
  entries(buttons.number).forEach(([key_, button]) => {
    const key = parseInt(key_) as V
    button.addEventListener('click', () => {
      if (State.Game.mode2 === null || State.Game.mode2 === 'select') {
        if (State.Game.mode1 === 'num') {
          if (board.selected.size === 0) board.set_selected_by_digit(key)
          else board.toggle_digit(key, State.Setting.toggleMode)
        } else if (State.Game.mode1 === 'memo') {
          if (board.selected.size === 0) board.set_selected_by_memo(key)
          else board.toggle_memo(key, State.Setting.toggleMode)
        } else {
          // color
          if (board.selected.size === 0) board.set_selected_by_color(key)
          else board.toggle_color(key, State.Setting.toggleMode)
        }
      } else {
        // branch
        if (board.selected.size !== 1) return

        const cell = board.selected.values().next().value!
        if (cell.is_static) return
        if (cell.digit) return

        board.create_branch_with_digit(cell, key)
        State.Game.mode2 = null
      }
      input.render()
    })
  })

  buttons.delete.addEventListener('click', () => {
    if (State.Game.mode1 === 'num') {
      board.remove_digit()
    } else if (State.Game.mode1 === 'memo') {
      board.clear_memo()
    } else {
      // color
      board.clear_color()
    }
    input.render()
  })

  entries(buttons.number).forEach(([key_, button]) => {
    const key = parseInt(key_) as V

    enableLongPress(button)
    button.addEventListener('longpress', () => {
      board.set_selected_by_candidate(key)
    })
  })

  buttons.auto.addEventListener('click', () => {
    board.auto(State)
    input.render()
  })

  enableLongPress(buttons.mode2.select)
  buttons.mode2.select.addEventListener('longpress', () => {
    board.set_selected_by_selected_scope()
  })

  buttons.undo.addEventListener('click', () => {
    board.undo()
    input.render()
  })
  buttons.redo.addEventListener('click', () => {
    board.redo()
    input.render()
  })

  buttons.branch_sub.create_without_digit.addEventListener('click', () => {
    board.create_branch()
    State.Game.mode2 = null
    input.render()
  })
  buttons.branch_sub.reject.addEventListener('click', () => {
    board.reject_branch()
    State.Game.mode2 = null
    input.render()
  })
  buttons.branch_sub.cancel.addEventListener('click', () => {
    board.cancel_branch()
    State.Game.mode2 = null
    input.render()
  })

  buttons.info.addEventListener('click', () => {
    input.info_modal.open()
  })
  buttons.setting.addEventListener('click', () => {
    input.setting_modal.open()
  })

  attachDragSelection(board, State.Game)

  input.render()
  return input
}

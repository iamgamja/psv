import { color_map } from '../const/color_map'
import { type Cell } from '../types/Cell'
import { type Input } from '../types/Input'
import { type State } from '../types/State'
import { POSSchema, V } from '../types/base'
import { attachDragSelection } from '../util/attachDragSelection'
import { enableLongPress } from '../util/enableLongPress'
import { entries } from '../util/entries'

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

const branch_history_element = document.querySelector<HTMLElement>('#branch-history')!

export function initInput(State: State): Input {
  input_element.addEventListener('contextmenu', (e) => e.preventDefault())

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
    button.addEventListener('mousedown', (event) => {
      if (event.button !== 2) return
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
  buttons.mode2.select.addEventListener('mousedown', (event) => {
    if (event.button !== 2) return
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

  // keyboard events
  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  window.addEventListener('keydown', (e) => {
    if (document.querySelector('.modal-overlay')) return
    if (isTypingTarget(e.target)) return

    const key = e.key.toLowerCase()

    switch (key) {
      case 'z':
      case 'u':
        buttons.undo.click()
        e.preventDefault()
        return

      case 'x':
      case 'y':
      case 'r':
        buttons.redo.click()
        e.preventDefault()
        return

      case 'i':
        buttons.info.click()
        e.preventDefault()
        return

      case '/':
        buttons.setting.click()
        e.preventDefault()
        return

      case 'b':
        buttons.mode2.branch.click()
        e.preventDefault()
        return

      case ' ':
        buttons.auto.click()
        e.preventDefault()
        return

      case 'tab': {
        type Mode1 = State['Game']['mode1']
        const mode1Order: Mode1[] = ['num', 'memo', 'color']

        const idx = mode1Order.indexOf(State.Game.mode1)
        const nextIdx = e.shiftKey ? (idx - 1 + mode1Order.length) % mode1Order.length : (idx + 1) % mode1Order.length

        State.Game.mode1 = mode1Order[nextIdx]
        e.preventDefault()
        input.render()
        return
      }

      case 'control':
      case 'meta': {
        if (State.Game.mode2 === 'branch') return
        if (State.Game.mode2 !== 'select') {
          State.Game.mode2 = 'select'
          input.render()
        }
        return
      }

      case 'backspace':
      case 'delete': {
        buttons.delete.click()
        e.preventDefault()
        return
      }

      case 'escape': {
        board.clear_selected()
        return
      }

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        buttons.number[Number(key) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9].click()
        e.preventDefault()
        return
      }

      case 'w':
      case 'a':
      case 's':
      case 'd':
      case 'arrowup':
      case 'arrowdown':
      case 'arrowleft':
      case 'arrowright': {
        if (key === 'a' && (e.ctrlKey || e.metaKey)) {
          for (const cell of board.flat_cells) {
            board.selected.add(cell)
          }
          board.render()
          return
        }

        const map = {
          w: [-1, 0],
          arrowup: [-1, 0],
          s: [1, 0],
          arrowdown: [1, 0],
          a: [0, -1],
          arrowleft: [0, -1],
          d: [0, 1],
          arrowright: [0, 1],
        } as const
        const [dr, dc] = map[key as keyof typeof map]

        const nxt_cells = new Set<Cell>()
        for (const cell of board.selected) {
          const [r, c] = [cell.r - 1, cell.c - 1] // 0-index
          const [nxtr, nxtc] = [r + dr, c + dc]

          const pos = POSSchema.safeParse([nxtr, nxtc])
          if (!pos.success) continue

          nxt_cells.add(board.getCell(pos.data))
        }

        board.selected = nxt_cells
        board.render()
        return
      }
    }
  })

  window.addEventListener('keyup', (e) => {
    if (document.querySelector('.modal-overlay')) return
    if (isTypingTarget(e.target)) return

    const key = e.key.toLowerCase()

    switch (key) {
      case 'control':
      case 'meta': {
        if (State.Game.mode2 === 'branch') return
        if (State.Game.mode2 !== null) {
          State.Game.mode2 = null
          input.render()
        }
      }
    }
  })

  input.render()
  return input
}

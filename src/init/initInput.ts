import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { GameState } from '../types/GameState'
import { V } from '../types/base'
import { color_map } from '../const'
import { entries } from '../util/entries'
import { enableLongPress } from '../util/enableLongPress'

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
    let flag = false

    // 1. one cell, one memo
    const targets = board.empty_cells.filter((cell) => cell.valid_memo.size === 1)
    if (targets.length > 0) flag = true

    targets.forEach((cell) => {
      cell.digit = cell.valid_memo.values().next().value
    })

    // 2. one group, one digit, one memo
    for (const group of board.all_groups) {
      const cells = group.map(([r, c]) => board.cells[r][c])
      const empty_cells = cells.filter((cell) => !cell.digit)

      for (const digit of V) {
        const targets = empty_cells.filter((cell) => cell.valid_memo.has(digit))
        if (targets.length !== 1) continue

        flag = true
        targets[0].digit = digit
      }
    }

    if (flag) {
      board._check_errors()
      board._induct()
      board._check_warnings()
      board.render()
    }

    render()
  })

  enableLongPress(buttons.mode2.select)
  buttons.mode2.select.addEventListener('longpress', () => {
    board.set_selected_by_selected_scope()
  })

  // @todo: info, undo, redo, setting

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
    buttons.auto.disabled =
      gameState.mode2 === 'branch' ||
      !(
        board.empty_cells.some((cell) => cell.valid_memo.size === 1) ||
        board.all_groups.some((group) => V.some((digit) => group.map(([r, c]) => board.cells[r][c]).filter((cell) => !cell.digit && cell.valid_memo.has(digit)).length === 1))
      )

    buttons.delete.disabled = gameState.mode2 === 'branch'

    // if color mode, set bg-color of number buttons
    entries(buttons.number).forEach(([key, button]) => {
      button.style.backgroundColor = gameState.mode1 === 'color' ? color_map[key] : ''
    })
  }

  render()
}

function attachDragSelection(board: Board, gameState: GameState) {
  let dragging_mode: 'add' | 'remove' | null = null
  let pointerId: number | null = null

  function parseCellElement(el: Element): Cell | null {
    const cell_el = el.closest('.cell') as HTMLDivElement
    if (!cell_el) return null

    const rAttr = cell_el.dataset.r
    const cAttr = cell_el.dataset.c
    if (!rAttr || !cAttr) return null

    const r = Number(rAttr)
    const c = Number(cAttr)
    if (!Number.isInteger(r) || !Number.isInteger(c)) return null
    if (!(1 <= r && r <= 9 && 1 <= c && c <= 9)) return null

    return board.cells[r - 1][c - 1]
  }

  function getCellAtPoint(clientX: number, clientY: number): Cell | null {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const cell = parseCellElement(el)
      if (!cell) continue

      return cell
    }

    return null
  }

  function updateCellAtPoint(clientX: number, clientY: number) {
    if (dragging_mode === null) return

    const cell = getCellAtPoint(clientX, clientY)
    if (!cell) return

    if (dragging_mode === 'add') board.add_selected(cell)
    else board.remove_selected(cell)
  }

  function endDrag() {
    dragging_mode = null
    pointerId = null
  }

  window.addEventListener('pointerdown', (e: PointerEvent) => {
    // 마우스는 좌클릭만
    if (e.pointerType === 'mouse' && e.button !== 0) return

    // ignore button click
    if ((e.target as HTMLElement).closest('button')) return

    if (gameState.mode2 !== 'select') {
      board.clear_selected()

      dragging_mode = 'add'
    } else {
      const now_cell = getCellAtPoint(e.clientX, e.clientY)
      if (!now_cell) {
        endDrag()
        board.clear_selected()
        return
      }

      dragging_mode = board.selected.has(now_cell) ? 'remove' : 'add'
    }

    pointerId = e.pointerId

    updateCellAtPoint(e.clientX, e.clientY)
  })

  board.container_element.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging_mode || pointerId !== e.pointerId) return
    updateCellAtPoint(e.clientX, e.clientY)
  })

  board.container_element.addEventListener('pointerup', (e: PointerEvent) => {
    if (e.pointerId === pointerId) endDrag()
  })

  board.container_element.addEventListener('pointercancel', (e: PointerEvent) => {
    if (e.pointerId === pointerId) endDrag()
  })

  board.container_element.addEventListener('lostpointercapture', () => {
    if (dragging_mode) endDrag()
  })
}

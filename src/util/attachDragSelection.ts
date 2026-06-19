import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'
import type { GameState } from '../types/GameState'

export function attachDragSelection(board: Board, gameState: GameState) {
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

  const container_element = document.querySelector<HTMLDivElement>('#board-container')!

  container_element.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging_mode || pointerId !== e.pointerId) return
    updateCellAtPoint(e.clientX, e.clientY)
  })

  container_element.addEventListener('pointerup', (e: PointerEvent) => {
    if (e.pointerId === pointerId) endDrag()
  })

  container_element.addEventListener('pointercancel', (e: PointerEvent) => {
    if (e.pointerId === pointerId) endDrag()
  })

  container_element.addEventListener('lostpointercapture', () => {
    if (dragging_mode) endDrag()
  })
}

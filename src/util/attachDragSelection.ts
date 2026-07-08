import { type Board } from '../types/Board'
import { type Cell } from '../types/Cell'
import { type GameState } from '../types/State'
export function attachDragSelection(board: Board, gameState: GameState) {
  let dragging_mode: 'add' | 'remove' | null = null
  let pointerId: number | null = null
  const container_element = document.querySelector<HTMLDivElement>('#board-container')!
  const supportsPointerCapture = typeof container_element.setPointerCapture === 'function'
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
      if (cell) return cell
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
    if (pointerId !== null && supportsPointerCapture && container_element.hasPointerCapture(pointerId)) {
      try {
        container_element.releasePointerCapture(pointerId)
      } catch {
        // ignore
      }
    }
    dragging_mode = null
    pointerId = null
  }
  window.addEventListener('pointerdown', (e: PointerEvent) => {
    // 마우스는 좌클릭만
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // button 클릭은 무시
    if ((e.target as HTMLElement | null)?.closest('button')) return

    const now_cell = getCellAtPoint(e.clientX, e.clientY)

    if (gameState.mode2 !== 'select') {
      board.clear_selected()
      dragging_mode = 'add'
    } else {
      if (!now_cell) {
        endDrag()
        board.clear_selected()
        return
      }

      dragging_mode = board.selected.has(now_cell) ? 'remove' : 'add'
    }

    pointerId = e.pointerId

    // 드래그 중 보드 밖으로 나가도 계속 이벤트를 받도록 캡처
    if (supportsPointerCapture) {
      try {
        container_element.setPointerCapture(e.pointerId)
      } catch {
        // capture 실패해도 window 리스너로 동작은 계속됨
      }
    }

    // 드래그 중 텍스트 선택 같은 기본 동작 방지
    e.preventDefault()

    updateCellAtPoint(e.clientX, e.clientY)
  })
  const onPointerMove = (e: PointerEvent) => {
    if (dragging_mode === null || pointerId !== e.pointerId) return
    updateCellAtPoint(e.clientX, e.clientY)
  }
  const onPointerUpOrCancel = (e: PointerEvent) => {
    if (e.pointerId === pointerId) endDrag()
  }
  // window에 붙여서 컨테이너 밖으로 나가도 마우스 드래그가 끊기지 않게 함
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUpOrCancel)
  window.addEventListener('pointercancel', onPointerUpOrCancel)
  container_element.addEventListener('lostpointercapture', () => {
    if (dragging_mode !== null) endDrag()
  })
}

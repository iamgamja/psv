interface LongPressOptions {
  duration?: number
}

export function enableLongPress(element: HTMLElement, options: LongPressOptions = {}) {
  const duration = options.duration ?? 300

  let timer: number | undefined
  let pointerId: number | undefined

  const start = (event: PointerEvent) => {
    // 다른 pointer 무시
    if (pointerId !== undefined) return

    pointerId = event.pointerId

    timer = window.setTimeout(() => {
      element.dispatchEvent(
        new CustomEvent('longpress', {
          detail: {
            pointerEvent: event,
          },
        }),
      )

      timer = undefined
    }, duration)
  }

  const cancel = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return

    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    pointerId = undefined
  }

  element.addEventListener('pointerdown', start)
  element.addEventListener('pointerup', cancel)
  element.addEventListener('pointercancel', cancel)
  element.addEventListener('pointerleave', cancel)
}

declare global {
  interface HTMLElementEventMap {
    longpress: CustomEvent<{
      pointerEvent: PointerEvent
    }>
  }
}

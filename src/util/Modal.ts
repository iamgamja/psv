import { createElement } from './createElement'

/**
 * ```
 * div.modal-overlay
 *   div.modal-container
 *     div.modal-header
 *       div.modal-title
 *       button.modal-close-btn
 *     div.modal-body
 * ```
 */
export class Modal {
  private overlay: HTMLDivElement
  body: HTMLDivElement
  private isOpen = false
  private closeTimer: number | null = null

  constructor(id: string, title?: string) {
    this.overlay = createElement('div', {
      id,
      className: 'modal-overlay',
      content: createElement('div', {
        className: 'modal-container',
        content: [
          createElement('div', {
            className: 'modal-header',
            content: [
              createElement('div', {
                className: 'modal-title',
                content: title,
              }),
              createElement('button', {
                className: 'modal-close-button',
                onclick: () => {
                  this.close()
                },
              }),
            ],
          }),
          (this.body = createElement('div', {
            className: 'modal-body',
          })),
        ],
        onclick: (event) => {
          event.stopPropagation()
        },
      }),
      onclick: () => {
        this.close()
      },
    })
  }

  open(): void {
    if (this.isOpen) return

    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    document.body.appendChild(this.overlay)
    requestAnimationFrame(() => {
      this.overlay.classList.add('open')
    })
    document.addEventListener('keydown', this.handleKeyDown)

    this.isOpen = true
  }

  close(): void {
    if (!this.isOpen) return

    this.overlay.classList.remove('open')
    document.removeEventListener('keydown', this.handleKeyDown)
    this.closeTimer = window.setTimeout(() => {
      if (this.overlay.parentElement) {
        this.overlay.parentElement.removeChild(this.overlay)
      }
      this.closeTimer = null
    }, 200)

    this.isOpen = false
  }

  toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close()
    }
  }
}

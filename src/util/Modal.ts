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
  private container: HTMLDivElement
  body: HTMLDivElement
  private closeBtn: HTMLButtonElement
  private isOpen = false
  private closeTimer: number | null = null

  constructor(overlay: HTMLDivElement) {
    this.overlay = overlay
    this.container = this.overlay.querySelector('.modal-container')!
    this.body = this.container.querySelector('.modal-body')!
    this.closeBtn = this.container.querySelector('.modal-close-btn')!

    this.overlay.addEventListener('click', this.handleOverlayClick)
    this.container.addEventListener('click', (event) => event.stopPropagation())
    this.closeBtn.addEventListener('click', this.handleOverlayClick)
  }

  open(): void {
    if (this.isOpen) {
      return
    }
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    document.body.appendChild(this.overlay)
    requestAnimationFrame(() => {
      this.overlay.classList.add('open')
      this.container.classList.add('open')
    })
    document.addEventListener('keydown', this.handleKeyDown)
    this.isOpen = true
  }

  close(): void {
    if (!this.isOpen) {
      return
    }
    this.overlay.classList.remove('open')
    this.container.classList.remove('open')
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

  private handleOverlayClick = (): void => {
    this.close()
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close()
    }
  }
}

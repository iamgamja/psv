export interface ModalOptions {
  title?: string
  content?: string | Node
}

export class Modal {
  private overlay: HTMLDivElement
  private container: HTMLDivElement
  private body: HTMLDivElement
  private isOpen = false
  private closeTimer: number | null = null
  private options: Required<ModalOptions>

  constructor(options: ModalOptions = {}) {
    this.options = {
      title: '',
      content: '',
      ...options,
    }

    this.overlay = document.createElement('div')
    this.overlay.classList.add('modal-overlay')
    this.overlay.addEventListener('click', this.handleOverlayClick)

    this.container = document.createElement('div')
    this.container.classList.add('modal-container')
    this.container.addEventListener('click', (event) => event.stopPropagation())

    if (this.options.title) {
      const header = document.createElement('div')
      header.classList.add('modal-header')

      const title = document.createElement('div')
      title.textContent = this.options.title
      title.classList.add('modal-title')
      header.appendChild(title)

      this.container.appendChild(header)
    }

    this.body = document.createElement('div')
    this.body.classList.add('modal-body')
    this.setContent(this.options.content)
    this.container.appendChild(this.body)
    this.overlay.appendChild(this.container)
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

  setContent(content: string | Node): void {
    this.body.innerHTML = ''
    if (typeof content === 'string') {
      this.body.innerHTML = content
    } else if (content instanceof Node) {
      this.body.appendChild(content)
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

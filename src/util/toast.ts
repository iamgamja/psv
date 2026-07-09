import { createElement } from './createElement'

type ToastType = 'info' | 'success' | 'error'

function ensureContainer(): HTMLElement {
  let container = document.getElementById('toast-container')
  if (container) return container

  container = createElement('div', { id: 'toast-container' })
  document.body.appendChild(container)
  return container
}

function createToastElement(content: string | Node | (string | Node)[], type: ToastType): HTMLElement {
  const toast = createElement('div', {
    className: ['toast', `toast-${type}`],
    content: [
      createElement('div', { className: 'toast-content', content: content }),
      createElement('button', {
        className: 'toast-close-button',
        content: '✕',
        onclick: () => {
          toast.remove()
        },
      }),
    ],
  })
  return toast
}

export function showToast(content: string | Node | (string | Node)[], type: ToastType = 'info'): HTMLElement {
  const container = ensureContainer()
  const toast = createToastElement(content, type)
  // newest on top
  container.insertBefore(toast, container.firstChild)
  return toast
}

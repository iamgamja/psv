import { createElement } from './createElement'

type ToastType = 'info' | 'success' | 'error'

function ensureContainer(): HTMLElement {
  let container = document.getElementById('toast-container')
  if (container) return container

  container = createElement('div', { id: 'toast-container' })
  document.body.appendChild(container)
  return container
}

function createToastElement(message: string, type: ToastType): HTMLElement {
  const toast = createElement('div', {
    className: ['toast', `toast-${type}`],
    content: [
      createElement('div', { className: 'toast-message', content: message }),
      createElement('button', {
        className: 'toast-close-button',
        content: '✕',
        eventlistner: {
          click: () => {
            toast.remove()
          },
        },
      }),
    ],
  })
  return toast
}

export function showToast(message: string, type: ToastType = 'info'): HTMLElement {
  const container = ensureContainer()
  const toast = createToastElement(message, type)
  // newest on top
  container.insertBefore(toast, container.firstChild)
  return toast
}

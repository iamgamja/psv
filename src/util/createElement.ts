import { entries } from './entries'

interface CreateElementOptions {
  id?: string
  className?: string | string[]
  content?: string | Node | (string | Node)[]

  eventlistner?: {
    [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => any
  }
}

export function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, options?: CreateElementOptions) {
  const ele = document.createElement(tag)

  if (options?.id) {
    ele.id = options.id
  }

  if (options?.className) {
    if (Array.isArray(options.className)) ele.classList.add(...options.className)
    else ele.classList.add(options.className)
  }

  if (options?.content) {
    if (Array.isArray(options.content)) ele.append(...options.content.map((x) => (x instanceof Node ? x : createElement('span', { content: x }))))
    else ele.append(options.content)
  }

  if (options?.eventlistner) {
    for (const [key, callback] of entries(options.eventlistner)) {
      // @ts-ignore
      if (callback) ele.addEventListener(key, callback)
    }
  }

  return ele
}

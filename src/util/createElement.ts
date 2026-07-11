interface CreateElementOptions {
  id?: string
  className?: string | string[]
  attr?: [string, string][]
  content?: string | Node | (string | Node)[]

  onclick?: (e: TouchEvent) => unknown
  onchange?: (e: Event) => unknown
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

  if (options?.attr) {
    for (const [key, value] of options.attr) {
      ele.setAttribute(key, value)
    }
  }

  if (options?.content) {
    if (Array.isArray(options.content)) ele.append(...options.content.map((x) => (x instanceof Node ? x : createElement('span', { content: x }))))
    else ele.append(options.content)
  }

  if (options?.onclick) {
    ele.addEventListener('click', (e) => {
      options!.onclick!(e as TouchEvent)
    })
  }
  if (options?.onchange) {
    ele.addEventListener('change', (e) => {
      options!.onchange!(e as Event)
    })
  }

  return ele
}

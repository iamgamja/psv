interface CreateElementOptions {
  className?: string | string[]
  content?: string | Node | (string | Node)[]
}

export function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, options?: CreateElementOptions) {
  const ele = document.createElement(tag)

  if (options?.className) {
    if (Array.isArray(options.className)) ele.classList.add(...options.className)
    else ele.classList.add(options.className)
  }

  if (options?.content) {
    if (Array.isArray(options.content)) ele.append(...options.content)
    else ele.append(options.content)
  }

  return ele
}

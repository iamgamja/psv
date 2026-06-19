import { RuleText } from '../const/rule_text'
import type { Board } from '../types/Board'
import { createElement } from '../util/createElement'
import { Modal } from '../util/Modal'

export function initInfoModal(board: Board) {
  const info_modal = new Modal(document.querySelector('#info-modal') as HTMLDivElement)

  const elapsedValue = createElement('span')

  const root = createElement('ul', {
    content: [
      createElement('li', { content: `id: ${board.level.id}` }),
      createElement('li', { content: `난이도: ${board.level.difficulty}` }),
      createElement('li', {
        content: [
          '규칙:',
          createElement('ul', {
            content: board.rules.map((rule) => createElement('li', { content: RuleText[rule.id] })),
          }),
        ],
      }),
      createElement('li', { content: ['공개 후 경과 시간: ', elapsedValue] }),
    ],
  })

  info_modal.body.appendChild(root)

  function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000)

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts: string[] = []
    if (hours > 0) parts.push(`${hours}시간`)
    if (minutes > 0 || hours > 0) parts.push(`${minutes}분`)
    parts.push(`${seconds}초`)

    return parts.join(' ')
  }

  function updateElapsedTime() {
    if (!board.level.published_at) {
      elapsedValue.textContent = '-'
      return
    }

    const publishedTime = new Date(board.level.published_at).getTime()
    const now = Date.now()

    elapsedValue.textContent = formatElapsed(Math.max(0, now - publishedTime))
  }

  updateElapsedTime()

  setInterval(updateElapsedTime, 1000)

  return info_modal
}

export function initSettingModal(board: Board) {
  const setting_modal = new Modal(document.querySelector('#setting-modal') as HTMLDivElement)
  return setting_modal
}

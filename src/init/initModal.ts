import { RuleText } from '../const/rule_text'
import type { Board } from '../types/Board'
import { isKnown } from '../types/Rule'
import { createElement } from '../util/createElement'
import { Modal } from '../util/Modal'

export function initInfoModal(board: Board) {
  const info_modal = new Modal(document.querySelector('#info-modal') as HTMLDivElement)

  let elapsed_timer_span: HTMLSpanElement | null = null
  let base64_input: HTMLInputElement | null = null

  info_modal.body.append(
    createElement('ul', {
      content: [
        createElement('li', { content: `id: ${board.level.id}` }),
        createElement('li', { content: `난이도: ${board.level.difficulty}` }),
        createElement('li', {
          content: [
            '규칙:',
            createElement('ul', {
              content: board.rules.map((rule) => createElement('li', { content: isKnown(rule) ? RuleText[rule.id] : rule.id })),
            }),
          ],
        }),
        createElement('li', {
          content: ['공개 후 경과 시간: ', (elapsed_timer_span = createElement('span'))],
        }),
      ],
    }),
    createElement('hr'),
    createElement('div', {
      content: createElement('label', {
        content: [
          'base64 코드: ',
          (base64_input = createElement('input')),
          createElement('button', {
            content: 'load',
            eventlistner: {
              click: () => {
                const url = new URL(window.location.href)
                url.searchParams.set('data', base64_input!.value)

                history.pushState(null, '', url.toString())
                location.reload()
              },
            },
          }),
        ],
      }),
    }),

    createElement('button', {
      className: 'red',
      content: 'reset',
      eventlistner: {
        click: () => {
          board.reset()
        },
      },
    }),
  )

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
      elapsed_timer_span!.textContent = '-'
      return
    }

    const publishedTime = new Date(board.level.published_at).getTime()
    const now = Date.now()

    elapsed_timer_span!.textContent = formatElapsed(Math.max(0, now - publishedTime))
  }

  updateElapsedTime()

  setInterval(updateElapsedTime, 1000)

  info_modal.open() // default open
  return info_modal
}

export function initSettingModal(board: Board) {
  const setting_modal = new Modal(document.querySelector('#setting-modal') as HTMLDivElement)
  return setting_modal
}

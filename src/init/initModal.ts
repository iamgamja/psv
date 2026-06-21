import { RuleText } from '../const/rule_text'
import type { Board } from '../types/Board'
import type { SettingState, State } from '../types/State'
import { isKnown } from '../types/Rule'
import { createElement } from '../util/createElement'
import { entries } from '../util/entries'
import { Modal } from '../util/Modal'
import { saveSetting } from './saveloadSetting'

export function initInfoModal(board: Board) {
  const info_modal = new Modal('info-modal', 'Info')

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
      className: 'list',
      content: [
        createElement('label', {
          content: ['base64 코드: ', (base64_input = createElement('input'))],
        }),
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

export function initSettingModal(State: State) {
  const setting_modal = new Modal('setting-modal', 'State.Setting')

  type ButtonMap = {
    [K in keyof SettingState]: Record<SettingState[K], HTMLButtonElement | null>
  }

  const button_map: ButtonMap = {
    toggleMode: { add_prefer: null, remove_prefer: null },
    fillMemoWhenInit: { on: null, off: null },
    useAuto: { on: null, off: null },
    useCellWarning: { on: null, off: null },
    useGroupWarning: { on: null, off: null },
  }

  setting_modal.body.append(
    createElement('ul', {
      content: [
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '토글 시 우선순위: ',
              (button_map.toggleMode.add_prefer = createElement('button', {
                content: '추가 우선',
              })),
              (button_map.toggleMode.remove_prefer = createElement('button', {
                content: '제거 우선',
              })),
            ],
          }),
        }),
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '로드 시 메모 채우기: ',
              (button_map.fillMemoWhenInit.on = createElement('button', {
                content: 'on',
              })),
              (button_map.fillMemoWhenInit.off = createElement('button', {
                content: 'off',
              })),
            ],
          }),
        }),
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '자동 채우기 기능: ',
              (button_map.useAuto.on = createElement('button', {
                content: 'on',
              })),
              (button_map.useAuto.off = createElement('button', {
                content: 'off',
              })),
            ],
          }),
        }),
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '후보가 없는 칸 경고: ',
              (button_map.useCellWarning.on = createElement('button', {
                content: 'on',
              })),
              (button_map.useCellWarning.off = createElement('button', {
                content: 'off',
              })),
            ],
          }),
        }),
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '[R], [C], [B], [SG]에서 후보에 없는 숫자 경고: ',
              (button_map.useGroupWarning.on = createElement('button', {
                content: 'on',
              })),
              (button_map.useGroupWarning.off = createElement('button', {
                content: 'off',
              })),
            ],
          }),
        }),
      ],
    }),
  )
  ;(function initButton<K extends keyof SettingState>() {
    for (const [setting_key, buttons] of entries(button_map) as [K, ButtonMap[K]][]) {
      for (const [setting_value, button] of entries(buttons) as [keyof ButtonMap[K], HTMLButtonElement][]) {
        button.classList.toggle('active', State.Setting[setting_key] === setting_value)
        button.addEventListener('click', () => {
          State.Setting[setting_key] = setting_value as SettingState[K]
          for (const [v, b] of entries(buttons) as [keyof ButtonMap[K], HTMLButtonElement][]) {
            b?.classList.toggle('active', v === State.Setting[setting_key])
          }

          saveSetting(State.Setting)
        })
      }
    }
  })()

  button_map.useAuto.on.addEventListener('click', () => State.input?.render())
  button_map.useAuto.off.addEventListener('click', () => State.input?.render())

  return setting_modal
}

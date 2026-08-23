import { RuleText } from '../const/rule_text'
import { STORAGE_PREFIX_HISTORY } from '../const/storage_key'
import { type Board } from '../types/Board'
import { isKnown } from '../types/Rule'
import { type SettingState, type State } from '../types/State'
import { Modal } from '../util/Modal'
import { createElement } from '../util/createElement'
import { entries } from '../util/entries'

import { saveSetting } from './saveloadSetting'

export function initInfoModal(board: Board) {
  const info_modal = new Modal('info-modal', 'Info')

  let form_element: HTMLFormElement | null = null
  let base64_input: HTMLInputElement | null = null
  let elapsed_timer_span: HTMLSpanElement | null = null

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

    (form_element = createElement('form', {
      className: 'list',
      content: [
        createElement('label', {
          content: ['id 혹은 base64 코드: ', (base64_input = createElement('input'))],
        }),
        createElement('button', {
          content: 'load',
          onclick: () => {
            form_element?.submit()
          },
        }),
      ],
    })),
    createElement('button', {
      className: 'red',
      content: 'reset',
      onclick: () => {
        board.reset()
      },
    }),

    createElement('hr'),

    createElement('button', {
      content: 'view storage',
      onclick: () => {
        info_modal.close()
        createStorageViewerModal(board).open()
      },
    }),
  )

  form_element.addEventListener('submit', async (e) => {
    e.preventDefault()

    const url = new URL(window.location.href)
    url.searchParams.set('code', base64_input!.value)

    history.pushState(null, '', url.toString())
    location.reload()
  })

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
  const setting_modal = new Modal('setting-modal', 'Setting')

  type ButtonMap = {
    [K in keyof SettingState]: Record<SettingState[K], HTMLButtonElement | null>
  }

  const button_map: ButtonMap = {
    toggleMode: { add_prefer: null, remove_prefer: null },
    fillMemoWhenInit: { on: null, off: null },
    useCellAuto: { on: null, off: null },
    useGroupAuto: { on: null, off: null },
    useCellWarning: { on: null, off: null },
    useGroupWarning: { on: null, off: null },
    dimMemo: { off: null, rcb: null, all: null },
  }

  setting_modal.body.append(
    createElement('span', { content: '게임 중 설정을 변경할 경우 제대로 동작하지 않을 수 있습니다. 이 경우 Info -> reset 으로 게임을 초기화하여 해결할 수 있습니다.' }),
    createElement('hr'),
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
              '후보가 하나인 칸 자동 채우기: ',
              (button_map.useCellAuto.on = createElement('button', {
                content: 'on',
              })),
              (button_map.useCellAuto.off = createElement('button', {
                content: 'off',
              })),
            ],
          }),
        }),
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '[R], [C], [B], [SG]에서 후보로 가지는 칸이 하나인 숫자 자동 채우기: ',
              (button_map.useGroupAuto.on = createElement('button', {
                content: 'on',
              })),
              (button_map.useGroupAuto.off = createElement('button', {
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
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              '후보 흐리게 표시: ',
              (button_map.dimMemo.off = createElement('button', {
                content: '끄기',
              })),
              (button_map.dimMemo.rcb = createElement('button', {
                content: '[R], [C], [B], [SG]만',
              })),
              (button_map.dimMemo.all = createElement('button', {
                content: '전부',
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

  button_map.useCellAuto.on.addEventListener('click', () => State.input?.render())
  button_map.useCellAuto.off.addEventListener('click', () => State.input?.render())
  button_map.useGroupAuto.on.addEventListener('click', () => State.input?.render())
  button_map.useGroupAuto.off.addEventListener('click', () => State.input?.render())
  return setting_modal
}

function getHistorySize(): Record<string, number> {
  const result: Record<string, number> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)

    if (key && key.startsWith(STORAGE_PREFIX_HISTORY)) {
      const value = localStorage.getItem(key)

      if (value !== null) {
        result[key.slice(STORAGE_PREFIX_HISTORY.length)] = new TextEncoder().encode(value).length
      }
    }
  }

  return result
}

function createStorageViewerModal(board: Board) {
  const storage_viewer_modal = new Modal('storage-viewer-modal', 'localStorage')

  function render() {
    const history_sizes = getHistorySize()
    const sum_size = Object.values(history_sizes).reduce((a, b) => a + b, 0)

    while (storage_viewer_modal.body.firstChild) storage_viewer_modal.body.firstChild.remove()

    storage_viewer_modal.body.append(
      createElement('ul', {
        content: createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              createElement('code', {
                className: 'list',
                content: ['전체', ':', `${sum_size}B`, `(${((sum_size / 5e6) * 100).toFixed(6)}%)`],
              }),
            ],
          }),
        }),
      }),
      createElement('hr'),
      createElement('ul', {
        content: entries(history_sizes)
          .sort((a, b) => b[1] - a[1]) // 크기 내림차순 정렬
          .map(([id, size]) =>
            createElement('li', {
              content: createElement('div', {
                className: 'list',
                content: [
                  createElement('code', {
                    className: 'list',
                    content: [
                      createElement('span', {
                        className: id === board.level.id ? 'blue' : undefined,
                        content: id,
                      }),
                      ':',
                      `${size}B`,
                      `(${((size / 5e6) * 100).toFixed(6)}%)`,
                    ],
                  }),
                  createElement('button', {
                    className: 'red',
                    content: 'delete',
                    onclick: () => {
                      localStorage?.removeItem(`${STORAGE_PREFIX_HISTORY}${id}`)

                      render()
                    },
                  }),
                ],
              }),
            }),
          ),
      }),
    )
  }

  render()

  return storage_viewer_modal
}

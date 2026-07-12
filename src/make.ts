import { distances } from './const/check_helper'
import { default_game_state, default_level } from './const/default'
import { RuleText } from './const/rule_text'
import { STORAGE_KEY_MAKING } from './const/storage_key'
import { initBoard } from './init/initBoard'
import { initLevel } from './init/initLevel'
import { renderRules } from './init/renderRules'
import { loadSetting } from './init/saveloadSetting'
import { type LevelData } from './types/LevelData'
import { type Rule, RuleIdSchema, RuleSchema, Rule_ID, isKnown } from './types/Rule'
import { type State } from './types/State'
import { type Group, IDX0, type POS, V } from './types/base'
import { Modal } from './util/Modal'
import { attachDragSelection } from './util/attachDragSelection'
import { createElement } from './util/createElement'
import { POS2number, cell2POS } from './util/groups'
import { type InputMessage, type OutputMessage } from './util/solver.worker'
import { showToast } from './util/toast'

function saveLevel(level: LevelData) {
  localStorage.setItem(STORAGE_KEY_MAKING, btoa(JSON.stringify(level)))
}
function deleteLevel() {
  localStorage.removeItem(STORAGE_KEY_MAKING)
}

const level = initLevel(localStorage.getItem(STORAGE_KEY_MAKING) ?? '') ?? { ...default_level, id: `customlevel-${Date.now()}` }
saveLevel(level)

const State: State = {
  Game: {
    ...default_game_state,
    mode2: 'select',
  },
  Setting: {
    ...loadSetting(),
    fillMemoWhenInit: 'off',
    useCellAuto: 'off',
    useGroupAuto: 'off',
    useCellWarning: 'off',
    useGroupWarning: 'off',
    dimMemo: 'off',
  },
}

State.board = initBoard(level, State, true)

const board = State.board

attachDragSelection(board, State.Game)

// -----------

const DefaultRuleMap: { [K in Rule_ID]: Extract<Rule, { id: K }> } = {
  '[Sudoku]': {
    id: '[Sudoku]',
  },
  '[R]': {
    id: '[R]',
  },
  "[R']": {
    id: "[R']",
  },
  '[C]': {
    id: '[C]',
  },
  '[B]': {
    id: '[B]',
  },
  '[SG]': {
    id: '[SG]',
    render_state: {
      regions: [],
    },
  },
  "[SG']": {
    id: "[SG']",
    render_state: {
      regions: [],
    },
  },

  '[DT]': {
    id: '[DT]',
  },
  '[LK]': {
    id: '[LK]',
    render_state: {
      edges: [],
    },
  },
  "[LK']": {
    id: "[LK']",
    render_state: {
      edges: [],
    },
  },
  '[PO]': {
    id: '[PO]',
    render_state: {
      edges: [],
    },
  },
  '[LO]': {
    id: '[LO]',
    render_state: {
      cells: [],
    },
  },
  "[LO']": {
    id: "[LO']",
    render_state: {
      cells: [],
    },
  },
  '[TP]': {
    id: '[TP]',
  },
  '[QD]': {
    id: '[QD]',
  },
  "[QD']": {
    id: "[QD']",
  },

  '[TM]': {
    id: '[TM]',
    render_state: {
      regions: [],
    },
  },
  '[AQ]': {
    id: '[AQ]',
    render_state: {
      regions: [],
    },
  },
  '[PA]': {
    id: '[PA]',
    render_state: {
      dominoes: [],
    },
  },

  '[MR]': {
    id: '[MR]',
    render_state: {
      metros: [],
    },
  },
  '[SR]': {
    id: '[SR]',
    render_state: {
      streams: [],
    },
  },
  '[IV]': {
    id: '[IV]',
    render_state: {
      lines: [],
    },
  },

  '[TR]': {
    id: '[TR]',
    render_state: { start: [0, 0], end: [0, 1] },
  },
  "[TR']": {
    id: "[TR']",
    render_state: { start: [0, 0], end: [0, 1] },
  },
  '[BD]': {
    id: '[BD]',
    render_state: {
      start_rows: [],
    },
  },

  '[VT]': {
    id: '[VT]',
    render_state: {
      arrows: [],
    },
  },
  '[RT]': {
    id: '[RT]',
    render_state: {
      cells: [],
    },
  },
  "[RT']": {
    id: "[RT']",
    render_state: {
      cells: [],
    },
  },
  '[RF]': {
    id: '[RF]',
    render_state: {
      lines: [],
    },
  },

  '[MT]': {
    id: '[MT]',
    render_state: {
      diamond_cells: [],
    },
  },
  '[BP]': {
    id: '[BP]',
  },
  '[EF]': {
    id: '[EF]',
    render_state: {
      marked_cells: [],
    },
  },

  '[ES]': {
    id: '[ES]',
  },
  '[EP]': {
    id: '[EP]',
  },

  '[PR]': {
    id: '[PR]',
    render_state: {
      edges: [],
    },
  },
  "[PR']": {
    id: "[PR']",
    render_state: {
      triplets: [],
    },
  },

  '[QT]': {
    id: '[QT]',
    render_state: {
      side_hints: [],
    },
  },
  '[RG]': {
    id: '[RG]',
    render_state: {
      side_hints: [],
    },
  },
  "[RG']": {
    id: "[RG']",
    render_state: {
      side_hints: [],
    },
  },
  '[PD]': {
    id: '[PD]',
    render_state: {
      side_hints: [],
    },
  },
  '[SQ]': {
    id: '[SQ]',
    render_state: {
      side_hints: [],
    },
  },
  "[SQ']": {
    id: "[SQ']",
    render_state: {
      side_hints: [],
    },
  },

  '[ST]': {
    id: '[ST]',
    render_state: {
      pieces: [],
    },
  },
}

function addHint(rule: Rule, selected: POS[]): boolean {
  switch (rule.id) {
    case '[Sudoku]': {
      return true
    }
    case '[R]': {
      return true
    }
    case "[R']": {
      return true
    }
    case '[C]': {
      return true
    }
    case '[B]': {
      return true
    }
    case '[SG]': {
      rule.render_state.regions.push(selected)
      return true
    }
    case "[SG']": {
      rule.render_state.regions.push(selected)
      return true
    }

    case '[DT]': {
      return true
    }
    case '[LK]': {
      if (selected.length !== 2) return false

      rule.render_state.edges.push(selected)
      return true
    }
    case "[LK']": {
      if (selected.length !== 2) return false

      rule.render_state.edges.push(selected)
      return true
    }
    case '[PO]': {
      if (selected.length !== 2) return false

      rule.render_state.edges.push(selected)
      return true
    }
    case '[LO]': {
      rule.render_state.cells = rule.render_state.cells.concat(selected)
      return true
    }
    case "[LO']": {
      rule.render_state.cells = rule.render_state.cells.concat(selected)
      return true
    }
    case '[TP]': {
      return true
    }
    case '[QD]': {
      return true
    }
    case "[QD']": {
      return true
    }

    case '[TM]': {
      if (selected.length !== 3) return false

      rule.render_state.regions.push({ cells: selected, color: 'red' })
      return true
    }
    case '[AQ]': {
      rule.render_state.regions.push(selected)
      return true
    }
    case '[PA]': {
      if (selected.length !== 2) return false

      rule.render_state.dominoes.push(selected)
      return true
    }

    case '[MR]': {
      rule.render_state.metros.push(selected)
      return true
    }
    case '[SR]': {
      rule.render_state.streams.push(selected)
      return true
    }
    case '[IV]': {
      rule.render_state.lines.push(selected)
      return true
    }

    case '[TR]': {
      if (selected.length !== 2) return false

      rule.render_state = { start: selected[0], end: selected[1] }
      return true
    }
    case "[TR']": {
      if (selected.length !== 2) return false

      rule.render_state = { start: selected[0], end: selected[1] }
      return true
    }
    case '[BD]': {
      rule.render_state.start_rows = rule.render_state.start_rows.concat(selected.map(([r, _c]) => r))
      return true
    }

    case '[VT]': {
      if (selected.length !== 1) return false

      rule.render_state.arrows.push([...selected[0], 'L'])
      return true
    }
    case '[RT]': {
      if (selected.length !== 1) return false

      rule.render_state.cells.push([...selected[0], 0])
      return true
    }
    case "[RT']": {
      if (selected.length !== 1) return false

      rule.render_state.cells.push([...selected[0], 0])
      return true
    }
    case '[RF]': {
      if (selected.length !== 9) return false

      if (selected.every(([r, _c]) => r === selected[0][0])) {
        rule.render_state.lines.push(['ROW', selected[0][0]])
        return true
      }
      if (selected.every(([_r, c]) => c === selected[0][1])) {
        rule.render_state.lines.push(['COL', selected[0][1]])
        return true
      }

      return false
    }

    case '[MT]': {
      rule.render_state.diamond_cells = rule.render_state.diamond_cells.concat(selected)
      return true
    }
    case '[BP]': {
      return true
    }
    case '[EF]': {
      rule.render_state.marked_cells = rule.render_state.marked_cells.concat(selected)
      return true
    }

    case '[ES]': {
      return true
    }
    case '[EP]': {
      return true
    }

    case '[PR]': {
      if (selected.length !== 2) return false

      rule.render_state.edges.push([...selected[0], ...selected[1], true])
      return true
    }
    case "[PR']": {
      if (selected.length !== 3) return false

      rule.render_state.triplets.push([...selected[0], ...selected[1], ...selected[2], true])
      return true
    }

    case '[QT]':
    case '[RG]':
    case "[RG']":
    case '[PD]':
    case '[SQ]':
    case "[SQ']": {
      if (selected.length < 1) return false

      selected.sort((pos1, pos2) => POS2number(pos1) - POS2number(pos2))

      const [r0, c0] = selected[0]
      const [rm1, cm1] = selected.at(-1)!
      let type: 'ROW' | 'COL' | 'ROW_LEFT' | 'COL_TOP' | null = null
      let index: IDX0 | null = null

      const isSameCol = selected.every(([_r, c]) => c === c0)
      if (isSameCol) {
        if (r0 === 0) {
          // Top에서 아래로 수직 진입 (0, 1, 2...)
          for (let i = 0; i < selected.length; i++) {
            if (selected[i][0] !== i) return false
          }
          type = 'COL_TOP'
          index = c0
        } else if (rm1 === 8) {
          // Bottom에서 위로 수직 진입 (8, 7, 6...)
          for (let i = 0; i < selected.length; i++) {
            if (selected[i][0] !== 9 - selected.length + i) return false
          }
          type = 'COL'
          index = c0
        }
      }

      const isSameRow = selected.every(([r, _c]) => r === r0)
      if (isSameRow && !type) {
        if (c0 === 0) {
          // Left에서 오른쪽으로 수직 진입 (0, 1, 2...)
          for (let i = 0; i < selected.length; i++) {
            if (selected[i][1] !== i) return false
          }
          type = 'ROW_LEFT'
          index = r0
        } else if (cm1 === 8) {
          // Right에서 왼쪽으로 수직 진입 (8, 7, 6...)
          for (let i = 0; i < selected.length; i++) {
            if (selected[i][1] !== 9 - selected.length + i) return false
          }
          type = 'ROW'
          index = r0
        }
      }

      if (type === null || index === null) return false

      switch (rule.id) {
        case '[QT]':
          rule.render_state.side_hints.push([type.slice(0, 3) as 'ROW' | 'COL', index, [1, 1]])
          break
        case '[RG]':
          rule.render_state.side_hints.push([type.slice(0, 3) as 'ROW' | 'COL', index, [1]])
          break
        case "[RG']":
          rule.render_state.side_hints.push([type.slice(0, 3) as 'ROW' | 'COL', index, 'A'])
          break
        case '[PD]':
          rule.render_state.side_hints.push([type, index, 1])
          break
        case '[SQ]':
          rule.render_state.side_hints.push([type.slice(0, 3) as 'ROW' | 'COL', index, [1]])
          break
        case "[SQ']":
          rule.render_state.side_hints.push([type.slice(0, 3) as 'ROW' | 'COL', index, ['L']])
          break
      }
      return true
    }

    case '[ST]': {
      return false // 지원하지 않음 TODO
    }
  }
}

// -----------

const console_element = document.querySelector<HTMLDivElement>('#console')!

function createHintElement(rule: Rule): HTMLElement[] {
  function SelectHelper<T extends object, K extends keyof T>(obj: T, key: K, values: T[K][], title: string) {
    return createElement('li', {
      content: createElement('div', {
        className: 'list',
        content: [
          rule.id,
          title,
          ...values.map((x) =>
            createElement('button', {
              className: x === obj[key] ? 'active' : '',
              content: String(x),
              onclick: () => {
                obj[key] = x
                renderRules(board)
                saveLevel(level)
                render()
              },
            }),
          ),
          createElement('button', {
            className: ['right', 'red'],
            content: '✕',
            onclick: () => {
              if ('render_state' in rule) Object.values(rule.render_state).forEach((arr) => arr.splice(arr.indexOf(obj), 1))
              else board.rules.splice(board.rules.indexOf(rule), 1)
              renderRules(board)
              saveLevel(level)
              render()
            },
          }),
        ],
      }),
    })
  }

  function SelectNumberHelper<T extends object, K extends keyof T>(obj: T, key: K, title: string) {
    return createElement('li', {
      content: createElement('div', {
        className: 'list',
        content: [
          rule.id,
          title,
          createElement('input', {
            attr: [
              ['type', 'number'],
              ['step', '1'],
              ['value', String(obj[key])],
            ],
            onchange: (e) => {
              const input = e.target as HTMLInputElement
              const n = Number.parseInt(input.value, 10)
              if (Number.isNaN(n)) return

              obj[key] = n as T[K]
              renderRules(board)
              saveLevel(level)
              render()
            },
          }),
          createElement('button', {
            className: ['right', 'red'],
            content: '✕',
            onclick: () => {
              if ('render_state' in rule) Object.values(rule.render_state).forEach((arr) => arr.splice(arr.indexOf(obj), 1))
              else board.rules.splice(board.rules.indexOf(rule), 1)

              renderRules(board)
              saveLevel(level)
              render()
            },
          }),
        ],
      }),
    })
  }

  function SelectArrayHelper<T extends object, K extends keyof T>(obj: T, key: K, values: T[K] extends (string | number)[] ? readonly (string | number)[] : never, title: string) {
    return createElement('li', {
      content: createElement('div', {
        className: 'list',
        content: [
          rule.id,
          title,
          createElement('input', {
            attr: [
              ['type', 'text'],
              ['value', (obj[key] as (string | number)[]).join('')],
            ],
            onchange: (e) => {
              const input = e.target as HTMLInputElement

              const result: (string | number)[] = []

              for (const ch of input.value) {
                for (const v of values) {
                  if (String(v).toLowerCase() === ch.toLowerCase()) {
                    result.push(v)
                    break
                  }
                }
              }

              obj[key] = result as T[K]
              renderRules(board)
              saveLevel(level)
              render()
            },
          }),
          createElement('button', {
            className: ['right', 'red'],
            content: '✕',
            onclick: () => {
              if ('render_state' in rule) Object.values(rule.render_state).forEach((arr) => arr.splice(arr.indexOf(obj), 1))
              else board.rules.splice(board.rules.indexOf(rule), 1)

              renderRules(board)
              saveLevel(level)
              render()
            },
          }),
        ],
      }),
    })
  }

  function ListHelper(title: string[], obj?: object) {
    return createElement('li', {
      content: createElement('div', {
        className: 'list',
        content: [
          rule.id,
          ...title,
          createElement('button', {
            className: ['right', 'red'],
            content: '✕',
            onclick: () => {
              if ('render_state' in rule && obj) Object.values(rule.render_state).forEach((arr) => arr.splice(arr.indexOf(obj), 1))
              else board.rules.splice(board.rules.indexOf(rule), 1)

              renderRules(board)
              saveLevel(level)
              render()
            },
          }),
        ],
      }),
    })
  }

  function stringifyPos([r, c]: POS) {
    return `R${r + 1}C${c + 1}`
  }

  function PosHelper(pos: POS) {
    return ListHelper([stringifyPos(pos)], pos)
  }

  function GroupHelper(group: Group) {
    return ListHelper([group.map(stringifyPos).join(' ')], group)
  }

  switch (rule.id) {
    case '[Sudoku]':
    case '[R]':
    case "[R']":
    case '[C]':
    case '[B]':
      return [ListHelper([])]
    case '[SG]':
      return rule.render_state.regions.map((group) => GroupHelper(group))
    case "[SG']":
      return rule.render_state.regions.map((group) => GroupHelper(group))

    case '[DT]':
      return [ListHelper([])]
    case '[LK]':
      return rule.render_state.edges.map((group) => GroupHelper(group))
    case "[LK']":
      return rule.render_state.edges.map((group) => GroupHelper(group))
    case '[PO]':
      return rule.render_state.edges.map((group) => GroupHelper(group))
    case '[LO]':
      return rule.render_state.cells.map((pos) => PosHelper(pos))
    case "[LO']":
      return rule.render_state.cells.map((pos) => PosHelper(pos))
    case '[TP]':
      return [ListHelper([])]
    case '[QD]':
      return [ListHelper([])]
    case "[QD']":
      return [ListHelper([])]

    case '[TM]': {
      return rule.render_state.regions.map((obj) => SelectHelper(obj, 'color', ['red', 'green', 'blue'] as const, obj.cells.map(stringifyPos).join(' ')))
    }
    case '[AQ]':
      return rule.render_state.regions.map((group) => GroupHelper(group))
    case '[PA]':
      return rule.render_state.dominoes.map((group) => GroupHelper(group))

    case '[MR]':
      return rule.render_state.metros.map((group) => GroupHelper(group))
    case '[SR]':
      return rule.render_state.streams.map((group) => GroupHelper(group))
    case '[IV]':
      return rule.render_state.lines.map((group) => GroupHelper(group))

    case '[TR]':
    case "[TR']": {
      const start = rule.render_state.start
      const end = rule.render_state.end
      return [
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [rule.id, stringifyPos(start), '→', stringifyPos(end)],
          }),
        }),
      ]
    }
    case '[BD]':
      return [ListHelper(rule.render_state.start_rows.map((r) => String(r + 1)))]

    case '[VT]': {
      return rule.render_state.arrows.map((obj) => SelectHelper(obj, 2, ['L', 'R', 'U', 'D'] as const, stringifyPos(obj.slice(0, 2) as POS)))
    }
    case '[RT]': {
      return rule.render_state.cells.map((obj) => SelectHelper(obj, 2, distances, stringifyPos(obj.slice(0, 2) as POS)))
    }
    case "[RT']": {
      return rule.render_state.cells.map((obj) => SelectHelper(obj, 2, distances, stringifyPos(obj.slice(0, 2) as POS)))
    }
    case '[RF]':
      return rule.render_state.lines.map((obj) => ListHelper([obj[0][0], String(obj[1] + 1)], obj))

    case '[MT]':
      return rule.render_state.diamond_cells.map((pos) => PosHelper(pos))
    case '[BP]':
      return [ListHelper([])]
    case '[EF]':
      return rule.render_state.marked_cells.map((pos) => PosHelper(pos))

    case '[ES]':
      return [ListHelper([])]
    case '[EP]':
      return [ListHelper([])]

    case '[PR]': {
      return rule.render_state.edges.map((obj) => SelectHelper(obj, 4, [true, false] as const, stringifyPos(obj.slice(0, 2) as POS) + '-' + stringifyPos(obj.slice(2, 4) as POS)))
    }
    case "[PR']": {
      return rule.render_state.triplets.map((obj) =>
        SelectHelper(
          obj,
          6,
          [true, false] as const,
          stringifyPos(obj.slice(0, 2) as POS) + '-' + stringifyPos(obj.slice(2, 4) as POS) + '-' + stringifyPos(obj.slice(4, 6) as POS),
        ),
      )
    }

    case '[QT]': {
      return rule.render_state.side_hints.map((obj) => SelectHelper(obj, 2, V.map((x) => V.map((y) => [x, y] as [V, V])).flat(), obj[0] + String(obj[1] + 1)))
    }
    case '[RG]': {
      return rule.render_state.side_hints.map((obj) => SelectHelper(obj, 2, [[1], [2], [3], [4], [5], [6], [7], [8]] as const, obj[0] + String(obj[1] + 1)))
    }
    case "[RG']": {
      return rule.render_state.side_hints.map((obj) => SelectHelper(obj, 2, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const, obj[0] + String(obj[1] + 1)))
    }
    case '[PD]': {
      return rule.render_state.side_hints.map((obj) => SelectNumberHelper(obj, 2, obj[0] + String(obj[1] + 1)))
    }
    case '[SQ]': {
      return rule.render_state.side_hints.map((obj) => SelectArrayHelper(obj, 2, V, obj[0] + String(obj[1] + 1)))
    }
    case "[SQ']": {
      return rule.render_state.side_hints.map((obj) => SelectArrayHelper(obj, 2, ['L', 'M', 'H'] as const, obj[0] + String(obj[1] + 1)))
    }

    case '[ST]':
      return [ListHelper([])]
  }
}

let last_id: Rule_ID = '[Sudoku]'

function render() {
  let flag = false

  board.rules.filter(isKnown).forEach((rule) => {
    const hintelements = createHintElement(rule)
    if (hintelements.length === 0) {
      board.rules.splice(board.rules.indexOf(rule), 1)
      flag = true
    }
  })

  if (flag) {
    saveLevel(level)
  }

  console_element.replaceChildren(
    createElement('ul', {
      content: [
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              createElement('select', {
                id: 'console-rule-id-search-select',
                content: Rule_ID.map((ruleId) =>
                  createElement('option', {
                    attr: [['value', ruleId], ...(ruleId === last_id ? [['selected', 'selected'] as [string, string]] : [])],
                    content: RuleText[ruleId],
                  }),
                ),
              }),

              createElement('button', {
                content: '추가',
                onclick: () => {
                  const search_select = document.querySelector<HTMLSelectElement>('#console-rule-id-search-select')!
                  const id = RuleIdSchema.parse(search_select.value)

                  last_id = id

                  if (!board.rules.some((rule) => rule.id === id)) board.rules.push(RuleSchema.parse(DefaultRuleMap[id]))
                  const rule = board.rules.filter(isKnown).find((rule) => rule.id === id)!

                  const respond = addHint(rule, Array.from(board.selected).map(cell2POS))
                  if (respond) board.clear_selected()

                  renderRules(board)
                  saveLevel(level)
                  render()
                },
              }),
            ],
          }),
        }),

        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              ...V.map((v) =>
                createElement('button', {
                  content: String(v),
                  onclick: () => {
                    board.selected.forEach((cell) => {
                      level.board[cell.r - 1][cell.c - 1] = v
                      cell.digit = v
                      cell.is_static = true
                      cell.num_element.classList.toggle('static', cell.is_static)
                    })

                    board.render()
                    saveLevel(level)
                  },
                }),
              ),
              createElement('button', {
                content: '✕',
                onclick: () => {
                  board.selected.forEach((cell) => {
                    level.board[cell.r - 1][cell.c - 1] = 0
                    cell.digit = 0
                    cell.is_static = false
                    cell.num_element.classList.toggle('static', cell.is_static)
                  })

                  board.render()
                  saveLevel(level)
                },
              }),
            ],
          }),
        }),
      ],
    }),

    createElement('hr'),

    createElement('ul', {
      content: board.rules.filter(isKnown).map(createHintElement).flat(),
    }),

    createElement('hr'),

    createElement('ul', {
      content: [
        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              createElement('button', {
                id: 'console-solve',
                content: '해 탐색',
                onclick: async () => {
                  const modal = new Modal('solve-progress-modal', '해 탐색')

                  modal.body.append(
                    createElement('progress', {
                      id: 'solve-progress-modal-progress',
                      attr: [
                        ['max', '1'],
                        ['value', '0'],
                      ],
                    }),
                    createElement('code', {
                      id: 'solve-progress-modal-code',
                      content: 'initing...',
                    }),
                  )

                  modal.open()

                  const worker = new Worker(new URL('./util/solver.worker.ts', import.meta.url), {
                    type: 'module',
                  })

                  modal.onclose = () => {
                    worker.terminate()
                  }

                  worker.onmessage = (ev: MessageEvent<OutputMessage>) => {
                    switch (ev.data.type) {
                      case 'progress': {
                        const progress = document.querySelector<HTMLProgressElement>('#solve-progress-modal-progress')
                        const code = document.querySelector<HTMLElement>('#solve-progress-modal-code')

                        if (progress) progress.value = Number('0.' + ev.data.progress)
                        if (code) code.textContent = (ev.data.progress.slice(0, 2) + '.' + ev.data.progress.slice(2) + '%').replace(/(.{10})/g, '$1\n')

                        break
                      }

                      case 'done': {
                        switch (ev.data.status) {
                          case 'none': {
                            showToast('해가 없습니다.', 'error')
                            break
                          }
                          case 'unique': {
                            showToast('유일해가 존재합니다.', 'success')
                            break
                          }
                          case 'multiple': {
                            showToast('해가 2개 이상 존재합니다.', 'error')
                            break
                          }
                        }

                        break
                      }
                    }
                  }

                  worker.postMessage({
                    type: 'solve',
                    flat_cells: board.flat_cells.map((cell) => ({ digit: cell.digit, is_static: cell.is_static })),
                    rules: board.rules,
                  } satisfies InputMessage)
                },
              }),
            ],
          }),
        }),

        createElement('li', {
          content: createElement('div', {
            className: 'list',
            content: [
              createElement('label', {
                content: [
                  'level id:',
                  createElement('input', {
                    attr: [['value', level.id]],
                    onchange: (e) => {
                      const input = e.target as HTMLInputElement
                      level.id = input.value

                      saveLevel(level)
                    },
                  }),
                ],
              }),

              createElement('button', {
                id: 'console-export',
                className: 'blue',
                content: 'export',
                onclick: async (e) => {
                  const res = btoa(JSON.stringify(level))

                  try {
                    if (!navigator?.clipboard?.writeText) {
                      throw new Error('Clipboard API not available')
                    }

                    await navigator.clipboard.writeText(res)
                    showToast('base64 코드가 복사되었습니다.', 'success')
                  } catch (err) {
                    console.error(err)
                    showToast(
                      ['복사에 실패했습니다.', createElement('button', { className: 'retry-button', content: '재시도', onclick: () => (e.target as HTMLButtonElement).click() })],
                      'error',
                    )
                  }
                },
              }),

              createElement('button', {
                id: 'console-reset',
                className: 'red',
                content: 'reset',
                onclick: () => {
                  if (confirm('초기화하시겠습니까?')) {
                    deleteLevel()

                    location.reload()
                  }
                },
              }),
            ],
          }),
        }),
      ],
    }),
  )
}

render()

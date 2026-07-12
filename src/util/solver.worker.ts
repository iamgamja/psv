import { has_error } from '../check/has_error'
import { type LiteBoard } from '../types/Board'
import { IDX0, IDX0Schema, type POS, POSSchema, V } from '../types/base'

/**
 * 휴리스틱을 이용해 가장 정보량이 많은 셀부터 채우도록 하자
 * * b1: 각 rule에서 (아마도) 등장한 횟수
 * * b2: 값 x와 택시 거리로 l만큼 떨어져 있을 때 + x * (0.8) ** l
 * * b1 + b2의 내림차순으로 정렬
 */
function sortPOSByRules(rules: LiteBoard['rules']): POS[] {
  // setup b1
  const b1: number[][] = Array.from({ length: 9 }, () => new Array(9).fill(0))

  let last_idx: IDX0 | null = null
  function visit(v: unknown): void {
    if (typeof v === 'number') {
      const idx = IDX0Schema.safeParse(v)
      if (idx.success) {
        if (last_idx === null) {
          last_idx = idx.data
        } else {
          const pos = POSSchema.parse([last_idx, idx.data])
          b1[pos[0]][pos[1]] += 1
          last_idx = null
        }
      }
      return
    }

    if (Array.isArray(v)) {
      for (const item of v) {
        visit(item)
      }
      return
    }

    if (v !== null && typeof v === 'object') {
      for (const child of Object.values(v)) {
        visit(child)
      }
    }
  }

  for (const rule of rules) visit(rule)

  // setup b2
  const DECAY = 0.8
  const b2: number[][] = Array.from({ length: 9 }, () => new Array(9).fill(0))

  for (const r of IDX0) {
    for (const c of IDX0) {
      const x = b1[r][c]
      if (x === 0) continue

      for (const i of IDX0) {
        for (const j of IDX0) {
          const l = Math.abs(i - r) + Math.abs(j - c)
          b2[i][j] += x * Math.pow(DECAY, l)
        }
      }
    }
  }

  // b1+b2의 내림차순으로 정렬
  const key = (pos: POS) => b1[pos[0]][pos[1]] + b2[pos[0]][pos[1]]
  return IDX0.map((r) => IDX0.map((c) => [r, c] as POS))
    .flat()
    .sort((pos1, pos2) => key(pos2) - key(pos1))
}

type SolveStatus = 'none' | 'unique' | 'multiple'

interface SolveRequest {
  type: 'solve'
  flat_cells: LiteBoard['flat_cells']
  rules: LiteBoard['rules']
}

export type InputMessage = SolveRequest

interface ProgressMessage {
  type: 'progress'
  progress: string
}

interface DoneMessage {
  type: 'done'
  status: SolveStatus
}

export type OutputMessage = ProgressMessage | DoneMessage

const PROGRESS_INTERVAL_MS = 30 // progress 전송 간격

function solveBoard(board: LiteBoard) {
  let found = 0
  let lastProgressAt = 0

  const order_pos = sortPOSByRules(board.rules)

  const postProgress = (force = false) => {
    const now = performance.now()
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return
    lastProgressAt = now

    const msg: ProgressMessage = {
      type: 'progress',
      progress: order_pos
        .map((pos) => board.getCell(pos))
        .filter((cell) => !cell.is_static)
        .map((cell) => cell.digit)
        .join(''),
    }
    self.postMessage(msg)
  }

  const dfs = (index: number): boolean => {
    postProgress()

    while (index < 81 && board.getCell(order_pos[index]).digit !== 0) {
      index++
    }

    if (index === 81) {
      found++

      return found >= 2 // 2개 찾으면 즉시 종료
    }

    for (const d of V) {
      board.getCell(order_pos[index]).digit = d

      if (!has_error(board)) {
        if (dfs(index + 1)) {
          return true
        }
      }

      board.getCell(order_pos[index]).digit = 0
    }

    return false
  }

  postProgress(true)
  dfs(0)

  const done: DoneMessage = {
    type: 'done',
    status: found === 0 ? 'none' : found === 1 ? 'unique' : 'multiple',
  }
  self.postMessage(done)
}

function createLiteBoard(flat_cells: LiteBoard['flat_cells'], rules: LiteBoard['rules']): LiteBoard {
  return {
    flat_cells,
    getCell(pos) {
      return this.flat_cells[pos[0] * 9 + pos[1]]
    },
    get empty_cells() {
      return this.flat_cells.filter((cell) => cell.digit === 0)
    },
    rules,
  }
}

self.onmessage = (ev: MessageEvent<InputMessage>) => {
  switch (ev.data.type) {
    case 'solve': {
      solveBoard(createLiteBoard(ev.data.flat_cells, ev.data.rules))

      break
    }
  }
}

import { z } from 'zod'
import { IDX, V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'

const GROUP_BITS = 9
const GROUP_MASK = (1 << GROUP_BITS) - 1
const MAX_H_LENGTH = ((1 << (3 * GROUP_BITS)) - 1).toString(16).length
const STORAGE_KEY_PREFIX = 'psv:history:'

const SnapShotCellSchema = z
  .string()
  .min(3)
  .regex(new RegExp(`^[0-9][0-3][0-9a-fA-F]{1,${MAX_H_LENGTH}}$`))
  .transform((s) => {
    const d = parseInt(s[0]) as V | 0
    const x = parseInt(s[1])
    const h = parseInt(s.slice(2), 16)

    return {
      digit: d,
      error: (x & 2) !== 0,
      warning: (x & 1) !== 0,
      color: maskToSet((h >> (2 * GROUP_BITS)) & GROUP_MASK),
      valid_memo: maskToSet((h >> GROUP_BITS) & GROUP_MASK),
      candidate_memo: maskToSet(h & GROUP_MASK),
    }
  })

const SnapShotSchema = z
  .string()
  .transform((s) => s.split(','))
  .pipe(z.array(SnapShotCellSchema).length(81))

type SnapShot = z.infer<typeof SnapShotSchema>

const BranchFrameSchema = z
  .string()
  .regex(/^[0-9](?:00|[1-9][1-9])[0-9a-fA-F]{1,4}$/)
  .transform((s) => {
    const d = parseInt(s[0]) as V | 0
    const r = parseInt(s[1]) as IDX | 0
    const c = parseInt(s[2]) as IDX | 0
    const i = parseInt(s.slice(3), 16)

    return {
      digit: d,
      r,
      c,
      baseIndex: i,
    }
  })

const BranchStackSchema = z
  .string()
  .transform((s) => (s === '' ? [] : s.split(',')))
  .pipe(z.array(BranchFrameSchema))
type BranchStack = z.infer<typeof BranchStackSchema>

const storedHistorySchema = z.object({
  board: z.array(SnapShotSchema).min(1),
  branch: BranchStackSchema,
})
type History = z.infer<typeof storedHistorySchema>

/**
 * 저장 형식: JSON.stringify({ board, branch })
 *
 * board: cell 81개를 ","로 연결한 문자열들의 배열
 *
 *   각 cell 문자열: `${d}${x}${h}`
 *
 *     d: digit: V | 0
 *
 *     x: error/warning bitset (2비트)
 *       - error = 2
 *       - warning = 1
 *       - 따라서 0~3
 *
 *     h: 27비트 bitset을 hex로 표기한 값
 *       - [color 9비트][valid_memo 9비트][candidate_memo 9비트]
 *       - 각 9비트 그룹은 digit 1~9를 bit 0~8에 대응
 *
 * branch: branch frame들을 ","로 연결한 문자열
 *
 *   각 branch frame 문자열: `${d}${r}${c}${i}`
 *
 *     d: digit
 *       - V
 *       - null이면 0
 *
 *     r, c: cell
 *       - 각각 IDX
 *       - null이면 r=c=0
 *
 *     i: baseIndex
 *       - 16진법
 */

function setTo9BitMask(set: Set<V>): number {
  let mask = 0
  for (const v of set) {
    mask |= 1 << (v - 1)
  }
  return mask
}

function maskToSet(mask: number): Set<V> {
  const out = new Set<V>()
  for (const v of V) {
    if (mask & (1 << (v - 1))) {
      out.add(v)
    }
  }
  return out
}

function getSnapshot(board: Board): SnapShot {
  return board.flat_cells.map((cell) => ({
    digit: cell.digit,
    error: board.errors.has(cell),
    warning: board.warnings.has(cell),
    color: new Set(cell.color),
    valid_memo: new Set(cell.valid_memo),
    candidate_memo: new Set(cell.candidate_memo),
  }))
}

function loadHistory(id: string): History | null {
  try {
    const raw = localStorage?.getItem(`${STORAGE_KEY_PREFIX}${id}`)
    if (!raw) return null

    return storedHistorySchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

function encode(history: History) {
  return JSON.stringify({
    board: history.board.map((snapshot) =>
      snapshot
        .map(({ digit, error, warning, color, valid_memo, candidate_memo }) => {
          const d = digit
          const x = (error ? 2 : 0) | (warning ? 1 : 0)
          const h = ((setTo9BitMask(color) << (2 * GROUP_BITS)) | (setTo9BitMask(valid_memo) << GROUP_BITS) | setTo9BitMask(candidate_memo)).toString(16)
          return `${d}${x}${h}`
        })
        .join(','),
    ),
    branch: history.branch
      .map(({ digit, r, c, baseIndex }) => {
        const d = digit
        const i = baseIndex.toString(16)
        return `${d}${r}${c}${i}`
      })
      .join(','),
  })
}

function saveHistory(id: string, history: History): void {
  localStorage?.setItem(`${STORAGE_KEY_PREFIX}${id}`, encode(history))
}

function removeHistory(id: string) {
  localStorage?.removeItem(`${STORAGE_KEY_PREFIX}${id}`)
}

function applySnapshot(board: Board, snapshot: SnapShot) {
  board.errors.clear()
  board.warnings.clear()

  for (let i = 0; i < 81; i++) {
    board.flat_cells[i].digit = snapshot[i].digit
    board.flat_cells[i].color = new Set(snapshot[i].color)
    board.flat_cells[i].valid_memo = new Set(snapshot[i].valid_memo)
    board.flat_cells[i].candidate_memo = new Set(snapshot[i].candidate_memo)

    if (snapshot[i].error) board.errors.add(board.flat_cells[i])
    if (snapshot[i].warning) board.warnings.add(board.flat_cells[i])
  }

  board.render()
}

export class HistoryManager {
  public readonly board: Board
  private snapshots: SnapShot[] = []
  private currentSnapshotIndex = 0

  private branchStack: BranchStack = []

  constructor(board: Board) {
    this.board = board

    const history = loadHistory(this.board.level.id)
    if (history) {
      this.snapshots = history.board
      this.currentSnapshotIndex = this.snapshots.length - 1
      this.branchStack = history.branch

      applySnapshot(board, this.snapshot)
    } else {
      // no save
      this.board._check_errors()
      this.board._induct()
      this.board._check_warnings()

      this.snapshots = [getSnapshot(board)]
      this.currentSnapshotIndex = 0
      this.branchStack = []

      this.persist()
    }
  }

  private get branchBaseIndex(): number | null {
    return this.branchStack.length > 0 ? this.branchStack[this.branchStack.length - 1].baseIndex : null
  }

  private persist(): void {
    saveHistory(this.board.level.id, {
      board: this.snapshots,
      branch: this.branchStack,
    })
  }

  get canUndo(): boolean {
    return this.currentSnapshotIndex > (this.branchBaseIndex ?? -1) + 1
  }

  get canRedo(): boolean {
    return this.currentSnapshotIndex < this.snapshots.length - 1
  }

  get canRejectBranch(): boolean {
    return this.branchStack.length > 0 && this.branchStack[this.branchStack.length - 1].digit !== 0
  }

  get canCancelBranch(): boolean {
    return this.branchStack.length > 0
  }

  get snapshot(): SnapShot {
    return this.snapshots[this.currentSnapshotIndex]
  }

  /**
   * board를 바꾼 뒤 호출한다.
   * 여러 셀을 한 번에 바꿨다면, 전부 끝난 다음 한 번만 호출하면 된다.
   */
  commit(force?: boolean): void {
    const next = getSnapshot(this.board)
    if (!force && next === this.snapshot) return

    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    this.snapshots.push(next)
    this.currentSnapshotIndex = this.snapshots.length - 1
    this.persist()
  }

  undo(): boolean {
    if (!this.canUndo) return false

    this.currentSnapshotIndex -= 1
    applySnapshot(this.board, this.snapshot)
    this.persist()
    return true
  }

  redo(): boolean {
    if (!this.canRedo) return false

    this.currentSnapshotIndex += 1
    applySnapshot(this.board, this.snapshot)
    this.persist()
    return true
  }

  /**
   * 아무것도 바꾸지 않고 분기를 생성한다.
   */
  createBranch(): void {
    this.commit(true)

    this.branchStack.push({
      digit: 0,
      r: 0,
      c: 0,
      baseIndex: this.currentSnapshotIndex - 1,
    })

    this.persist()
  }

  /**
   * cell.digit = digit 을 하고 분기를 생성한다.
   */
  createBranchWithDigit(cell: Cell, digit: V): void {
    this.board.set_digit(digit, [cell])

    this.branchStack.push({
      digit,
      r: cell.r,
      c: cell.c,
      baseIndex: this.currentSnapshotIndex - 1,
    })

    this.persist()
  }

  rejectBranch(): boolean {
    const branch = this.branchStack.pop()
    if (!branch) return false

    this.currentSnapshotIndex = branch.baseIndex
    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    applySnapshot(this.board, this.snapshot)

    if (branch.r && branch.c && branch.digit) {
      const cell = this.board.cells[branch.r - 1][branch.c - 1]
      this.board.remove_memo(branch.digit, [cell])
      return true
    }

    this.persist()
    return true
  }

  cancelBranch(): boolean {
    const branch = this.branchStack.pop()
    if (!branch) return false

    this.currentSnapshotIndex = branch.baseIndex
    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    applySnapshot(this.board, this.snapshot)
    this.persist()

    return true
  }

  reset(): void {
    removeHistory(this.board.level.id)
    this.branchStack = []
  }
}

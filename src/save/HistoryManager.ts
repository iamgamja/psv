import { IDX, V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'

const CELL_COUNT = 81
const GROUP_BITS = 9
const GROUP_MASK = (1 << GROUP_BITS) - 1
const STORAGE_KEY_PREFIX = 'psv:history:'

type StoredHistory = {
  board: string[]
  branch: string
}

/**
 * 저장 형식: JSON.stringify({ board, branch })
 *
 * board: cell 81개를 ","로 연결한 문자열들의 배열
 *
 *   각 cell 문자열: `${d}${x}${h}`
 *
 *     d: digit
 *       - 1~9
 *       - undefined이면 0
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
 *   각 branch frame 문자열: `${digit}${cell}${baseIndex}`
 *
 *     digit:
 *       - 1~9
 *       - null이면 0
 *
 *     cell:
 *       - r, c를 2글자 문자열로 저장
 *       - null이면 '00'
 *
 *     baseIndex:
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

function encodeH(cell: Cell): number {
  const color = setTo9BitMask(cell.color)
  const valid = setTo9BitMask(cell.valid_memo)
  const candidate = setTo9BitMask(cell.candidate_memo)

  return (color << 18) | (valid << 9) | candidate
}

function decodeH(hex: string): {
  color: Set<V>
  valid_memo: Set<V>
  candidate_memo: Set<V>
} {
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('invalid h field')
  }

  const value = parseInt(hex, 16)
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x7ffffff) {
    throw new Error('invalid h field')
  }

  const color = (value >> 18) & GROUP_MASK
  const valid = (value >> 9) & GROUP_MASK
  const candidate = value & GROUP_MASK

  return {
    color: maskToSet(color),
    valid_memo: maskToSet(valid),
    candidate_memo: maskToSet(candidate),
  }
}

function encodeCell(cell: Cell, board: Board): string {
  const d = cell.digit ?? 0
  const x = (board.errors.has(cell) ? 2 : 0) | (board.warnings.has(cell) ? 1 : 0)
  const h = encodeH(cell).toString(16)

  return `${d}${x}${h}`
}

function parseCellString(
  raw: unknown,
  index: number,
): {
  digit: V | undefined
  error: boolean
  warning: boolean
  color: Set<V>
  valid_memo: Set<V>
  candidate_memo: Set<V>
} {
  if (typeof raw !== 'string') {
    throw new Error(`cells[${index}] must be a string`)
  }

  const m = raw.match(/^([0-9])([0-3])([0-9a-fA-F]+)$/)
  if (!m) {
    throw new Error(`cells[${index}] is invalid`)
  }

  const d = Number(m[1])
  const x = Number(m[2])
  const h = m[3]

  const digit = d === 0 ? undefined : (d as V)
  const error = (x & 2) !== 0
  const warning = (x & 1) !== 0
  const decoded = decodeH(h)

  return {
    digit,
    error,
    warning,
    color: decoded.color,
    valid_memo: decoded.valid_memo,
    candidate_memo: decoded.candidate_memo,
  }
}

function applyCellPatch(target: Cell, src: ReturnType<typeof parseCellString>): void {
  target.digit = src.digit
  target.candidate_memo = src.candidate_memo
  target.valid_memo = src.valid_memo
  target.color = src.color
}

function readHistoryRaw(board: Board): StoredHistory | null {
  const storage = globalThis.localStorage
  if (!storage) return null

  const raw = storage.getItem(`${STORAGE_KEY_PREFIX}${board.level.id}`)
  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') return null

    const obj = parsed as Partial<StoredHistory>
    if (!Array.isArray(obj.board) || obj.board.length === 0) return null
    if (!obj.board.every((item) => typeof item === 'string')) return null
    if (typeof obj.branch !== 'string') return null
    return { board: obj.board, branch: obj.branch }
  } catch {
    return null
  }
}

function saveHistory(id: string, history: StoredHistory): void {
  const storage = globalThis.localStorage
  if (!storage) return

  storage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(history))
}

function removeHistory(id: string) {
  const storage = globalThis.localStorage
  if (!storage) return

  storage.removeItem(`${STORAGE_KEY_PREFIX}${id}`)
}

export function encodeSnapshot(board: Board): string {
  return board.flat_cells.map((cell) => encodeCell(cell, board)).join(',')
}

export function decodeSnapshot(snapshot: string, board: Board) {
  const cells = snapshot.split(',')
  if (cells.length !== CELL_COUNT) {
    throw new Error(`snapshot must contain exactly ${CELL_COUNT} cells`)
  }

  const nextErrors = new Set<Cell>()
  const nextWarnings = new Set<Cell>()

  cells.forEach((item, i) => {
    const parsed = parseCellString(item, i)
    const target = board.flat_cells[i]

    applyCellPatch(target, parsed)

    if (parsed.error) nextErrors.add(target)
    if (parsed.warning) nextWarnings.add(target)
  })

  board.errors = nextErrors
  board.warnings = nextWarnings
}

type BranchFrame = {
  baseIndex: number
  cell: Cell | null
  digit: V | null
}

function encodeBranchFrame(frame: BranchFrame): string {
  const digit = frame.digit ?? 0
  const cell = frame.cell === null ? '00' : `${frame.cell.r}${frame.cell.c}`
  const baseIndex = frame.baseIndex.toString(16)

  return `${digit}${cell}${baseIndex}`
}

function decodeBranchFrame(raw: string, board: Board, index: number): BranchFrame {
  if (raw.length < 3) {
    throw new Error(`branch[${index}] is invalid`)
  }

  const digitRaw = raw[0]
  const cellRaw = raw.slice(1, 3)
  const baseIndexRaw = raw.slice(3)

  if (!/^[0-9]$/.test(digitRaw)) {
    throw new Error(`branch[${index}].digit is invalid`)
  }
  if (!/^[0-9]{2}$/.test(cellRaw)) {
    throw new Error(`branch[${index}].cell is invalid`)
  }
  if (!/^[0-9a-fA-F]+$/.test(baseIndexRaw)) {
    throw new Error(`branch[${index}].baseIndex is invalid`)
  }

  const digitNum = parseInt(digitRaw)
  const digit = digitNum === 0 ? null : (digitNum as V)

  const r = parseInt(cellRaw[0]) as IDX | 0
  const c = parseInt(cellRaw[1]) as IDX | 0
  let cell = r === 0 && c === 0 ? null : board.cells[r - 1][c - 1]

  const baseIndex = parseInt(baseIndexRaw, 16)
  if (!Number.isSafeInteger(baseIndex) || baseIndex < 0) {
    throw new Error(`branch[${index}].baseIndex is invalid`)
  }

  return {
    digit,
    cell,
    baseIndex,
  }
}

function encodeBranchStack(branchStack: BranchFrame[]): string {
  return branchStack.map((frame) => encodeBranchFrame(frame)).join(',')
}

function decodeBranchStack(raw: string, board: Board): BranchFrame[] {
  if (raw.trim() === '') return []

  const items = raw.split(',')
  return items.map((item, i) => decodeBranchFrame(item, board, i))
}

export class HistoryManager {
  public readonly board: Board
  private snapshots: string[] = []
  private currentSnapshotIndex = 0

  private branchStack: BranchFrame[] = []

  constructor(board: Board) {
    this.board = board

    const loaded = readHistoryRaw(board)
    if (loaded) {
      this.snapshots = loaded.board
      this.currentSnapshotIndex = this.snapshots.length - 1
      decodeSnapshot(this.snapshot, this.board)
      this.branchStack = decodeBranchStack(loaded.branch, this.board)
    } else {
      // no save
      this.board._check_errors()
      this.board._induct()
      this.board._check_warnings()

      this.snapshots = [encodeSnapshot(board)]
      this.currentSnapshotIndex = 0
      this.branchStack = []
      saveHistory(this.board.level.id, {
        board: this.snapshots,
        branch: encodeBranchStack(this.branchStack),
      })
    }
  }

  private get branchBaseIndex(): number | null {
    return this.branchStack.length > 0 ? this.branchStack[this.branchStack.length - 1].baseIndex : null
  }

  private persist(): void {
    saveHistory(this.board.level.id, {
      board: this.snapshots,
      branch: encodeBranchStack(this.branchStack),
    })
  }

  get canUndo(): boolean {
    return this.currentSnapshotIndex > (this.branchBaseIndex ?? -1) + 1
  }

  get canRedo(): boolean {
    return this.currentSnapshotIndex < this.snapshots.length - 1
  }

  get canRejectBranch(): boolean {
    return this.branchStack.length > 0 && this.branchStack[this.branchStack.length - 1].digit !== null
  }

  get canCancelBranch(): boolean {
    return this.branchStack.length > 0
  }

  get snapshot(): string {
    return this.snapshots[this.currentSnapshotIndex]
  }

  /**
   * board를 바꾼 뒤 호출한다.
   * 여러 셀을 한 번에 바꿨다면, 전부 끝난 다음 한 번만 호출하면 된다.
   */
  commit(force?: boolean): void {
    const next = encodeSnapshot(this.board)
    if (!force && next === this.snapshot) return

    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    this.snapshots.push(next)
    this.currentSnapshotIndex = this.snapshots.length - 1
    this.persist()
  }

  undo(): boolean {
    if (!this.canUndo) return false

    this.currentSnapshotIndex -= 1
    decodeSnapshot(this.snapshot, this.board)
    this.persist()
    return true
  }

  redo(): boolean {
    if (!this.canRedo) return false

    this.currentSnapshotIndex += 1
    decodeSnapshot(this.snapshot, this.board)
    this.persist()
    return true
  }

  /**
   * 아무것도 바꾸지 않고 분기를 생성한다.
   */
  createBranch(): void {
    this.commit(true)

    this.branchStack.push({
      baseIndex: this.currentSnapshotIndex - 1,
      cell: null,
      digit: null,
    })

    this.persist()
  }

  /**
   * cell.digit = digit 을 하고 분기를 생성한다.
   */
  createBranchWithDigit(cell: Cell, digit: V): void {
    this.board.set_digit(digit) // commit은 set_digit이 하므로 생략

    this.branchStack.push({
      baseIndex: this.currentSnapshotIndex - 1,
      cell,
      digit,
    })

    this.persist()
  }

  rejectBranch(): boolean {
    const branch = this.branchStack.pop()
    if (!branch) return false

    this.currentSnapshotIndex = branch.baseIndex
    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    decodeSnapshot(this.snapshot, this.board)

    if (branch.cell && branch.digit !== null) {
      branch.cell.candidate_memo.delete(branch.digit)
      branch.cell.valid_memo.delete(branch.digit)
      this.commit()
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
    decodeSnapshot(this.snapshot, this.board)
    this.persist()

    return true
  }

  reset(): void {
    removeHistory(this.board.level.id)
    this.branchStack = []
  }
}

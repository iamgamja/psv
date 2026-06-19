import { V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'

const CELL_COUNT = 81
const GROUP_BITS = 9
const GROUP_MASK = (1 << GROUP_BITS) - 1
const STORAGE_KEY_PREFIX = 'psv:history:'

/**
 * 저장 형식
 *
 * 최종 문자열:
 *   cell 81개를 ","로 연결한 문자열
 *
 * 각 cell 문자열:
 *   ${d}${x}${h}
 *
 *   d: digit
 *      - 1~9
 *      - undefined이면 0
 *
 *   x: error/warning bitset (2비트)
 *      - error = 2
 *      - warning = 1
 *      - 따라서 0~3
 *
 *   h: 27비트 bitset을 hex로 표기한 값
 *      - [color 9비트][valid_memo 9비트][candidate_memo 9비트]
 *      - 각 9비트 그룹은 digit 1~9를 bit 0~8에 대응
 *      - 0x 접두사 없음, leading zero 없음
 *
 * 예:
 *   "103f2a,000,..."
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
  // 외부 속성은 건드리지 않음. 저장된 필드만 덮어씀.
  target.digit = src.digit
  target.candidate_memo = src.candidate_memo
  target.valid_memo = src.valid_memo
  target.color = src.color
}

function loadSnapshots(board: Board): string[] | null {
  const storage = globalThis.localStorage
  if (!storage) return null

  const raw = storage.getItem(`${STORAGE_KEY_PREFIX}${board.level.id}`)
  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    if (!parsed.every((item) => typeof item === 'string')) return null
    return parsed
  } catch {
    return null
  }
}

function saveSnapshots(id: string, snapshots: string[]): void {
  const storage = globalThis.localStorage
  if (!storage) return

  storage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(snapshots))
}

function removeSnaphsots(id: string) {
  const storage = globalThis.localStorage
  if (!storage) return

  storage.removeItem(`${STORAGE_KEY_PREFIX}${id}`)
}

export function encode(board: Board): string {
  return board.flat_cells.map((cell) => encodeCell(cell, board)).join(',')
}

/**
 * snapshot 문자열을 기존 board에 반영한다.
 * 새 셀을 만들지 않고, 기존 cell 객체의 저장된 필드만 덮어쓴다.
 */
export function decode(snapshot: string, board: Board): Board {
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

  return board
}

type BranchFrame = {
  baseIndex: number
  cell: Cell | null
  digit: V | null
}

export class HistoryManager {
  public readonly board: Board
  private snapshots: string[] = []
  private currentSnapshotIndex = 0

  private branchStack: BranchFrame[] = []

  constructor(board: Board) {
    this.board = board

    const loadedSnapshots = loadSnapshots(board)
    if (loadedSnapshots) {
      this.snapshots = loadedSnapshots
      this.currentSnapshotIndex = this.snapshots.length - 1
      decode(this.snapshot, this.board)
    } else {
      // no save
      this.board._check_errors()
      this.board._induct()
      this.board._check_warnings()

      this.snapshots = [encode(board)]
      this.currentSnapshotIndex = 0
    }
  }

  private get branchBaseIndex(): number | null {
    return this.branchStack.length > 0 ? this.branchStack[this.branchStack.length - 1].baseIndex : null
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
    const next = encode(this.board)
    if (!force && next === this.snapshot) return

    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    this.snapshots.push(next)
    this.currentSnapshotIndex = this.snapshots.length - 1
    saveSnapshots(this.board.level.id, this.snapshots)
  }

  undo(): boolean {
    if (!this.canUndo) return false

    this.currentSnapshotIndex -= 1
    decode(this.snapshot, this.board)
    saveSnapshots(this.board.level.id, this.snapshots)
    return true
  }

  redo(): boolean {
    if (!this.canRedo) return false

    this.currentSnapshotIndex += 1
    decode(this.snapshot, this.board)
    saveSnapshots(this.board.level.id, this.snapshots)
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
  }

  /**
   * cell.digit = digit 을 하고 분기를 생성한다.
   */
  createBranchWithDigit(cell: Cell, digit: V): void {
    this.board.set_digit(digit)

    this.branchStack.push({
      baseIndex: this.currentSnapshotIndex - 1,
      cell,
      digit,
    })
  }

  rejectBranch(): boolean {
    const branch = this.branchStack.pop()
    if (!branch) return false

    this.currentSnapshotIndex = branch.baseIndex
    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    decode(this.snapshot, this.board)

    if (branch.cell && branch.digit !== null) {
      branch.cell.candidate_memo.delete(branch.digit)
      branch.cell.valid_memo.delete(branch.digit)
      this.commit()
    }

    return true
  }

  cancelBranch(): boolean {
    const branch = this.branchStack.pop()
    if (!branch) return false

    this.currentSnapshotIndex = branch.baseIndex
    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    decode(this.snapshot, this.board)

    return true
  }

  reset(): void {
    removeSnaphsots(this.board.level.id)
    this.branchStack = []
  }
}

/** @todo 분기도 저장하기 */

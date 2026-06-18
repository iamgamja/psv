import type { IDX, V } from '../types/base'
import type { Board } from '../types/Board'
import type { Cell } from '../types/Cell'

export type SnapCell = {
  r: IDX
  c: IDX
  digit: V | null
  candidate_memo: V[]
  valid_memo: V[]
  color: V[]
}

export type Snap = {
  v: 1
  cells: SnapCell[]
  errors: number[]
  warnings: number[]
}

/**
 * 저장 포맷(JSON 문자열)
 *
 * {
 *   "v": 1,
 *   "cells": [
 *     {
 *       "r": 1,
 *       "c": 1,
 *       "digit": 5 | null,
 *       "candidate_memo": [1,2,3],
 *       "valid_memo": [4,5],
 *       "color": [1]
 *     }
 *   ],
 *   "errors": [0, 9, ...],
 *   "warnings": [4, 8, ...]
 * }
 *
 * 규칙
 * - cells는 row-major 순서로 81개
 * - valid_memo는 항상 저장
 * - digit이 없으면 null로 저장
 * - errors/warnings는 flat_cells 기준 0~80 인덱스로 저장
 * - decode는 기존 cell 객체를 유지하고, 저장된 필드만 덮어씀
 */

function sorted(set: Set<V>) {
  return Array.from(set).sort((a, b) => a - b)
}

function sortedIndices(set: Set<Cell>): number[] {
  return Array.from(set)
    .map((cell) => (cell.r - 1) * 9 + (cell.c - 1))
    .sort((a, b) => a - b)
}

function isV(x: unknown): x is V {
  return typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 9
}

function isCellIndex(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 81
}

function readDigits(value: unknown, name: string): V[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`)
  }
  const out: V[] = []
  for (const x of value) {
    if (!isV(x)) {
      throw new Error(`${name} contains invalid digit`)
    }
    out.push(x)
  }
  return out
}

function toSet(value: unknown, name: string): Set<V> {
  return new Set(readDigits(value, name))
}

function snapshotCell(cell: Cell): SnapCell {
  return {
    r: cell.r,
    c: cell.c,
    digit: cell.digit ?? null,
    candidate_memo: sorted(cell.candidate_memo),
    valid_memo: sorted(cell.valid_memo),
    color: sorted(cell.color),
  }
}

function snapshotCells(set: Set<Cell>): number[] {
  return sortedIndices(set)
}

function restoreCells(indices: unknown, board: Board, name: string): Set<Cell> {
  if (!Array.isArray(indices)) {
    throw new Error(`${name} must be an array`)
  }

  const restored = new Set<Cell>()
  for (const index of indices) {
    if (!isCellIndex(index)) {
      throw new Error(`${name} contains invalid cell index`)
    }

    const cell = board.flat_cells[index]
    if (!cell) {
      throw new Error(`${name} contains invalid cell index`)
    }

    restored.add(cell)
  }

  return restored
}

function applyCellPatch(target: Cell, src: SnapCell): void {
  // 외부 속성은 건드리지 않음. 저장된 필드만 덮어씀.
  target.r = src.r
  target.c = src.c
  target.digit = src.digit === null ? undefined : src.digit
  target.candidate_memo = toSet(src.candidate_memo, 'candidate_memo')
  target.valid_memo = toSet(src.valid_memo, 'valid_memo')
  target.color = toSet(src.color, 'color')
}

export function encode(board: Board): string {
  const cells: SnapCell[] = board.flat_cells.map(snapshotCell)
  const snap: Snap = {
    v: 1,
    cells,
    errors: snapshotCells(board.errors),
    warnings: snapshotCells(board.warnings),
  }
  return JSON.stringify(snap)
}

/**
 * snapshot 문자열을 기존 board에 반영한다.
 * 새 셀을 만들지 않고, 기존 cell 객체의 저장된 필드만 덮어쓴다.
 */
export function decode(snapshot: string, board: Board): Board {
  const raw: unknown = JSON.parse(snapshot)
  if (typeof raw !== 'object' || raw === null || !('v' in raw) || (raw as { v?: unknown }).v !== 1 || !('cells' in raw)) {
    throw new Error('invalid snapshot')
  }

  const snap = raw as { cells: unknown; errors?: unknown; warnings?: unknown }
  const cells = snap.cells
  if (!Array.isArray(cells) || cells.length !== 81) {
    throw new Error('snapshot must contain exactly 81 cells')
  }

  cells.forEach((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`cells[${i}] is invalid`)
    }

    const cell = item as Record<string, unknown>
    const r = cell.r
    const c = cell.c

    if (!isV(r) || !isV(c)) {
      throw new Error(`cells[${i}].r/c is invalid`)
    }

    const expectedR = (Math.floor(i / 9) + 1) as IDX
    const expectedC = ((i % 9) + 1) as IDX
    if (r !== expectedR || c !== expectedC) {
      throw new Error(`cells[${i}] must be stored in row-major order`)
    }

    if (cell.digit !== null && cell.digit !== undefined && !isV(cell.digit)) {
      throw new Error(`cells[${i}].digit is invalid`)
    }

    if (!Array.isArray(cell.candidate_memo)) {
      throw new Error(`cells[${i}].candidate_memo must be an array`)
    }
    if (!Array.isArray(cell.valid_memo)) {
      throw new Error(`cells[${i}].valid_memo must be an array`)
    }
    if (!Array.isArray(cell.color)) {
      throw new Error(`cells[${i}].color must be an array`)
    }

    const target = board.cells[expectedR - 1][expectedC - 1]
    applyCellPatch(target, {
      r,
      c,
      digit: cell.digit === undefined ? null : cell.digit,
      candidate_memo: readDigits(cell.candidate_memo, `cells[${i}].candidate_memo`),
      valid_memo: readDigits(cell.valid_memo, `cells[${i}].valid_memo`),
      color: readDigits(cell.color, `cells[${i}].color`),
    })
  })

  board.errors = restoreCells(snap.errors ?? [], board, 'errors')
  board.warnings = restoreCells(snap.warnings ?? [], board, 'warnings')

  return board
}

export class HistoryManager {
  public readonly board: Board
  private undoStack: string[] = []
  private redoStack: string[] = []
  private currentSnapshot: string

  constructor(board: Board) {
    this.board = board
    this.currentSnapshot = encode(board)
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get snapshot(): string {
    return this.currentSnapshot
  }

  /**
   * board를 바꾼 뒤 호출한다.
   * 여러 셀을 한 번에 바꿨다면, 전부 끝난 다음 한 번만 호출하면 된다.
   */
  commit(): void {
    const next = encode(this.board)
    if (next === this.currentSnapshot) return

    this.undoStack.push(this.currentSnapshot)
    this.currentSnapshot = next
    this.redoStack.length = 0
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false

    this.redoStack.push(this.currentSnapshot)
    const prev = this.undoStack.pop()!
    this.currentSnapshot = prev
    decode(prev, this.board)
    return true
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false

    this.undoStack.push(this.currentSnapshot)
    const next = this.redoStack.pop()!
    this.currentSnapshot = next
    decode(next, this.board)
    return true
  }

  reset(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.currentSnapshot = encode(this.board)
  }
}

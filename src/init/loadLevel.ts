import type { V } from '../types/base'
import type { LevelData } from '../types/LevelData'
import type { Rule, UnknownRule } from '../types/Rule'

function isValidV(value: unknown): value is V {
  return typeof value === 'number' && 1 <= value && value <= 9
}

function isValidRule(value: any): value is Rule | UnknownRule {
  if (typeof value !== 'object' || value === null) return false

  const rule = value as Record<string, unknown>

  if (typeof rule.id !== 'string') return false

  return true
}

export function isLevelData(value: unknown): value is LevelData {
  if (typeof value !== 'object' || value === null) return false

  const level = value as Record<string, unknown>

  if (typeof level.id !== 'string') return false
  if (typeof level.difficulty !== 'number') return false
  if (typeof level.published_at !== 'string') return false

  if (!Array.isArray(level.board)) return false
  if (!level.board.every((row) => Array.isArray(row) && row.every((cell) => cell === 0 || isValidV(cell)))) return false

  if (!Array.isArray(level.rules)) return false
  if (!level.rules.every(isValidRule)) return false

  return true
}

export function loadLevel(data: string) {
  const level = (() => {
    try {
      return JSON.parse(atob(data))
    } catch (e) {
      return null
    }
  })()
  if (!isLevelData(level)) return null

  return level
}

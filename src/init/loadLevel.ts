import type { V } from '../types/base'
import type { LevelData } from '../types/LevelData'

function isValidV(value: unknown): value is V {
  return typeof value === 'number' && 1 <= value && value <= 9
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

  // 올바르지 않은 규칙 허용
  // if (!level.rules.every(isValidRule)) return false

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

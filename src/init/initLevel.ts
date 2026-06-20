import { LevelDataSchema } from '../types/LevelData'

export function initLevel(data: string) {
  try {
    return LevelDataSchema.parse(JSON.parse(atob(data)))
  } catch {
    return null
  }
}

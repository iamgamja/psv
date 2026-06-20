import { LevelDataSchema } from '../types/LevelData'

export function loadLevel(data: string) {
  try {
    return LevelDataSchema.parse(JSON.parse(atob(data)))
  } catch {
    return null
  }
}

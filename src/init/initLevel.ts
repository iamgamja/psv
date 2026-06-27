import { LevelDataSchema } from '../types/LevelData'

export function initLevel(data: string) {
  try {
    console.log(JSON.parse(atob(data)))
    const level = LevelDataSchema.parse(JSON.parse(atob(data)))
    console.log(level)
    return level
  } catch (e) {
    console.error(e)
    return null
  }
}

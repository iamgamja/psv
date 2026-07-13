import { type LevelData, LevelDataSchema } from '../types/LevelData'

export async function parseBase64(data: string): Promise<string> {
  if (data === '') return ''

  const parsed = data.replace(/[^A-Za-z0-9+/=]/g, '')

  try {
    if (/^\d+$/.test(parsed)) {
      const response = await fetch(`https://puzzle-id.sangchoo1201.workers.dev/get/${parsed}`)

      if (response.ok) return await response.text()
    }
  } catch (e) {
    console.error(e)
  }

  try {
    JSON.parse(atob(parsed))
    return parsed
  } catch (e) {
    console.error(e)
  }

  return ''
}

export async function initLevel(data: string): Promise<LevelData | null> {
  if (data === '') return null

  try {
    const json = JSON.parse(atob(data))
    const level = LevelDataSchema.parse(json)
    return level
  } catch (e) {
    console.error(e)
  }

  return null
}

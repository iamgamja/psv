import { SettingStateSchema, type SettingState } from '../types/State'

const STORAGE_KEY = 'psv:setting'

export function loadSetting() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    return SettingStateSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveSetting(settingState: SettingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settingState))
}

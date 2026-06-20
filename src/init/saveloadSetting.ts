import { default_setting } from '../const/default'
import { SettingStateSchema, type SettingState } from '../types/State'

const STORAGE_KEY = 'psv:setting'

export function loadSetting() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return default_setting

    return {
      ...default_setting,
      ...SettingStateSchema.partial().parse(JSON.parse(raw)),
    }
  } catch {
    return default_setting
  }
}

export function saveSetting(settingState: SettingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settingState))
}

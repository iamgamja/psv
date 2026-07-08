import { default_setting } from '../const/default'
import { STORAGE_KEY_SETTING } from '../const/storage_key'
import { type SettingState, SettingStateSchema } from '../types/State'

export function loadSetting() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTING)
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
  localStorage.setItem(STORAGE_KEY_SETTING, JSON.stringify(settingState))
}

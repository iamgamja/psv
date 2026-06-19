import type { LevelData } from '../types/LevelData'

export const default_level: LevelData = {
  id: '#00000',
  difficulty: 0.0,
  board: Array.from({ length: 9 }, () => Array(9).fill(0)),
  rules: [{ id: '[R]' }, { id: '[C]' }, { id: '[B]' }],
}

// ============================================
// 用户偏好（首次打开时选择感兴趣的类别/地点，用于首页排序）
// 存储：localStorage（匿名 + 登录用户通用）
// ============================================

import type { CompetitionType, CompetitionLocation } from '@/lib/types'

export interface UserPreferences {
  types: CompetitionType[]
  locations: CompetitionLocation[]
}

const PREFS_KEY = 'hk-compass-prefs'
const ONBOARDED_KEY = 'hk-compass-onboarded'

export const PREF_TYPES: CompetitionType[] = [
  '运动',
  '电竞',
  '创意摄影设计',
  'AI创作',
  '创业路演',
  '音乐表演',
  '其他',
]

export const PREF_LOCATIONS: CompetitionLocation[] = ['港岛', '九龙', '新界', '线上']

export function getPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserPreferences
    if (!parsed || !Array.isArray(parsed.types) || !Array.isArray(parsed.locations)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  localStorage.setItem(ONBOARDED_KEY, '1')
}

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return true
  }
}

/** 计算一场比赛的偏好匹配分（类型命中 +2，地点命中 +1） */
export function preferenceScore(
  comp: { type: CompetitionType; location: CompetitionLocation },
  prefs: UserPreferences | null
): number {
  if (!prefs) return 0
  let score = 0
  if (prefs.types.includes(comp.type)) score += 2
  if (prefs.locations.includes(comp.location)) score += 1
  return score
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import {
  getPreferences,
  savePreferences,
  hasOnboarded,
  PREF_TYPES,
  PREF_LOCATIONS,
  type UserPreferences,
} from '@/lib/preferences'
import type { CompetitionType, CompetitionLocation } from '@/lib/types'
import { Compass, X } from 'lucide-react'

// 首次打开时弹出：让用户选择感兴趣的类别/地点，用于首页个性化排序
export function PreferenceOnboarding() {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [types, setTypes] = useState<CompetitionType[]>([])
  const [locations, setLocations] = useState<CompetitionLocation[]>([])

  useEffect(() => {
    // 首次打开 → 自动弹出
    if (!hasOnboarded()) {
      const existing = getPreferences()
      if (existing) {
        setTypes(existing.types)
        setLocations(existing.locations)
      }
      // 延迟一帧，避免与首屏渲染抢帧
      const timer = setTimeout(() => setOpen(true), 300)
      return () => clearTimeout(timer)
    }

    // 已 onboarded：监听「调整偏好」按钮事件
    const onOpen = () => {
      const existing = getPreferences()
      if (existing) {
        setTypes(existing.types)
        setLocations(existing.locations)
      }
      setOpen(true)
    }
    window.addEventListener('hk-prefs-open', onOpen)
    return () => window.removeEventListener('hk-prefs-open', onOpen)
  }, [])

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

  // 登录用户同步到 profiles（跨设备 + 审核通过时按偏好推送）
  const syncToProfile = async (prefs: UserPreferences) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    try {
      await supabase.from('profiles').update({ preferences: prefs }).eq('user_id', session.user.id)
    } catch {
      /* best-effort */
    }
  }

  const confirm = () => {
    const prefs: UserPreferences = { types, locations }
    savePreferences(prefs)
    syncToProfile(prefs)
    setOpen(false)
    window.dispatchEvent(new CustomEvent('hk-prefs-changed'))
  }

  const skip = () => {
    savePreferences({ types: [], locations: [] })
    syncToProfile({ types: [], locations: [] })
    setOpen(false)
    window.dispatchEvent(new CustomEvent('hk-prefs-changed'))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-background border shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Compass className="h-5 w-5 text-primary" />
              {t(locale, 'pref.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t(locale, 'pref.subtitle')}</p>
          </div>
          <button
            onClick={skip}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 类型 */}
        <div className="mb-5">
          <p className="text-sm font-medium mb-2">{t(locale, 'pref.types_label')}</p>
          <div className="flex flex-wrap gap-2">
            {PREF_TYPES.map((ty) => (
              <Chip
                key={ty}
                label={t(locale, `type.${ty}`)}
                active={types.includes(ty)}
                onClick={() => setTypes((prev) => toggle(prev, ty))}
              />
            ))}
          </div>
        </div>

        {/* 地点 */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">{t(locale, 'pref.locations_label')}</p>
          <div className="flex flex-wrap gap-2">
            {PREF_LOCATIONS.map((loc) => (
              <Chip
                key={loc}
                label={t(locale, `location.${loc}`)}
                active={locations.includes(loc)}
                onClick={() => setLocations((prev) => toggle(prev, loc))}
              />
            ))}
          </div>
        </div>

        {/* 操作 */}
        <div className="flex gap-3">
          <button
            onClick={skip}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {t(locale, 'pref.skip')}
          </button>
          <button
            onClick={confirm}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t(locale, 'pref.done')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border bg-background hover:bg-muted'
      }`}
    >
      {label}
    </button>
  )
}

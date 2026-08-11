'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { X } from 'lucide-react'

const STORAGE_KEY = 'hk-compass-dismissed-announcements'
const BANNER_COLORS: Record<string, string> = {
  info: 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200',
  warning: 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950 dark:border-amber-600 dark:text-amber-200',
  success: 'bg-green-50 border-green-400 text-green-800 dark:bg-green-950 dark:border-green-600 dark:text-green-200',
}

export function AnnouncementBanner() {
  const { locale } = useLocale()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    // 读取已关闭的公告 ID
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        // 检查是否超过 24h
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setDismissed(parsed.ids || [])
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch { /* ignore */ }
    }

    supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setAnnouncements(data)
      })
  }, [])

  const dismiss = (id: string) => {
    const next = [...new Set([...dismissed, id])]
    setDismissed(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: next, timestamp: Date.now() }))
  }

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-1 px-4 pt-3">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${BANNER_COLORS[a.type] || BANNER_COLORS.info}`}
        >
          <div className="flex-1 min-w-0">
            <span className="font-semibold">{a.title}</span>
            {a.content && (
              <>
                <span className="mx-2 opacity-50">·</span>
                <span className="opacity-80">{a.content}</span>
              </>
            )}
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={locale === 'en' ? 'Dismiss' : locale === 'zh-HK' ? '關閉' : '关闭'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { CompetitionCard } from '@/components/competition-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Heart, Bell, AlarmClock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

export default function DashboardPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setLoading(false)
    })
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) return null
      const [savedRes, remindersRes] = await Promise.all([
        supabase.from('saved_competitions').select('competition_id').eq('user_id', userId),
        supabase.from('reminders').select('competition_id').eq('user_id', userId),
      ])
      const savedIds = (savedRes.data ?? []).map((s) => s.competition_id)
      const reminderIds = new Set((remindersRes.data ?? []).map((r) => r.competition_id))

      if (!savedIds.length) {
        return { competitions: [] as Competition[], reminderIds, reminderCount: reminderIds.size }
      }

      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .in('id', savedIds)
        .eq('review_status', 'approved')

      const list = (comps as Competition[]) ?? []
      // 按报名截止时间升序（无截止的排最后）
      list.sort((a, b) => {
        if (!a.registration_deadline) return 1
        if (!b.registration_deadline) return -1
        return new Date(a.registration_deadline).getTime() - new Date(b.registration_deadline).getTime()
      })

      return { competitions: list, reminderIds, reminderCount: reminderIds.size }
    },
    enabled: !!userId,
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (userId === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <LayoutDashboard className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t(locale, 'dashboard.login_prompt')}</h2>
          <p className="text-muted-foreground max-w-sm mb-6">{t(locale, 'dashboard.login_desc')}</p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/auth/login?redirect=/dashboard')}>{t(locale, 'dashboard.login_btn')}</Button>
            <Button variant="outline" onClick={() => router.push('/')}>{t(locale, 'dashboard.browse')}</Button>
          </div>
        </div>
      </div>
    )
  }

  const competitions = data?.competitions ?? []
  const reminderCount = data?.reminderCount ?? 0
  const closingSoon = competitions.filter((c) => {
    const d = daysLeft(c.registration_deadline)
    return d !== null && d >= 0 && d <= 7
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t(locale, 'dashboard.title')}</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard icon={<Heart className="h-4 w-4" />} value={competitions.length} label={t(locale, 'dashboard.saved')} color="text-red-500" />
        <StatCard icon={<AlarmClock className="h-4 w-4" />} value={closingSoon.length} label={t(locale, 'dashboard.closing')} color="text-amber-500" />
        <StatCard icon={<Bell className="h-4 w-4" />} value={reminderCount} label={t(locale, 'dashboard.reminders')} color="text-blue-500" />
      </div>

      {/* 即将截止 */}
      {closingSoon.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-amber-500" />
            {t(locale, 'dashboard.closing_soon')}
          </h2>
          <div className="space-y-2">
            {closingSoon.map((c) => {
              const d = daysLeft(c.registration_deadline)
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/competition/${c.id}`)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border bg-background p-3 hover:border-primary/40 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="truncate text-sm font-medium">
                    {locale === 'en' && c.title_en ? c.title_en : c.title}
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                    {d === 0 ? t(locale, 'dashboard.today') : d === 1 ? t(locale, 'card.tomorrow') : t(locale, 'card.days_left', { days: d ?? 0 })}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 全部收藏 */}
      <section>
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          {t(locale, 'dashboard.all_saved')}
        </h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : competitions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Heart className="mb-4 h-12 w-12" />
            <p className="text-lg">{t(locale, 'account.empty_saved')}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
              {t(locale, 'account.discover')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {competitions.map((comp) => (
              <CompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
}) {
  return (
    <div className="rounded-xl border bg-background p-4 text-center">
      <div className={`flex items-center justify-center gap-1.5 ${color} text-sm font-semibold`}>
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

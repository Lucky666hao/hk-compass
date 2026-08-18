'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition, CompetitionFilters } from '@/lib/types'
import { getPreferences, preferenceScore, type UserPreferences } from '@/lib/preferences'
import { SearchBar } from '@/components/search-bar'
import { FilterBar } from '@/components/filter-bar'
import { CompetitionCard } from '@/components/competition-card'
import { FeaturedCarousel } from '@/components/featured-carousel'
import { Skeleton } from '@/components/ui/skeleton'
import { Compass, SearchX, PanelLeftOpen, PanelLeftClose, PlusCircle, SlidersHorizontal } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { useSidebar } from '@/components/sidebar'
import Link from 'next/link'

const ITEMS_PER_PAGE = 20

export default function HomePage() {
  const { locale } = useLocale()
  const { collapsed, toggle: toggleSidebar } = useSidebar()
  const [filters, setFilters] = useState<CompetitionFilters>({
    keyword: '',
    type: '全部',
    location: '全部',
    fee_type: '全部',
    date_range: '全部',
    age_group: '全部',
    team_size: '全部',
    status: '全部',
  })
  const [page, setPage] = useState(0)
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)

  // 读取偏好，并监听「调整偏好」后的更新事件
  useEffect(() => {
    setPrefs(getPreferences())
    const handler = () => setPrefs(getPreferences())
    window.addEventListener('hk-prefs-changed', handler)
    return () => window.removeEventListener('hk-prefs-changed', handler)
  }, [])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['competitions', filters],
    queryFn: async () => {
      let query = supabase
        .from('competitions')
        .select('*', { count: 'exact' })
        // 只展示审核通过的比赛
        .eq('review_status', 'approved')
        // 即将截止优先 → 有奖金次之 → 日期最近的在前（无截止日期的排最后）
        .order('registration_deadline', { ascending: true, nullsFirst: false })
        .order('fee_type', { ascending: false })
        .order('date_start', { ascending: true })

      if (filters.keyword) {
        query = query.or(
          `title.ilike.%${filters.keyword}%,title_en.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`
        )
      }

      if (filters.type && filters.type !== '全部') {
        query = query.eq('type', filters.type)
      }

      if (filters.location && filters.location !== '全部') {
        query = query.eq('location', filters.location)
      }

      if (filters.fee_type && filters.fee_type !== '全部') {
        query = query.eq('fee_type', filters.fee_type)
      }

      const now = new Date().toISOString()
      if (filters.date_range === '本周') {
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('date_start', now).lte('date_start', nextWeek)
      } else if (filters.date_range === '本月') {
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('date_start', now).lte('date_start', nextMonth)
      } else if (filters.date_range === '下月') {
        const monthStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        const monthEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('date_start', monthStart).lte('date_start', monthEnd)
      }

      if (filters.age_group && filters.age_group !== '全部') {
        query = query.eq('age_group', filters.age_group)
      }

      if (filters.team_size && filters.team_size !== '全部') {
        // 不限 → 同时匹配 team_size='不限' 和 NULL（现有比赛默认不限）
        if (filters.team_size === '不限') {
          query = query.or('team_size.eq.不限,team_size.is.null')
        } else {
          query = query.eq('team_size', filters.team_size)
        }
      }

      if (filters.status && filters.status !== '全部') {
        query = query.eq('status', filters.status)
      } else {
        query = query.neq('status', '已结束')
        // 过滤掉过期报名截止日期的比赛
        query = query.or(`registration_deadline.is.null,registration_deadline.gte.${now}`)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { competitions: data as Competition[], total: count ?? 0 }
    },
  })

  const handleSearch = useCallback((keyword: string) => {
    setFilters((prev) => ({ ...prev, keyword }))
    setPage(0)
  }, [])

  const handleFilterChange = useCallback((key: keyof CompetitionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }, [])

  // 过滤掉仅限大陆院校的比赛（香港学生无法参加）
  const rawCompetitions = data?.competitions ?? []
  const filtered = filters.status && filters.status !== '全部'
    ? rawCompetitions
    : rawCompetitions.filter(c => !(c.description || '').includes('仅限中国内地院校学生参加'))

  // 按用户偏好排序：偏好匹配的排前面（类型命中 +2，地点命中 +1）。
  // 同分保持原有排序（即将截止优先）；Array.sort 稳定，不会打乱同分顺序。
  const sorted = [...filtered].sort(
    (a, b) => preferenceScore(b, prefs) - preferenceScore(a, prefs)
  )
  const total = sorted.length
  const competitions = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <FeaturedCarousel />

      {/* 侧栏展开/收起按钮 — 放在发现比赛上方 */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 px-2 py-1 rounded hover:bg-muted"
        title={collapsed ? '展开导航栏' : '收起导航栏'}
      >
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        {collapsed
          ? (locale === 'en' ? 'Expand sidebar' : locale === 'zh-HK' ? '展開側欄' : '展开侧栏')
          : (locale === 'en' ? 'Collapse sidebar' : locale === 'zh-HK' ? '收起側欄' : '收起侧栏')
        }
      </button>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <Compass className="mr-3 inline-block h-8 w-8 text-primary" />
          {t(locale, 'home.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t(locale, 'home.subtitle')}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/competition/rules"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            {t(locale, 'sidebar.publish_comp')}
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('hk-prefs-open'))}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t(locale, 'pref.adjust')}
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <SearchBar onSearch={handleSearch} defaultValue={filters.keyword} />
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>

      {!isLoading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t(locale, 'home.total', { count: total })}</span>
          {isFetching && <span className="animate-pulse">{t(locale, 'home.updating')}</span>}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <SearchX className="mb-4 h-12 w-12" />
          <p className="text-lg">{t(locale, 'home.empty')}</p>
          <p className="text-sm">{t(locale, 'home.empty.hint')}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {competitions.map((comp) => (
              <CompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>

          {total > ITEMS_PER_PAGE && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                {t(locale, 'home.prev')}
              </button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {t(locale, 'home.page', { current: page + 1, total: Math.ceil(total / ITEMS_PER_PAGE) })}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * ITEMS_PER_PAGE >= total}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                {t(locale, 'home.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

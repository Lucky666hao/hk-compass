'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { supabase } from '@/lib/supabase'
import type { AnalyticsSummary } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'

// ---- SVG 柱状图 ----
function DailyBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const chartH = 160
  const chartW = data.length * 56
  const barW = 32

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} className="w-full h-auto" role="img">
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * chartH, d.count > 0 ? 4 : 0)
        const x = i * 56 + 12
        const y = chartH - barH
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              className="fill-primary"
            >
              <title>{d.date}: {d.count} views</title>
            </rect>
            <text
              x={x + barW / 2}
              y={chartH + 20}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {d.date.slice(5)}
            </text>
            {d.count > 0 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={10}
                fontWeight={500}
              >
                {d.count}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ---- 时段热力表 ----
function HourlyHeatmap({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="grid grid-cols-24 gap-0.5">
      {data.map((d) => {
        const intensity = d.count / max
        let bgClass = 'bg-muted'
        if (intensity > 0.66) bgClass = 'bg-primary/80'
        else if (intensity > 0.33) bgClass = 'bg-primary/50'
        else if (intensity > 0) bgClass = 'bg-primary/25'

        return (
          <div
            key={d.hour}
            className={`h-8 rounded-sm ${bgClass} flex items-end justify-center pb-0.5`}
            title={`${d.hour}:00 — ${d.count} views`}
          >
            <span className="text-[9px] text-foreground/60">
              {d.count > 0 && d.hour % 3 === 0 ? d.hour : ''}
            </span>
          </div>
        )
      })}
      {/* 底部时间标签 */}
      {[0, 6, 12, 18].map(h => (
        <div key={`lbl-${h}`} className="text-[9px] text-muted-foreground text-center col-span-1 -mt-0.5">
          {h}h
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { locale } = useLocale()
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`/api/admin/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => {
          if (!res.ok) throw new Error(`API ${res.status}`)
          return res.json()
        })
        .then((data) => {
          if (data && typeof data.totalViews === 'number') {
            setAnalytics(data)
          } else if (data?.error) {
            console.error('[admin] API error:', data.error)
          }
        })
        .catch(err => console.error('[admin] fetch error:', err))
        .finally(() => setLoading(false))
    })
  }, [days])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return <p className="text-muted-foreground">{t(locale, 'admin.no_data')}</p>
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片行 — 流量 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_views')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.today_views')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.todayViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.paths')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.topPaths.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_users')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 统计卡片行 — 内容 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_comps')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.totalCompetitions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_posts')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.totalPosts.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_reminders')}</div>
            <div className="text-3xl font-bold mt-1">{analytics.totalReminders.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 时间段切换 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t(locale, 'admin.stats.period')}:</span>
        <div className="inline-flex rounded-md bg-muted p-0.5 gap-0.5">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                days === d
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* 每日访问柱状图 */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-4">{t(locale, 'admin.stats.daily')}</h2>
          <div className="overflow-x-auto">
            <DailyBarChart data={analytics.dailyViews} />
          </div>
        </CardContent>
      </Card>

      {/* 时段热力表 */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-4">{t(locale, 'admin.stats.hourly')}</h2>
          <HourlyHeatmap data={analytics.hourlyHeatmap} />
        </CardContent>
      </Card>

      {/* Top 路径 */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">{t(locale, 'admin.stats.top_pages')}</h2>
          <div className="space-y-1">
            {analytics.topPaths.length === 0 && (
              <p className="text-sm text-muted-foreground">{t(locale, 'admin.no_data')}</p>
            )}
            {analytics.topPaths.map((p, i) => (
              <div key={p.path} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                  <span className="truncate font-mono text-xs">{p.path}</span>
                </div>
                <span className="text-muted-foreground shrink-0 ml-4">{p.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

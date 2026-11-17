'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { supabase } from '@/lib/supabase'
import type { AnalyticsSummary } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import {
  RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, ShieldOff,
  Activity, Trophy, MessageSquare, ThumbsUp, Briefcase, GraduationCap,
} from 'lucide-react'

type TabKey = 'overview' | 'traffic' | 'content' | 'health'

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
            <rect x={x} y={y} width={barW} height={barH} rx={4} className="fill-primary">
              <title>{d.date}: {d.count} views</title>
            </rect>
            <text x={x + barW / 2} y={chartH + 20} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
              {d.date.slice(5)}
            </text>
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="fill-foreground" fontSize={10} fontWeight={500}>
                {d.count}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ---- 小时柱状图 ----
function HourlyBarChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const chartH = 160
  const barW = 18
  const gap = 8
  const totalW = data.length * (barW + gap)

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 44}`} className="w-full h-auto" role="img">
      {data.map((d) => {
        const barH = Math.max((d.count / max) * chartH, d.count > 0 ? 4 : 0)
        const x = d.hour * (barW + gap) + gap / 2
        const y = chartH - barH
        return (
          <g key={d.hour}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} className="fill-primary">
              <title>{d.hour}:00 — {d.count} 次浏览</title>
            </rect>
            {d.hour % 3 === 0 && (
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                {d.hour}时
              </text>
            )}
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" className="fill-foreground" fontSize={9} fontWeight={500}>
                {d.count}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ---- 横向比例条列表（设备 / 板块分布）----
function HBarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{i.label}</span>
          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary rounded transition-all"
              style={{ width: `${Math.max((i.count / max) * 100, i.count > 0 ? 2 : 0)}%` }}
            />
          </div>
          <span className="w-14 text-right shrink-0 font-medium tabular-nums">{i.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { locale } = useLocale()
  const [tab, setTab] = useState<TabKey>('overview')
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [granularity, setGranularity] = useState<'day' | 'hour'>('day')

  const [statusCheckResult, setStatusCheckResult] = useState<{ ok?: boolean; updated?: { total: number }; details?: string[]; error?: string } | null>(null)
  const [statusChecking, setStatusChecking] = useState(false)

  const [health, setHealth] = useState<Record<string, { count: number; status: string; samples?: any[] }> | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/admin/health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setHealth(await res.json())
    } catch { /* silent */ }
    finally { setHealthLoading(false) }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  const runStatusCheck = useCallback(async () => {
    setStatusChecking(true)
    setStatusCheckResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      setStatusCheckResult(json)
    } catch (e: any) {
      setStatusCheckResult({ error: e.message })
    } finally {
      setStatusChecking(false)
      fetchHealth()
    }
  }, [fetchHealth])

  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/admin/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => {
          if (!res.ok) throw new Error(`API ${res.status}`)
          return res.json()
        })
        .then((data) => {
          if (data && typeof data.totalViews === 'number') setAnalytics(data)
          else if (data?.error) console.error('[admin] API error:', data.error)
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

  const L = (en: string, zhHK: string, zhCN: string) =>
    locale === 'en' ? en : locale === 'zh-HK' ? zhHK : zhCN

  const tabLabels: Record<TabKey, string> = {
    overview: t(locale, 'admin.tab.overview'),
    traffic: t(locale, 'admin.tab.traffic'),
    content: t(locale, 'admin.tab.content'),
    health: t(locale, 'admin.tab.health'),
  }

  const deviceLabels = {
    mobile: t(locale, 'admin.stats.mobile'),
    desktop: t(locale, 'admin.stats.desktop'),
    other: t(locale, 'admin.stats.other'),
  }

  const sectionLabel = (s: string) =>
    s === 'home' || s === '' ? L('Home', '首頁', '首页') : s

  return (
    <div className="space-y-5">
      {/* Tab 栏 */}
      <div className="inline-flex flex-wrap rounded-lg bg-muted p-1 gap-1">
        {(Object.keys(tabLabels) as TabKey[]).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              tab === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabLabels[k]}
          </button>
        ))}
      </div>

      {/* ── 概览 ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_views')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.totalViews.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.unique_visitors')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.uniqueVisitors.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.today_views')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.todayViews.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.today_unique')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.todayUniqueVisitors.toLocaleString()}</div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_users')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.totalUsers.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_comps')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.totalCompetitions.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_posts')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.totalPosts.toLocaleString()}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{t(locale, 'admin.stats.total_reminders')}</div>
              <div className="text-3xl font-bold mt-1">{analytics.totalReminders.toLocaleString()}</div>
            </CardContent></Card>
          </div>
        </div>
      )}

      {/* ── 流量分析 ── */}
      {tab === 'traffic' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">{t(locale, 'admin.stats.period')}:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-md bg-muted p-0.5 gap-0.5">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setDays(d)}
                    className={`px-3 py-1 text-xs rounded font-medium transition-colors ${days === d ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {d}d
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-md bg-muted p-0.5 gap-0.5">
                <button onClick={() => setGranularity('day')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${granularity === 'day' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t(locale, 'admin.stats.daily')}
                </button>
                <button onClick={() => setGranularity('hour')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${granularity === 'hour' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t(locale, 'admin.stats.hourly')}
                </button>
              </div>
            </div>
          </div>

          <Card><CardContent className="p-5">
            <h2 className="font-semibold mb-4">{granularity === 'day' ? t(locale, 'admin.stats.daily') : t(locale, 'admin.stats.hourly')}</h2>
            <div className="overflow-x-auto">
              {granularity === 'day' ? <DailyBarChart data={analytics.dailyViews} /> : <HourlyBarChart data={analytics.hourlyHeatmap} />}
            </div>
          </CardContent></Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardContent className="p-5">
              <h2 className="font-semibold mb-4">{t(locale, 'admin.stats.device')}</h2>
              <HBarList items={analytics.deviceBreakdown.map(d => ({ label: deviceLabels[d.device], count: d.count }))} />
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <h2 className="font-semibold mb-4">{t(locale, 'admin.stats.sections')}</h2>
              {analytics.sectionBreakdown.length === 0
                ? <p className="text-sm text-muted-foreground">{t(locale, 'admin.no_data')}</p>
                : <HBarList items={analytics.sectionBreakdown.map(s => ({ label: sectionLabel(s.section), count: s.count }))} />}
            </CardContent></Card>
          </div>

          <Card><CardContent className="p-5">
            <h2 className="font-semibold mb-3">{t(locale, 'admin.stats.top_pages')}</h2>
            <div className="space-y-1">
              {analytics.topPaths.length === 0 && <p className="text-sm text-muted-foreground">{t(locale, 'admin.no_data')}</p>}
              {analytics.topPaths.map((p, i) => (
                <div key={p.path} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                    <span className="truncate font-mono text-xs">{p.path}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-4 tabular-nums">{p.count}</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ── 内容分析 ── */}
      {tab === 'content' && (
        <div className="space-y-5">
          <Card><CardContent className="p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {t(locale, 'admin.stats.top_comps')}
            </h2>
            {analytics.topCompetitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(locale, 'admin.no_data')}</p>
            ) : (
              <div className="space-y-1">
                {analytics.topCompetitions.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                      <span className="truncate">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                      <span>{t(locale, 'admin.stats.saves')}: <b className="text-foreground">{c.saves}</b></span>
                      <span>{t(locale, 'admin.stats.reminders')}: <b className="text-foreground">{c.reminders}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              {t(locale, 'admin.stats.engagement')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { icon: MessageSquare, label: t(locale, 'admin.stats.total_posts'), value: analytics.engagement.posts },
                { icon: MessageSquare, label: t(locale, 'admin.stats.comments'), value: analytics.engagement.comments },
                { icon: ThumbsUp, label: t(locale, 'admin.stats.reactions'), value: analytics.engagement.reactions },
                { icon: Briefcase, label: t(locale, 'admin.stats.recruitments'), value: analytics.engagement.recruitments },
                { icon: GraduationCap, label: t(locale, 'admin.stats.course_reviews'), value: analytics.engagement.courseReviews },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg border px-3 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <div className="text-2xl font-bold mt-1.5 tabular-nums">{value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* ── 数据健康 ── */}
      {tab === 'health' && (
        <div className="space-y-5">
          <Card className={health && Object.values(health).every(h => h.status === 'ok') ? 'border-emerald-500/30' : 'border-amber-500/30'}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  {health && Object.values(health).every(h => h.status === 'ok') ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : health && Object.values(health).some(h => h.status === 'error') ? (
                    <ShieldOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                  )}
                  {t(locale, 'admin.tab.health')}
                </h2>
                <button onClick={fetchHealth} disabled={healthLoading}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RefreshCw className={`h-3 w-3 ${healthLoading ? 'animate-spin' : ''}`} />
                  {L('Refresh', '刷新', '刷新')}
                </button>
              </div>

              {healthLoading && !health ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
                </div>
              ) : health ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'expired', label: L('Expired Active', '過期未標記', '过期未标记') },
                    { key: 'mainland', label: L('Mainland-Only', '大陸限制', '大陆限制') },
                    { key: 'uniMissing', label: L('Missing Uni Tag', '大學關聯缺失', '大学关联缺失') },
                    { key: 'noDates', label: L('No Dates', '無日期', '无日期') },
                  ].map(({ key, label }) => {
                    const h = health[key]
                    const icon = h?.status === 'ok' ? '✓' : h?.status === 'warn' ? '⚠' : '✗'
                    const colorClass = h?.status === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : h?.status === 'warn'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    return (
                      <div key={key} className={`rounded-lg border px-3 py-2.5 ${colorClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium opacity-80">{label}</span>
                          <span className="text-xs font-bold">{icon}</span>
                        </div>
                        <div className="text-2xl font-bold mt-1">{h?.count ?? '—'}</div>
                        {h?.samples && h.samples.length > 0 && (
                          <div className="mt-1 text-[10px] opacity-70 truncate" title={h.samples.map((s: any) => s.title).join(' / ')}>
                            {h.samples[0].title?.slice(0, 25)}{h.samples.length > 1 ? ` +${h.samples.length - 1}` : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <RefreshCw className={`h-4 w-4 shrink-0 ${statusChecking ? 'animate-spin' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{L('Competition Status Check', '比賽狀態檢查', '比赛状态检查')}</p>
                    <p className="text-xs text-muted-foreground">
                      {L('Manually close competitions with expired deadlines', '手動關閉已過期的比賽（後備方案）', '手动关闭已过期的比赛（后备方案）')}
                    </p>
                  </div>
                </div>
                <button onClick={runStatusCheck} disabled={statusChecking}
                  className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0">
                  {statusChecking ? L('Checking...', '檢查中...', '检查中...') : L('Run Check', '執行檢查', '执行检查')}
                </button>
              </div>
              {statusCheckResult && (
                <div className={`mt-3 text-sm flex items-start gap-2 ${statusCheckResult.error ? 'text-red-600' : 'text-emerald-600'}`}>
                  {statusCheckResult.error ? (
                    <><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {statusCheckResult.error}</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      {L(`Done — ${statusCheckResult.updated?.total ?? 0} competition(s) closed.`, `完成 — 已關閉 ${statusCheckResult.updated?.total ?? 0} 個比賽。`, `完成 — 已关闭 ${statusCheckResult.updated?.total ?? 0} 个比赛。`)}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

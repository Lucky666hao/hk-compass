/**
 * GET /api/admin/stats — 管理员分析数据
 * 返回：概览（流量+内容 KPI）、流量分析（趋势/设备/板块/路径）、内容分析（热门比赛/互动）
 * 时间统计均按「香港时区 (Asia/Hong_Kong, UTC+8)」计算，避免 UTC 导致的「今日」错位。
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

const HK_OFFSET_MS = 8 * 60 * 60 * 1000 // UTC+8，香港无夏令时

// ISO 时间戳 → 香港日期字符串（YYYY-MM-DD）
function hkDateStr(iso: string): string {
  return new Date(new Date(iso).getTime() + HK_OFFSET_MS).toISOString().slice(0, 10)
}

// 香港「今日零点」对应的 UTC 时间戳（ISO）
function hkTodayStartISO(): string {
  const shifted = new Date(Date.now() + HK_OFFSET_MS)
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  return new Date(utcMidnight - HK_OFFSET_MS).toISOString()
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '7', 10)

  const supabase = getAdminClient()
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - days)
  const sinceISO = sinceDate.toISOString()
  const todayStr = hkDateStr(new Date().toISOString())
  const hkTodayStart = hkTodayStartISO()

  // ── 概览：流量 ──
  const { count: totalViews } = await supabase
    .from('page_views').select('*', { count: 'exact', head: true })
    .not('path', 'like', '/admin%')

  // 独立访客（session_id 去重：全时 + 今日）
  const { data: sessRows } = await supabase
    .from('page_views').select('session_id, timestamp')
    .not('path', 'like', '/admin%')
    .not('session_id', 'is', null)

  const uniqueAll = new Set<string>()
  const uniqueToday = new Set<string>()
  for (const r of sessRows || []) {
    uniqueAll.add(r.session_id)
    if (r.timestamp && hkDateStr(r.timestamp) === todayStr) uniqueToday.add(r.session_id)
  }

  const { count: todayViews } = await supabase
    .from('page_views').select('*', { count: 'exact', head: true })
    .not('path', 'like', '/admin%')
    .gte('timestamp', hkTodayStart)

  // ── 概览：内容 ──
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: totalCompetitions } = await supabase.from('competitions').select('*', { count: 'exact', head: true })
  const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true })
  const { count: totalReminders } = await supabase.from('reminders').select('*', { count: 'exact', head: true })

  // ── 流量分析（窗口内聚合，按香港时区）──
  const { data: pvRows } = await supabase
    .from('page_views').select('path, user_agent, session_id, timestamp')
    .not('path', 'like', '/admin%')
    .gte('timestamp', sinceISO)

  const dayMap: Record<string, number> = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dayMap[hkDateStr(d.toISOString())] = 0
  }

  const hourCounts = new Array(24).fill(0)
  const pathCounts: Record<string, number> = {}
  const sectionCounts: Record<string, number> = {}
  const deviceCounts = { mobile: 0, desktop: 0, other: 0 }

  for (const r of pvRows || []) {
    const ts = r.timestamp || ''
    const day = hkDateStr(ts)
    if (day in dayMap) dayMap[day]++

    const hkHour = new Date(new Date(ts).getTime() + HK_OFFSET_MS).getUTCHours()
    if (!Number.isNaN(hkHour)) hourCounts[hkHour]++

    const path = r.path || '/'
    pathCounts[path] = (pathCounts[path] || 0) + 1

    const seg = path.split('/')[1] || 'home'
    sectionCounts[seg] = (sectionCounts[seg] || 0) + 1

    const ua = (r.user_agent || '').toLowerCase()
    if (/(android|iphone|ipad|mobile|ios|windows phone)/.test(ua)) deviceCounts.mobile++
    else if (ua) deviceCounts.desktop++
    else deviceCounts.other++
  }

  const dailyViews = Object.entries(dayMap).map(([date, count]) => ({ date, count }))
  const hourlyHeatmap = hourCounts.map((count, hour) => ({ hour, count }))
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))
  const sectionBreakdown = Object.entries(sectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([section, count]) => ({ section, count }))
  const deviceBreakdown = (['mobile', 'desktop', 'other'] as const)
    .map((device) => ({ device, count: deviceCounts[device] }))

  // ── 内容分析：热门比赛 + 互动 ──
  const { data: savedRows } = await supabase.from('saved_competitions').select('competition_id')
  const { data: remindRows } = await supabase.from('reminders').select('competition_id')

  const saveCount: Record<string, number> = {}
  const remindCount: Record<string, number> = {}
  for (const r of savedRows || []) if (r.competition_id) saveCount[r.competition_id] = (saveCount[r.competition_id] || 0) + 1
  for (const r of remindRows || []) if (r.competition_id) remindCount[r.competition_id] = (remindCount[r.competition_id] || 0) + 1

  const compIds = [...new Set([...Object.keys(saveCount), ...Object.keys(remindCount)])]
  const titleMap = new Map<string, string>()
  if (compIds.length > 0) {
    const { data: comps } = await supabase.from('competitions').select('id, title').in('id', compIds)
    for (const c of comps || []) titleMap.set(c.id, c.title)
  }
  const topCompetitions = compIds
    .map((id) => ({
      id,
      title: titleMap.get(id) || '—',
      saves: saveCount[id] || 0,
      reminders: remindCount[id] || 0,
    }))
    .sort((a, b) => (b.saves + b.reminders) - (a.saves + a.reminders))
    .slice(0, 10)

  const [
    commentsRes, anonCommentsRes, reactionsRes, votesRes, recruitmentsRes, courseReviewsRes,
  ] = await Promise.all([
    supabase.from('post_comments').select('*', { count: 'exact', head: true }),
    supabase.from('anonymous_post_comments').select('*', { count: 'exact', head: true }),
    supabase.from('post_reactions').select('*', { count: 'exact', head: true }),
    supabase.from('post_votes').select('*', { count: 'exact', head: true }),
    supabase.from('recruitments').select('*', { count: 'exact', head: true }),
    supabase.from('course_reviews').select('*', { count: 'exact', head: true }),
  ])

  const engagement = {
    posts: totalPosts || 0,
    comments: (commentsRes.count || 0) + (anonCommentsRes.count || 0),
    reactions: (reactionsRes.count || 0) + (votesRes.count || 0),
    recruitments: recruitmentsRes.count || 0,
    courseReviews: courseReviewsRes.count || 0,
  }

  return NextResponse.json({
    // 概览
    totalViews: totalViews || 0,
    uniqueVisitors: uniqueAll.size,
    todayViews: todayViews || 0,
    todayUniqueVisitors: uniqueToday.size,
    totalUsers: totalUsers || 0,
    totalCompetitions: totalCompetitions || 0,
    totalPosts: totalPosts || 0,
    totalReminders: totalReminders || 0,
    // 流量
    dailyViews,
    hourlyHeatmap,
    topPaths,
    deviceBreakdown,
    sectionBreakdown,
    // 内容
    topCompetitions,
    engagement,
  })
}

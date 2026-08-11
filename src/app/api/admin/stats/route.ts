/**
 * GET /api/admin/stats — 管理员分析数据
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '7', 10)

  const supabase = getAdminClient()

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - days)

  // 总访问量
  const { count: totalViews } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })

  // 今日访问
  const { count: todayViews } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', new Date().toISOString().slice(0, 10))

  // 每日访问（柱状图数据）
  const { data: dailyRaw } = await supabase
    .from('page_views')
    .select('timestamp')
    .gte('timestamp', sinceDate.toISOString())
    .order('timestamp', { ascending: true })

  // 按天分组
  const dayMap: Record<string, number> = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dayMap[d.toISOString().slice(0, 10)] = 0
  }
  if (dailyRaw) {
    for (const row of dailyRaw) {
      const day = row.timestamp.slice(0, 10)
      if (day in dayMap) dayMap[day]++
    }
  }
  const dailyViews = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

  // 时段热力表（按小时）
  const { data: hourlyRaw } = await supabase
    .from('page_views')
    .select('timestamp')
    .gte('timestamp', sinceDate.toISOString())

  const hourCounts = new Array(24).fill(0)
  if (hourlyRaw) {
    for (const row of hourlyRaw) {
      const h = new Date(row.timestamp).getHours()
      hourCounts[h]++
    }
  }
  const hourlyHeatmap = hourCounts.map((count, hour) => ({ hour, count }))

  // Top 路径
  const { data: pathData } = await supabase
    .from('page_views')
    .select('path')
    .gte('timestamp', sinceDate.toISOString())

  const pathCounts: Record<string, number> = {}
  if (pathData) {
    for (const row of pathData) {
      pathCounts[row.path] = (pathCounts[row.path] || 0) + 1
    }
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))

  return NextResponse.json({
    totalViews: totalViews || 0,
    todayViews: todayViews || 0,
    dailyViews,
    hourlyHeatmap,
    topPaths,
  })
}

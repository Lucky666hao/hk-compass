/**
 * POST /api/admin/update-status — 管理员手动触发状态更新
 * 等效于 Vercel Cron 定时任务，作为后备方案
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const now = new Date().toISOString()

  // 1. 报名截止日期已过 + 状态不是「已结束」→ 标记为已结束
  const { data: expired } = await supabase
    .from('competitions')
    .select('id, title')
    .neq('status', '已结束')
    .not('registration_deadline', 'is', null)
    .lt('registration_deadline', now)

  let updatedDeadline = 0
  if (expired && expired.length > 0) {
    const { error } = await supabase
      .from('competitions')
      .update({ status: '已结束' })
      .in('id', expired.map((e) => e.id))
    if (!error) updatedDeadline = expired.length
  }

  // 2. 比赛已结束日期已过 + 状态不是「已结束」→ 标记为已结束
  const { data: pastEvent } = await supabase
    .from('competitions')
    .select('id, title')
    .neq('status', '已结束')
    .not('date_end', 'is', null)
    .lt('date_end', now)

  let updatedEvent = 0
  if (pastEvent && pastEvent.length > 0) {
    const { error } = await supabase
      .from('competitions')
      .update({ status: '已结束' })
      .in('id', pastEvent.map((e) => e.id))
    if (!error) updatedEvent = pastEvent.length
  }

  const details = [
    ...(expired || []).map((e: { id: string; title: string }) => `[deadline] ${e.title.slice(0, 40)}`),
    ...(pastEvent || []).map((e: { id: string; title: string }) => `[end_date] ${e.title.slice(0, 40)}`),
  ]

  return NextResponse.json({
    ok: true,
    timestamp: now,
    updated: {
      by_deadline: updatedDeadline,
      by_event_end: updatedEvent,
      total: updatedDeadline + updatedEvent,
    },
    details,
  })
}

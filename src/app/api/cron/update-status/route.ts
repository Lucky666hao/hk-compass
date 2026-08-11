import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const now = new Date().toISOString()

  // 1. 报名截止日期已过 + 状态不是「已结束」→ 标记为已结束
  const { data: expired } = await supabase
    .from('competitions')
    .select('id')
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

  // 2. 比赛日期已过 + 状态仍是「报名中」或「即将开始」→ 标记为已结束
  const { data: pastEvent } = await supabase
    .from('competitions')
    .select('id')
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

  return NextResponse.json({
    ok: true,
    timestamp: now,
    updated: {
      by_deadline: updatedDeadline,
      by_event_end: updatedEvent,
      total: updatedDeadline + updatedEvent,
    },
  })
}

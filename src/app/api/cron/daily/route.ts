/**
 * GET /api/cron/daily — 合并每日定时任务
 *
 * 按顺序执行：状态更新 → 发送提醒 → 健康检查
 * 解决 Vercel 免费版只支持 1 个 Cron 的限制
 *
 * Vercel Cron: 0 3 * * * (每天凌晨3点)
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ─── 1. 状态更新 ────────────────────────────────────────────
async function updateStatuses(supabase: ReturnType<typeof getAdminClient>) {
  const now = new Date().toISOString()

  // 报名截止日期已过
  const { data: expired } = await supabase
    .from('competitions')
    .select('id')
    .neq('status', '已结束')
    .not('registration_deadline', 'is', null)
    .lt('registration_deadline', now)

  let byDeadline = 0
  if (expired && expired.length > 0) {
    const { error } = await supabase
      .from('competitions')
      .update({ status: '已结束' })
      .in('id', expired.map(e => e.id))
    if (!error) byDeadline = expired.length
  }

  // 比赛结束日期已过
  const { data: pastEvent } = await supabase
    .from('competitions')
    .select('id')
    .neq('status', '已结束')
    .not('date_end', 'is', null)
    .lt('date_end', now)

  let byEventEnd = 0
  if (pastEvent && pastEvent.length > 0) {
    const { error } = await supabase
      .from('competitions')
      .update({ status: '已结束' })
      .in('id', pastEvent.map(e => e.id))
    if (!error) byEventEnd = pastEvent.length
  }

  return { byDeadline, byEventEnd, total: byDeadline + byEventEnd }
}

// ─── 2. 发送提醒 ────────────────────────────────────────────
async function sendReminders(supabase: ReturnType<typeof getAdminClient>) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const now = Date.now()

  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, remind_before, user_id, notified, competitions!inner(title, registration_deadline)')
    .eq('notified', false)

  if (!reminders || reminders.length === 0) {
    return { sent: 0, skipped: 0, total: 0 }
  }

  let sent = 0
  let skipped = 0

  const thresholds: Record<string, number> = {
    '1小时前': 60 * 60 * 1000,
    '1天前': 24 * 60 * 60 * 1000,
    '3天前': 3 * 24 * 60 * 60 * 1000,
    '1周前': 7 * 24 * 60 * 60 * 1000,
  }

  for (const reminder of reminders) {
    const comp = (reminder as any).competitions as any
    const deadline = comp?.registration_deadline
    if (!deadline) { skipped++; continue }

    const deadlineMs = new Date(deadline).getTime()
    const diff = deadlineMs - now
    if (diff <= 0) { skipped++; continue }

    const threshold = thresholds[reminder.remind_before]
    if (!threshold) { skipped++; continue }

    const windowStart = threshold - 30 * 60 * 1000
    const windowEnd = threshold + 30 * 60 * 1000
    if (diff < windowStart || diff > windowEnd) { skipped++; continue }

    // 获取用户邮箱
    const { data: authUser } = await supabase.auth.admin.getUserById(reminder.user_id)
    const email = authUser?.user?.email
    if (!email) { skipped++; continue }

    // 发送邮件（只有发送成功才标记已通知）
    if (RESEND_API_KEY) {
      try {
        const deadlineDate = new Date(deadline).toLocaleDateString('zh-HK', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
        })
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'HK Compass <notifications@hk-compass.vercel.app>',
            to: [email],
            subject: `⏰ 【HK Compass】「${comp.title}」报名即将截止 — ${deadlineDate}`,
            html: `<p>你关注的比赛 <strong>「${comp.title}」</strong> 报名截止日期为 <strong>${deadlineDate}</strong>，请尽快完成报名！<br><a href="https://hk-compass.vercel.app/competition/${(comp as any).id || ''}">查看比赛详情 →</a></p>`,
          }),
        })
        if (res.ok) {
          await supabase.from('reminders').update({ notified: true }).eq('id', reminder.id)
          sent++
        } else {
          skipped++
        }
      } catch { skipped++ }
    } else {
      skipped++
    }
  }

  return { sent, skipped, total: reminders.length }
}

// ─── 3. 健康检查 ────────────────────────────────────────────
async function runHealthCheck(supabase: ReturnType<typeof getAdminClient>) {
  const now = new Date().toISOString()

  const { count: expired } = await supabase
    .from('competitions')
    .select('*', { count: 'exact', head: true })
    .neq('status', '已结束')
    .or(`registration_deadline.lt.${now},date_end.lt.${now}`)

  const { count: noDates } = await supabase
    .from('competitions')
    .select('*', { count: 'exact', head: true })
    .is('registration_deadline', null)
    .is('date_end', null)

  // 大学关联缺失（有 HK 大学标题但无 target_universities）
  const { count: uniMissing } = await supabase
    .from('competitions')
    .select('*', { count: 'exact', head: true })
    .is('target_universities', null)
    .neq('status', '已结束')
    .or(`title.ilike.%香港%,title.ilike.%大學%,title.ilike.%大学%,organizer.ilike.%香港%,organizer.ilike.%大學%,organizer.ilike.%大学%`)

  // 大陆限制
  const { count: mainlandFlagged } = await supabase
    .from('competitions')
    .select('*', { count: 'exact', head: true })
    .neq('status', '已结束')
    .or('description.ilike.%大陆%,description.ilike.%内地%,description.ilike.%国内高校%,description.ilike.%中国公民%,description.ilike.%全国大学生%,description.ilike.%全国高校%')
    .not('description', 'ilike', '%仅限中国内地院校%')

  return {
    expired: expired || 0,
    mainlandFlagged: mainlandFlagged || 0,
    uniMissing: uniMissing || 0,
    noDates: noDates || 0,
  }
}

// ─── 主入口 ──────────────────────────────────────────────────
export async function GET() {
  const supabase = getAdminClient()
  const results: Record<string, any> = {}
  const errors: string[] = []

  // 1. 状态更新
  try {
    results.updateStatus = await updateStatuses(supabase)
  } catch (e: any) {
    results.updateStatus = { error: e.message }
    errors.push('updateStatus: ' + e.message)
  }

  // 2. 发送提醒
  try {
    results.sendReminders = await sendReminders(supabase)
  } catch (e: any) {
    results.sendReminders = { error: e.message }
    errors.push('sendReminders: ' + e.message)
  }

  // 3. 健康检查
  try {
    results.health = await runHealthCheck(supabase)
  } catch (e: any) {
    results.health = { error: e.message }
    errors.push('health: ' + e.message)
  }

  // 写入 cron_logs（失败不影响主流程）
  try {
    await supabase.from('cron_logs').insert({
      job_name: 'daily',
      status: errors.length > 0 ? 'warn' : 'ok',
      result: { ...results, errors },
    })
  } catch { /* 日志写入失败不中断 cron */ }

  return NextResponse.json({
    ok: errors.length === 0,
    timestamp: new Date().toISOString(),
    ...results,
    errors: errors.length > 0 ? errors : undefined,
  })
}

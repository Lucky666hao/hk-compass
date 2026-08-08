/**
 * 邮件提醒 Cron 端点
 *
 * 每天运行一次，检查哪些用户的报名截止提醒应该触发
 * 发送邮件通知用户
 *
 * Vercel Cron: 0 7 * * * (每天早上7点 HKT)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_API_URL = 'https://api.resend.com/emails'
const SENDER_EMAIL = 'HK Compass <notifications@hk-compass.vercel.app>'

/**
 * 计算提醒触发点
 * remind_before: '1小时前' | '1天前' | '3天前' | '1周前'
 * 返回该提醒是否应该在当前时刻触发
 */
function shouldTriggerNow(deadline: string, remindBefore: string): boolean {
  const now = Date.now()
  const deadlineMs = new Date(deadline).getTime()
  const diff = deadlineMs - now

  if (diff <= 0) return false // 已过期

  const thresholds: Record<string, number> = {
    '1小时前': 60 * 60 * 1000,
    '1天前': 24 * 60 * 60 * 1000,
    '3天前': 3 * 24 * 60 * 60 * 1000,
    '1周前': 7 * 24 * 60 * 60 * 1000,
  }

  const threshold = thresholds[remindBefore]
  if (!threshold) return false

  // 在阈值 ±30分钟内触发（避免重复触发）
  const windowStart = threshold - 30 * 60 * 1000
  const windowEnd = threshold + 30 * 60 * 1000

  return diff >= windowStart && diff <= windowEnd
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`📧 [DRY] Would send to ${to}: ${subject}`)
    return false
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    return res.ok
  } catch (err) {
    console.error('Resend send error:', err)
    return false
  }
}

async function sendPushNotification(
  supabase: any,
  userId: string,
  notification: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@hk-compass.vercel.app'

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    console.log('🔔 [DRY] Push to user:', userId, notification.title)
    return
  }

  // 获取用户的所有 push 订阅
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  // 动态导入 web-push (仅服务端)
  const webpush = await import('web-push')

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  for (const sub of subs) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: notification.tag,
          url: notification.url,
          requireInteraction: true,
        }),
      )
    } catch (err: any) {
      // 如果端点失效 (410 Gone)，清理订阅
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
      }
    }
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. 查询所有未触发的提醒 + 关联的比赛报名截止日期
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select(`
      id,
      remind_before,
      user_id,
      notified,
      competitions!inner (
        title,
        registration_deadline
      )
    `)
    .eq('notified', false)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No pending reminders' })
  }

  let sent = 0
  let skipped = 0

  for (const reminder of reminders) {
    const comp = reminder.competitions as any
    const deadline = comp?.registration_deadline
    if (!deadline) { skipped++; continue }

    // 检查是否应该触发
    if (!shouldTriggerNow(deadline, reminder.remind_before)) {
      skipped++
      continue
    }

    // 获取用户邮箱
    const { data: authUser } = await supabase.auth.admin.getUserById(reminder.user_id)
    const email = authUser?.user?.email
    if (!email) { skipped++; continue }

    // 获取用户语言偏好（从 profiles 表）
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', reminder.user_id)
      .maybeSingle()

    const displayName = profile?.display_name || email.split('@')[0]

    // 构建邮件
    const deadlineDate = new Date(deadline).toLocaleDateString('zh-HK', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    })

    const subject = `⏰ 【HK Compass】「${comp.title}」报名即将截止 — ${deadlineDate}`

    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
        <div style="background:#6366f1;color:white;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:20px">HK Compass</h1>
          <p style="margin:8px 0 0;opacity:0.9">你设置的报名提醒</p>
        </div>
        <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
          <p>Hi ${displayName}，</p>
          <p>你关注的比赛 <strong>「${comp.title}」</strong> 报名截止日期为：</p>
          <div style="background:white;border:2px solid #6366f1;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
            <span style="font-size:24px;color:#6366f1;font-weight:bold">${deadlineDate}</span>
          </div>
          <p>请在截止前完成报名，不要错过！</p>
          <a href="https://hk-compass.vercel.app/competition/${comp.id || ''}"
             style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:12px">
            查看比赛详情 →
          </a>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">
          <p style="font-size:12px;color:#94a3b8">
            本邮件由 HK Compass 自动发送。如需取消提醒，请登录网站管理。
          </p>
        </div>
      </div>
    `

    const success = await sendEmail(email, subject, html)

    // 同时发送 Push 通知
    await sendPushNotification(supabase, reminder.user_id, {
      title: '⏰ 报名即将截止',
      body: `「${comp.title}」截止日期: ${deadlineDate}`,
      url: `https://hk-compass.vercel.app/competition/${comp.id || ''}`,
      tag: `reminder-${reminder.id}`,
    })

    // 标记为已通知
    await supabase.from('reminders').update({ notified: true }).eq('id', reminder.id)

    if (success) sent++
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    total: reminders.length,
    timestamp: new Date().toISOString(),
  })
}

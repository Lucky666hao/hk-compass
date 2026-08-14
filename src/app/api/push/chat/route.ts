/**
 * 聊天消息推送
 *
 * 发送消息后由客户端调用（fire-and-forget）：
 *   - 给会话里除发送者外的所有参与者发 Web Push
 *   - 给每个接收者写一条 notifications 记录（type='chat'），让站内铃铛也能看到
 *
 * POST body: { conversation_id, content, image_url? }
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function sendPush(
  supabase: any,
  userId: string,
  notification: { title: string; body: string; url: string; tag: string },
) {
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@hk-compass.vercel.app'

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) return

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const webpush = await import('web-push')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
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
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { conversation_id, content, image_url } = await req.json()
    if (!conversation_id) {
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })
    }

    // 会话信息（群名 / 类型）
    const { data: conv } = await supabase
      .from('conversations')
      .select('type, name')
      .eq('id', conversation_id)
      .maybeSingle()

    // 发送者显示名
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()
    const senderName = sender?.display_name || 'Someone'

    // 会话内除发送者外的参与者（service role 绕过 RLS）
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .neq('user_id', user.id)

    const title = conv?.type === 'group' ? (conv?.name || '群组') : senderName
    const body = image_url ? '📷 [图片]' : (content || '新消息')
    const url = `https://hk-compass.vercel.app/chat`

    const recipients = (participants ?? []) as { user_id: string }[]
    for (const p of recipients) {
      // 站内通知
      await supabase.from('notifications').insert({
        user_id: p.user_id,
        type: 'chat',
        message: `${title}: ${body}`,
        link: '/chat',
      })
      // Web Push
      await sendPush(supabase, p.user_id, {
        title,
        body,
        url,
        tag: `chat-${conversation_id}`,
      })
    }

    return NextResponse.json({ ok: true, notified: recipients.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

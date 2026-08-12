/**
 * POST /api/feedback — 提交问题反馈 / 投诉
 * 任何人可提交（RLS: Anyone can insert feedback）
 * 提交后 best-effort 转发邮件到运营邮箱
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const FEEDBACK_EMAIL = 'ie3223268@gmail.com'
const SENDER_EMAIL = 'HK Compass <notifications@hk-compass.vercel.app>'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const CATEGORIES = ['投诉', '建议', '问题反馈', '其他']

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = String(body?.name ?? '').trim().slice(0, 100)
  const email = String(body?.email ?? '').trim().slice(0, 200)
  const category = CATEGORIES.includes(body?.category) ? body.category : '其他'
  const message = String(body?.message ?? '').trim()

  if (!message) {
    return NextResponse.json({ error: '反馈内容不能为空' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: '反馈内容过长' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 尝试识别登录用户（best-effort）
  let userId: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabase.auth.getUser(token)
    userId = data?.user?.id ?? null
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    name: name || null,
    email: email || null,
    category,
    message,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 邮件转发到运营邮箱（best-effort，失败不影响入库）
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: [FEEDBACK_EMAIL],
          subject: `📮 【HK Compass 反馈】${category} — ${name || email || '匿名'}`,
          html: [
            `<p><strong>类型：</strong>${escapeHtml(category)}</p>`,
            `<p><strong>姓名：</strong>${escapeHtml(name || '—')}</p>`,
            `<p><strong>邮箱：</strong>${escapeHtml(email || '—')}</p>`,
            `<p><strong>内容：</strong></p>`,
            `<pre style="white-space:pre-wrap;font-family:inherit;background:#f5f5f5;padding:12px;border-radius:8px">${escapeHtml(message)}</pre>`,
          ].join(''),
        }),
      })
    } catch {
      // 转发失败静默忽略
    }
  }

  return NextResponse.json({ ok: true })
}

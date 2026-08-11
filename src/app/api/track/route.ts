/**
 * POST /api/track — 记录页面访问
 * 无需认证，匿名访问也要记录
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const path = body.path || '/'

    const supabase = getServiceClient()

    const { error } = await supabase.from('page_views').insert({
      path,
      user_agent: req.headers.get('user-agent') || null,
      session_id: body.session_id || null,
    })

    if (error) {
      console.error('[track] insert error:', error.message)
      return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[track] unexpected error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/review/bulk — 批量审核（目前仅支持 approve）
 * body: { ids: string[], action: 'approve' }
 * 用于「爬虫采集」一键通过全部待审核比赛。批量通过不触发个性化推送（避免刷屏）。
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const { ids, action } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 })
  }
  if (action !== 'approve') {
    return NextResponse.json({ error: 'only approve is supported' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('competitions')
    .update({ review_status: 'approved', review_note: null, reviewed_at: now, reviewed_by: userId })
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: ids.length })
}

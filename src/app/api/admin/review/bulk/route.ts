/**
 * POST /api/admin/review/bulk — 批量审核/删除
 * body: { ids: string[], action: 'approve' | 'reject' | 'delete', note?: string }
 *   - approve: review_status='approved'，清空 note
 *   - reject:  review_status='rejected'，note 可填（批量驳回用统一理由，可空则用默认文案）
 *   - delete:  删除比赛（saved/reminders/reports/featured 均 CASCADE，recruitments SET NULL）
 * 批量通过/驳回不触发个性化推送（避免刷屏）。
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const { ids, action, note } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 })
  }
  if (!['approve', 'reject', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const now = new Date().toISOString()

  if (action === 'approve') {
    const { error } = await supabase
      .from('competitions')
      .update({ review_status: 'approved', review_note: null, reviewed_at: now, reviewed_by: userId })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: ids.length })
  }

  if (action === 'reject') {
    const noteText = (note && String(note).trim()) || '不符合收录标准'
    const { error } = await supabase
      .from('competitions')
      .update({ review_status: 'rejected', review_note: noteText, reviewed_at: now, reviewed_by: userId })
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: ids.length })
  }

  if (action === 'delete') {
    const { error } = await supabase.from('competitions').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: ids.length })
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}

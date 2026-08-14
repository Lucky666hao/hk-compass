/**
 * 比赛审核 API（管理员）
 *
 * POST /api/admin/review
 *   body: { id: string, action: 'approve' | 'reject' | 'needs_changes', note?: string }
 *   - approve:        review_status='approved'，清空 note
 *   - reject:         review_status='rejected'，note 必填
 *   - needs_changes:  review_status='needs_changes'，note 必填
 */

import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: { id?: string; action?: string; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, action, note } = body
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const now = new Date().toISOString()

  if (action === 'approve') {
    const { error } = await supabase
      .from('competitions')
      .update({ review_status: 'approved', review_note: null, reviewed_at: now, reviewed_by: userId })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 个性化推送：审核通过后，通知偏好匹配的用户（类型/地点命中）
    try {
      await notifyMatchingUsers(supabase, id)
    } catch {
      /* 推送失败不影响审核结果 */
    }

    return NextResponse.json({ ok: true, review_status: 'approved' })
  }

  if (action === 'reject' || action === 'needs_changes') {
    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Reject / needs_changes requires a note' }, { status: 400 })
    }
    const { error } = await supabase
      .from('competitions')
      .update({ review_status: action, review_note: note.trim(), reviewed_at: now, reviewed_by: userId })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, review_status: action })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/** 审核通过后：通知偏好匹配的用户（类型或地点命中） */
async function notifyMatchingUsers(
  supabase: ReturnType<typeof getAdminClient>,
  competitionId: string
) {
  const { data: comp } = await supabase
    .from('competitions')
    .select('type, location, title')
    .eq('id', competitionId)
    .single()
  if (!comp) return

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, preferences')
    .not('preferences', 'is', null)

  const matches = (profiles || []).filter((p) => {
    const prefs = p.preferences as { types?: string[]; locations?: string[] } | null
    if (!prefs) return false
    return (prefs.types || []).includes(comp.type) || (prefs.locations || []).includes(comp.location)
  })

  if (!matches.length) return

  const rows = matches.map((p) => ({
    user_id: p.user_id,
    type: 'competition_match',
    message: `新比赛上线：${comp.title}`,
    link: `/competition/${competitionId}`,
  }))
  await supabase.from('notifications').insert(rows)
}

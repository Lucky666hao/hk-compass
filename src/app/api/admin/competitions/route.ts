/**
 * 比赛管理 API（管理员）
 * GET    /api/admin/competitions?q=&status= — 列出比赛（关键词 + 状态筛选）
 * PATCH  /api/admin/competitions — 批量操作 { ids, action: 'terminate' }（标记已结束）
 * DELETE /api/admin/competitions — 批量删除 { ids }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const status = url.searchParams.get('status') || ''

  const supabase = getAdminClient()
  let query = supabase
    .from('competitions')
    .select('id, title, status, type, location, date_start, registration_deadline, source, review_status, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (q) {
    query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%,description.ilike.%${q}%`)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitions: data || [] })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { ids, action } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  if (action === 'terminate') {
    const { error } = await supabase.from('competitions').update({ status: '已结束' }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: ids.length })
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 })
  }

  const { error } = await getAdminClient().from('competitions').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: ids.length })
}

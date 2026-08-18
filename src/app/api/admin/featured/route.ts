/**
 * 首页推荐位管理 API（管理员）
 * GET    /api/admin/featured — 列出所有推荐位（附比赛标题/海报）
 * POST   /api/admin/featured — 新增 { competition_id?, title?, subtitle?, image_url?, link_url? }
 * PATCH  /api/admin/featured — 更新 { id, ...字段 }（含 sort_order / active）
 * DELETE /api/admin/featured — 删除 { id }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('featured_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = data || []
  const ids = items.filter((i) => i.competition_id).map((i) => i.competition_id)
  const compMap: Record<string, { title: string; poster_url: string | null }> = {}
  if (ids.length) {
    const { data: comps } = await supabase
      .from('competitions')
      .select('id, title, poster_url')
      .in('id', ids)
    ;(comps || []).forEach((c: any) => { compMap[c.id] = { title: c.title, poster_url: c.poster_url } })
  }

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      competition_title: compMap[i.competition_id]?.title ?? null,
      competition_poster: compMap[i.competition_id]?.poster_url ?? null,
    })),
  })
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { competition_id, title, subtitle, image_url, link_url } = await req.json()
  const supabase = getAdminClient()

  // 新项排到末尾
  const { data: maxRow } = await supabase
    .from('featured_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const sort_order = ((maxRow?.[0]?.sort_order ?? 0) + 1)

  const { error } = await supabase.from('featured_items').insert({
    competition_id: competition_id || null,
    title: title?.trim() || null,
    subtitle: subtitle?.trim() || null,
    image_url: image_url?.trim() || null,
    link_url: link_url?.trim() || null,
    sort_order,
    active: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const update: Record<string, any> = {}
  for (const k of ['competition_id', 'title', 'subtitle', 'image_url', 'link_url', 'sort_order', 'active']) {
    if (k in rest) update[k] = rest[k]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { error } = await getAdminClient().from('featured_items').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await getAdminClient().from('featured_items').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

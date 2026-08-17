/**
 * GET /api/admin/recruitments — 列出所有组队招募（含已关闭），附作者邮箱 + 关联比赛名
 * PATCH /api/admin/recruitments — 关闭/重新开启 { ids: string[], status: 'open' | 'closed' }
 * DELETE /api/admin/recruitments — 删除 { ids: string[] }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('recruitments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recruitments = await Promise.all(
    (data || []).map(async (r) => {
      let author_email: string | null = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(r.user_id)
        author_email = userData?.user?.email || null
      } catch {
        author_email = null
      }

      let competition_title: string | null = null
      if (r.competition_id) {
        const { data: comp } = await supabase
          .from('competitions')
          .select('title')
          .eq('id', r.competition_id)
          .maybeSingle()
        competition_title = comp?.title || null
      }

      return { ...r, author_email, competition_title }
    })
  )

  return NextResponse.json({ recruitments })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, ids, status } = await req.json()
  const targetIds: string[] = ids ?? (id ? [id] : [])
  if (targetIds.length === 0 || !['open', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'ids and valid status are required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('recruitments')
    .update({ status })
    .in('id', targetIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, ids } = await req.json()
  const targetIds: string[] = ids ?? (id ? [id] : [])
  if (targetIds.length === 0) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('recruitments')
    .delete()
    .in('id', targetIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

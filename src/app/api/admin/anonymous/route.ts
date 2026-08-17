/**
 * GET /api/admin/anonymous — 列出所有地下频道匿名帖（含已屏蔽），附作者邮箱
 * PATCH /api/admin/anonymous — 屏蔽/恢复 { ids: string[], status: 'published' | 'hidden' }
 * DELETE /api/admin/anonymous — 删除 { ids: string[] }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('anonymous_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const posts = await Promise.all(
    (data || []).map(async (post) => {
      let author_email: string | null = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(post.user_id)
        author_email = userData?.user?.email || null
      } catch {
        author_email = null
      }
      return { ...post, author_email }
    })
  )

  return NextResponse.json({ posts })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, ids, status } = await req.json()
  const targetIds: string[] = ids ?? (id ? [id] : [])
  if (targetIds.length === 0 || !['published', 'hidden'].includes(status)) {
    return NextResponse.json({ error: 'ids and valid status are required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('anonymous_posts')
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
  // 关联的 votes/reactions/comments 均有 ON DELETE CASCADE，自动清理
  const { error } = await supabase
    .from('anonymous_posts')
    .delete()
    .in('id', targetIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

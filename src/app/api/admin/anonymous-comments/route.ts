/**
 * GET /api/admin/anonymous-comments — 列出所有地下频道匿名评论（含已屏蔽），附作者邮箱 + 帖子标题
 * PATCH /api/admin/anonymous-comments — 屏蔽/恢复 { ids: string[], status: 'published' | 'hidden' }
 * DELETE /api/admin/anonymous-comments — 删除 { ids: string[] }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('anonymous_post_comments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const comments = data || []

  // 批量取帖子标题
  const postIds = [...new Set(comments.map((c) => c.post_id))]
  const { data: posts } = postIds.length
    ? await supabase.from('anonymous_posts').select('id, title').in('id', postIds)
    : { data: [] }
  const titleMap: Record<string, string> = {}
  ;(posts || []).forEach((p: any) => { titleMap[p.id] = p.title })

  const enriched = await Promise.all(
    comments.map(async (c) => {
      let author_email: string | null = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(c.user_id)
        author_email = userData?.user?.email || null
      } catch {
        author_email = null
      }
      return { ...c, author_email, post_title: titleMap[c.post_id] || null }
    })
  )

  return NextResponse.json({ comments: enriched })
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
    .from('anonymous_post_comments')
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
    .from('anonymous_post_comments')
    .delete()
    .in('id', targetIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

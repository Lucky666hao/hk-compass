/**
 * GET /api/admin/posts — 列出所有帖子（含已屏蔽），附作者邮箱/评论数/举报数
 * PATCH /api/admin/posts — 屏蔽/恢复帖子 { ids: string[], status: 'published' | 'hidden' }
 * DELETE /api/admin/posts — 删除帖子 { ids: string[] }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 附上作者邮箱 + 评论数 + 举报数，方便管理员审核排序
  const posts = await Promise.all(
    (data || []).map(async (post) => {
      let author_email: string | null = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(post.user_id)
        author_email = userData?.user?.email || null
      } catch {
        author_email = null
      }

      const [{ count: commentCount }, { count: reportCount }] = await Promise.all([
        supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('post_reports').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      ])

      return {
        ...post,
        author_email,
        comment_count: commentCount ?? 0,
        report_count: reportCount ?? 0,
      }
    })
  )

  return NextResponse.json({ posts })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, ids, status, reason } = await req.json()
  const targetIds: string[] = ids ?? (id ? [id] : [])
  if (targetIds.length === 0 || !['published', 'hidden'].includes(status)) {
    return NextResponse.json({ error: 'ids and valid status are required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('posts')
    .update({ status })
    .in('id', targetIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 屏蔽时给发帖人发一条违规通知（管理员填的 reason 即违规原因）
  if (status === 'hidden' && reason && String(reason).trim()) {
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, title, user_id')
      .in('id', targetIds)

    const reasonText = String(reason).trim()
    for (const p of postsData || []) {
      if (!p.user_id) continue
      await supabase.from('notifications').insert({
        user_id: p.user_id,
        type: 'moderation',
        message: `你的帖子「${(p.title || '').slice(0, 30)}」因违反社区规范已被屏蔽：${reasonText}`,
        link: `/posts/${p.id}`,
        related_post_id: p.id,
      })
    }
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
  // 关联的 votes/reactions/saved/reports/comments 均有 ON DELETE CASCADE，自动清理
  const { error } = await supabase
    .from('posts')
    .delete()
    .in('id', targetIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

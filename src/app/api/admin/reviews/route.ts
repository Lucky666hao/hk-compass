/**
 * GET /api/admin/reviews — 列出所有课程评价（含已屏蔽），附作者邮箱
 * PATCH /api/admin/reviews — 屏蔽/恢复 { id, status: 'published' | 'hidden' }
 * DELETE /api/admin/reviews — 删除 { id }
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('course_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reviews = await Promise.all(
    (data || []).map(async (review) => {
      let author_email: string | null = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(review.user_id)
        author_email = userData?.user?.email || null
      } catch {
        author_email = null
      }
      return { ...review, author_email }
    })
  )

  return NextResponse.json({ reviews })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, status } = await req.json()
  if (!id || !['published', 'hidden'].includes(status)) {
    return NextResponse.json({ error: 'id and valid status are required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('course_reviews')
    .update({ status })
    .eq('id', id)

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

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('course_reviews')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

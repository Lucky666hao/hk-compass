/**
 * GET /api/admin/reports — 获取举报列表（帖子 + 课程评价）
 * PATCH /api/admin/reports — 更新举报状态
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

const VALID_STATUS = ['pending', 'reviewed', 'resolved', 'dismissed']

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()

  const [postRes, reviewRes, compRes] = await Promise.all([
    supabase.from('post_reports').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('course_review_reports').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('competition_reports').select('*').order('created_at', { ascending: false }).limit(100),
  ])

  const err = postRes.error || reviewRes.error || compRes.error
  if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  // 为课程评价举报补全被举报评价的上下文（课程名 / 学校）
  const reviewReports = (reviewRes.data || []).map((r) => ({ ...r, type: 'review' }))
  const reviewIds = [...new Set(reviewReports.map((r) => r.review_id))]
  let reviewMap = new Map<string, any>()
  if (reviewIds.length > 0) {
    const { data: reviews } = await supabase
      .from('course_reviews')
      .select('id, course_name, course_code, university_slug')
      .in('id', reviewIds)
    reviewMap = new Map((reviews || []).map((r) => [r.id, r]))
  }

  // 为比赛纠错举报补全被举报比赛的标题
  const compReports = (compRes.data || []).map((r) => ({ ...r, type: 'competition' }))
  const compIds = [...new Set(compReports.map((r) => r.competition_id))]
  let compMap = new Map<string, any>()
  if (compIds.length > 0) {
    const { data: comps } = await supabase
      .from('competitions')
      .select('id, title')
      .in('id', compIds)
    compMap = new Map((comps || []).map((c) => [c.id, c]))
  }

  const all = [
    ...(postRes.data || []).map((r) => ({ ...r, type: 'post' })),
    ...reviewReports.map((r) => ({ ...r, course: reviewMap.get(r.review_id) || null })),
    ...compReports.map((r) => ({ ...r, competition: compMap.get(r.competition_id) || null })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Enrich with reporter emails
  const reports = await Promise.all(
    all.map(async (report) => {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(report.reporter_id)
        return { ...report, reporter_email: userData?.user?.email || null }
      } catch {
        return { ...report, reporter_email: null }
      }
    })
  )

  return NextResponse.json({ reports })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, status, type } = await req.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
  }
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const table =
    type === 'review' ? 'course_review_reports'
    : type === 'competition' ? 'competition_reports'
    : 'post_reports'
  const supabase = getAdminClient()
  const { error } = await supabase.from(table).update({ status }).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

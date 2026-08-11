/**
 * GET /api/admin/reports — 获取举报列表
 * PATCH /api/admin/reports — 更新举报状态
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  // Join with auth.users to get reporter email
  const { data, error } = await supabase
    .from('post_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with reporter emails
  const reportsWithEmails = await Promise.all(
    (data || []).map(async (report) => {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(report.reporter_id)
        return { ...report, reporter_email: userData?.user?.email || null }
      } catch {
        return { ...report, reporter_email: null }
      }
    })
  )

  return NextResponse.json({ reports: reportsWithEmails })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const { id, status } = await req.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
  }
  if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('post_reports')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

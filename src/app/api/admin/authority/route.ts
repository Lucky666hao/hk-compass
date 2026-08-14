/**
 * 权威/含金量标签 API（管理员）
 *
 * POST /api/admin/authority
 *   body: { id: string, authority: string | null }
 *   authority 为 null 表示清除标签
 */

import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

const VALID = ['官方主办', '高含金量', '国际赛事', '校级认证']

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  let body: { id?: string; authority?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, authority } = body
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  if (authority != null && !VALID.includes(authority)) {
    return NextResponse.json({ error: 'Invalid authority tag' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('competitions')
    .update({ authority: authority ?? null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, authority: authority ?? null })
}

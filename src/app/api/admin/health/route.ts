/**
 * GET /api/admin/health — 比赛数据健康检查
 * 管理员认证后调用，返回 4 项数据质量指标
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  const supabase = getAdminClient()
  const now = new Date().toISOString()

  // 1. 过期未标记
  const { count: expiredCount, data: expiredData } = await supabase
    .from('competitions')
    .select('id, title, registration_deadline, date_end, status', { count: 'exact' })
    .neq('status', '已结束')
    .or(`registration_deadline.lt.${now},date_end.lt.${now}`)
    .limit(20)

  // 2. 大陆限制未标记
  const { count: mainlandCount, data: mainlandData } = await supabase
    .from('competitions')
    .select('id, title, description, eligibility', { count: 'exact' })
    .neq('status', '已结束')
    .or('description.ilike.%大陆%,description.ilike.%内地%,description.ilike.%国内高校%,description.ilike.%中国公民%,description.ilike.%全国大学生%,description.ilike.%全国高校%')
    .not('description', 'ilike', '%仅限中国内地院校%')
    .limit(20)

  // 3. 大学关联缺失（title 或 organizer 含 HK 大学关键词但 target_universities 为空）
  const { count: uniCount, data: uniData } = await supabase
    .from('competitions')
    .select('id, title, organizer', { count: 'exact' })
    .is('target_universities', null)
    .neq('status', '已结束')
    .or('title.ilike.%香港%,title.ilike.%大學%,title.ilike.%大学%,organizer.ilike.%香港%,organizer.ilike.%大學%,organizer.ilike.%大学%')
    .limit(20)

  // 4. 无日期比赛
  const { count: noDatesCount, data: noDatesData } = await supabase
    .from('competitions')
    .select('id, title, date_start', { count: 'exact' })
    .is('registration_deadline', null)
    .is('date_end', null)
    .limit(20)

  const statusLabel = (count: number): 'ok' | 'warn' | 'error' =>
    count === 0 ? 'ok' : count <= 5 ? 'warn' : 'error'

  return NextResponse.json({
    expired: {
      count: expiredCount || 0,
      status: statusLabel(expiredCount || 0),
      samples: (expiredData || []).slice(0, 5),
    },
    mainland: {
      count: mainlandCount || 0,
      status: statusLabel(mainlandCount || 0),
      samples: (mainlandData || []).slice(0, 5),
    },
    uniMissing: {
      count: uniCount || 0,
      status: statusLabel(uniCount || 0),
      samples: (uniData || []).slice(0, 5),
    },
    noDates: {
      count: noDatesCount || 0,
      status: 'warn', // 17条无日期，始终 warn（体育赛事天然无截止日）
      samples: (noDatesData || []).slice(0, 5),
    },
    checkedAt: now,
  })
}

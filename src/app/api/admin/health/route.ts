/**
 * GET /api/admin/health — 比赛数据健康检查
 * 管理员认证后调用，返回 4 项数据质量指标
 */
import { NextResponse } from 'next/server'
import { requireAdmin, getAdminClient } from '@/lib/admin-guard'
import { HK_UNIVERSITIES, matchUniversity } from '@/lib/university-data'

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

  // 2. 大陆限制未标记 — 先粗筛描述含大陆关键词，再排除「香港/台湾/澳门」多地区征稿的比赛
  const { data: mainlandCandidates } = await supabase
    .from('competitions')
    .select('id, title, description, eligibility')
    .neq('status', '已结束')
    .or('description.ilike.%大陆%,description.ilike.%内地%,description.ilike.%国内高校%,description.ilike.%中国公民%,description.ilike.%全国大学生%,description.ilike.%全国高校%')
    .not('description', 'ilike', '%仅限中国内地院校%')
    .limit(500)

  const mainlandList = (mainlandCandidates || []).filter((c: any) => {
    const text = `${c.title || ''} ${c.description || ''}`
    return !['香港', '台湾', '澳門', '澳门'].some((kw) => text.includes(kw))
  })

  // 3. 大学关联缺失 — 用精确大学关键词（HKU/港大/香港大学…）匹配，避免「大学」「大学生」宽泛词误报大陆比赛
  const { data: uniCandidates } = await supabase
    .from('competitions')
    .select('id, title, organizer, target_universities')
    .neq('status', '已结束')
    .is('target_universities', null)
    .limit(500)

  const uniMissingList = (uniCandidates || []).filter((c: any) =>
    HK_UNIVERSITIES.some((u) => matchUniversity(c.title, c.organizer, u))
  )

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
      count: mainlandList.length,
      status: statusLabel(mainlandList.length),
      samples: mainlandList.slice(0, 5),
    },
    uniMissing: {
      count: uniMissingList.length,
      status: statusLabel(uniMissingList.length),
      samples: uniMissingList.slice(0, 5),
    },
    noDates: {
      count: noDatesCount || 0,
      status: statusLabel(noDatesCount || 0),
      samples: (noDatesData || []).slice(0, 5),
    },
    checkedAt: now,
  })
}

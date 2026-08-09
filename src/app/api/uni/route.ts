/**
 * GET /api/uni — 按大学分组的比赛列表
 * 可传 ?uni=hku 筛选单所大学
 *
 * 数据来源：文本匹配 title/organizer（target_universities 列建好后自动切换）
 */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { HK_UNIVERSITIES, matchUniversity } from '@/lib/university-data'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const uniSlug = searchParams.get('uni')  // 可选：筛选特定大学

  const supabase = getAdminClient()

  // 获取所有未结束的比赛
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('id, title, title_en, type, organizer, fee_type, prize, date_start, date_end, registration_deadline, location, venue, team_size, registration_link, source_url, description, status, target_universities')
    .neq('status', '已结束')
    .order('date_start', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 按大学归类
  const result: Record<string, {
    info: typeof HK_UNIVERSITIES[0]
    competitions: typeof competitions
    count: number
  }> = {}

  for (const uni of HK_UNIVERSITIES) {
    if (uniSlug && uni.slug !== uniSlug) continue

    const uniComps = (competitions || []).filter((c) => {
      // 优先用 target_universities 列
      if (c.target_universities && Array.isArray(c.target_universities)) {
        return c.target_universities.includes(uni.slug.toUpperCase())
      }
      // 兜底：文本匹配
      return matchUniversity(c.title, c.organizer, uni)
    })

    result[uni.slug] = {
      info: uni,
      competitions: uniComps,
      count: uniComps.length,
    }
  }

  return NextResponse.json({
    universities: result,
    totalUniversities: Object.keys(result).length,
    totalCompetitions: (competitions || []).length,
  })
}

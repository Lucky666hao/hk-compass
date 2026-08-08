// @ts-nocheck
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const { data: all, count } = await supabase.from('competitions').select('*', { count: 'exact' })
  console.log(`=== 数据库总数: ${count} ===\n`)

  // 按状态分组
  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}
  for (const c of all || []) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1
    byType[c.type] = (byType[c.type] || 0) + 1
  }
  console.log('状态分布:')
  for (const [s, n] of Object.entries(byStatus)) console.log(`  ${s}: ${n}`)

  console.log('\n类型分布:')
  for (const [t, n] of Object.entries(byType)) console.log(`  ${t}: ${n}`)

  // 无 source_url
  const noSource = (all || []).filter((c: any) => !c.source_url)
  console.log(`\n⚠️  无 source_url: ${noSource.length}`)
  if (noSource.length > 0) noSource.forEach((c: any) => console.log(`  - ${c.title}`))

  // 活跃比赛
  const active = (all || []).filter((c: any) => c.status !== '已结束')
  console.log(`\n🔥 活跃比赛 (${active.length}):`)
  for (const c of active) {
    const dl = c.registration_deadline ? c.registration_deadline.slice(0, 10) : '无'
    console.log(`  [${c.type}] ${c.title} | ${c.status} | deadline: ${dl}`)
  }

  // 检查即将截止的（7天内）
  const now = Date.now()
  const weekLater = now + 7 * 24 * 60 * 60 * 1000
  const urgent = (all || []).filter((c: any) => {
    if (!c.registration_deadline || c.status === '已结束') return false
    const dl = new Date(c.registration_deadline).getTime()
    return dl > now && dl < weekLater
  })
  console.log(`\n⏰ 即将截止 (7天内): ${urgent.length}`)
  for (const c of urgent) {
    const days = Math.ceil((new Date(c.registration_deadline).getTime() - now) / (24 * 60 * 60 * 1000))
    console.log(`  [${days}天] ${c.title} — ${c.registration_deadline?.slice(0, 10)}`)
  }

  // 检查是否有registration_deadline已过但status还是"报名中"的
  const staleActive = (all || []).filter((c: any) => {
    if (c.status !== '报名中' || !c.registration_deadline) return false
    return new Date(c.registration_deadline).getTime() < now
  })
  console.log(`\n🔴 报名截止已过但仍显示「报名中」: ${staleActive.length}`)
  for (const c of staleActive) {
    console.log(`  - ${c.title} (deadline: ${c.registration_deadline?.slice(0, 10)})`)
  }
}

main()

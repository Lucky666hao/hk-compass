/**
 * 清理过期比赛 + 报告当前状态
 * 运行: npx tsx scripts/clean-expired.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const now = new Date().toISOString()
  const today = now.substring(0, 10)
  console.log('Today:', today)
  console.log('')

  // 1. Count total
  const { count: total } = await s.from('competitions').select('id', { count: 'exact', head: true })

  // 2. Count expired (registration_deadline < now)
  const { count: expired } = await s.from('competitions').select('id', { count: 'exact', head: true }).lt('registration_deadline', now)

  // 3. Count no deadline (这些可能是日期格式不对的)
  const { count: noDeadline } = await s.from('competitions').select('id', { count: 'exact', head: true }).is('registration_deadline', null)

  console.log(`总数: ${total}`)
  console.log(`已过期 (截止 < ${today}): ${expired}`)
  console.log(`无截止日期: ${noDeadline}`)

  // 4. Show expired samples
  if (expired && expired > 0) {
    const { data: expiredList } = await s.from('competitions')
      .select('title,registration_deadline')
      .lt('registration_deadline', now)
      .order('registration_deadline', { ascending: false })
      .limit(20)

    console.log('\n过期比赛示例:')
    for (const e of expiredList || []) {
      console.log(`  ${e.registration_deadline?.toString().substring(0,10)} | ${(e.title || '').substring(0,55)}`)
    }

    // 5. Delete expired
    console.log(`\n🗑 正在删除 ${expired} 条过期记录...`)
    const { error: delErr } = await s.from('competitions').delete().lt('registration_deadline', now)
    if (delErr) {
      console.log('删除失败:', delErr.message)
    } else {
      console.log('✅ 过期记录已删除')
    }
  }

  // 6. Final count
  const { count: final } = await s.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`\n📦 清理后数据库总计: ${final} / 1000`)

  // 7. Distribution by type
  const { data: types } = await s.from('competitions').select('type')
  if (types) {
    const dist: Record<string, number> = {}
    for (const t of types) dist[t.type] = (dist[t.type] || 0) + 1
    console.log('\n类型分布:')
    for (const [k, v] of Object.entries(dist).sort((a,b) => b[1]-a[1])) {
      console.log(`  ${k}: ${v}`)
    }
  }

  // 8. Fee type distribution
  const { data: fees } = await s.from('competitions').select('fee_type')
  if (fees) {
    const dist2: Record<string, number> = {}
    for (const f of fees) dist2[f.fee_type] = (dist2[f.fee_type] || 0) + 1
    console.log('\n费用类型分布:')
    for (const [k, v] of Object.entries(dist2).sort((a,b) => b[1]-a[1])) {
      console.log(`  ${k}: ${v}`)
    }
  }

  // 9. Status distribution
  const { data: statuses } = await s.from('competitions').select('status')
  if (statuses) {
    const dist3: Record<string, number> = {}
    for (const st of statuses) dist3[st.status || 'NULL'] = (dist3[st.status || 'NULL'] || 0) + 1
    console.log('\n状态分布:')
    for (const [k, v] of Object.entries(dist3).sort((a,b) => b[1]-a[1])) {
      console.log(`  ${k}: ${v}`)
    }
  }

  console.log('\n✅ 清理完成')
}

main().catch(console.error)

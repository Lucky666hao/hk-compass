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
  const now = new Date().toISOString()

  // 1. 更新过期报名状态
  const { data: expired } = await supabase
    .from('competitions')
    .select('id,title,status,registration_deadline')
    .neq('status', '已结束')
    .not('registration_deadline', 'is', null)
    .lt('registration_deadline', now)

  if (expired && expired.length > 0) {
    const ids = expired.map((e: any) => e.id)
    await supabase.from('competitions').update({ status: '已结束' }).in('id', ids)
    console.log(`✅ 標記為「已結束」: ${expired.length} 條`)
    for (const e of expired) {
      console.log(`   - ${e.title} (deadline: ${e.registration_deadline?.slice(0, 10)})`)
    }
  }

  // 2. 統計
  const { data: all, count } = await supabase
    .from('competitions')
    .select('status', { count: 'exact' })

  const byStatus: Record<string, number> = {}
  for (const c of all || []) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1
  }
  console.log(`\n=== 總計: ${count} 條 ===`)
  for (const [s, n] of Object.entries(byStatus)) {
    console.log(`  ${s}: ${n}`)
  }

  // active count (not 已结束)
  const active = (all || []).filter((c: any) => c.status !== '已结束').length
  console.log(`\n🔥 活躍比賽: ${active} (報名中 + 即將開始 + 進行中)`)
}

main()

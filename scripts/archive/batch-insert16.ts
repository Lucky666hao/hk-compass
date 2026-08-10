/**
 * 批量入库第16轮 — 亚太青年设计/大学创新
 * 运行: npx tsx scripts/batch-insert16.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const comps = [
  // === 亚太设计 ===
  {title:'2026亞太青年藝術設計大賽', title_en:'2026 Asia-Pacific Youth Art & Design Competition', type:'创意摄影设计', date_start:'2026-04-25', date_end:'2026-12-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', organizer:'亞太青年設計師協會', source:'52shejisai', source_url:'http://www.52shejisai.com/7744.html', age_group:'成人公开', team_size:'2-3人'},

  // === 大学创新 ===
  {title:'HSUHK Innovation Project Competition 2026', title_en:'恒生大學創新項目競賽2026', type:'创业路演', date_start:'2026-09-01', registration_deadline:'2026-10-31', location:'新界', fee_type:'有奖金', organizer:'香港恒生大學', source:'HSUHK', source_url:'https://teaching-and-learning.hsu.edu.hk/student/hsuhk-innovation-project-competition/', age_group:'成人公开', team_size:'不限'},

  // === 本地比赛 ===
  {title:'Post to Compete 2026 香港短片創作比賽', title_en:'Post to Compete HK Short Film Contest 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'有奖金', source:'PostToCompete', source_url:'https://posttocompete.hk/%e6%a2%9d%e6%ac%be%e5%8f%8a%e7%b4%b0%e5%89%87/', age_group:'不限', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第16轮: ${comps.length} 个比赛\n`)
  let added = 0, skipped = 0, failed = 0

  for (const c of comps) {
    const { data: exist } = await s.from('competitions').select('id').eq('source_url', c.source_url).maybeSingle()
    if (exist) { skipped++; continue }

    const { error } = await s.from('competitions').insert({
      ...c,
      description: null,
      eligibility: '不限',
      status: '报名中',
    })

    if (error) {
      console.log(`❌ ${c.title.substring(0, 50)} — ${error.message}`)
      failed++
    } else {
      console.log(`✅ [${c.type}] ${c.title}`)
      added++
    }
  }

  console.log(`\n✅ 新增: ${added} | ⏭ 跳过: ${skipped} | ❌ 失败: ${failed}`)
  const { count } = await s.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count} / 1000`)
}

main().catch(console.error)

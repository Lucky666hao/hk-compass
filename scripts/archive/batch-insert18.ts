/**
 * 批量入库第18轮 — 国际文学+更多
 * 运行: npx tsx scripts/batch-insert18.ts
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
  // === 国际文学 ===
  {title:'2026國際青年文學創作大賽（夏季賽）', title_en:'2026 International Youth Literature Contest Summer', type:'其他', date_start:'2026-06-28', registration_deadline:'2026-08-28', location:'线上', fee_type:'免费', organizer:'亞太青年發展協會', source:'APYDA', source_url:'https://apyda.hk/1929.html', age_group:'不限', team_size:'个人赛'},
]

async function main() {
  console.log(`📋 批量入库第18轮: ${comps.length} 个比赛\n`)
  let added = 0, skipped = 0, failed = 0
  for (const c of comps) {
    const { data: exist } = await s.from('competitions').select('id').eq('source_url', c.source_url).maybeSingle()
    if (exist) { skipped++; continue }
    const { error } = await s.from('competitions').insert({...c, description:null, eligibility:'不限', status:'报名中'})
    if (error) { console.log('❌', c.title, '-', error.message); failed++ }
    else { console.log('✅', c.title); added++ }
  }
  console.log(`\n✅ ${added} | ⏭ ${skipped} | ❌ ${failed}`)
  const { count } = await s.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 ${count} / 1000`)
}
main().catch(console.error)

/**
 * 批量入库第10轮 — PaoBaoDao越野赛 + 中国学科竞赛
 * 运行: npx tsx scripts/batch-insert10.ts
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
  // === PaoBaoDao 越野/跑步 (2026年9-12月) ===
  {title:'2026香港水陸兩項錦標賽', title_en:'2026 Hong Kong Aquathlon Championships', type:'运动', date_start:'2026-10-11', registration_deadline:'2026-09-23', location:'新界', venue:'黃金泳灘', fee_type:'付费', organizer:'中國香港三項鐵人總會', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/hong-kong-aquathlon-championships/', age_group:'不限', team_size:'个人赛'},
  {title:'Protrek麥理浩徑熱身賽2026', title_en:'Protrek MacLehose Trail Warm-up 2026', type:'运动', date_start:'2026-10-10', registration_deadline:'2026-09-15', location:'新界', venue:'麥理浩徑', fee_type:'付费', organizer:'Protrek', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/protrek-maclehose-trail-warm-up-race/', age_group:'不限', team_size:'个人赛'},
  {title:'TTR Charity Run 越野童樂慈善賽2026', title_en:'TTR Charity Trail Run 2026', type:'运动', date_start:'2026-10-17', date_end:'2026-10-18', registration_deadline:'2026-09-30', location:'新界', venue:'新界東北', fee_type:'付费', organizer:'TTR', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/ttr-charity-run/', age_group:'不限', team_size:'个人赛'},
  {title:'HK Wild 70 越野賽2026', title_en:'HK Wild 70 Trail Race 2026', type:'运动', date_start:'2026-10-31', registration_deadline:'2026-10-15', location:'新界', venue:'大埔頭', fee_type:'付费', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/en/race/hk-wild/', age_group:'不限', team_size:'个人赛'},
  {title:'HKSOS×Sowers Action Challenging 12 Hours 2026', title_en:'HKSOS×苗圃挑戰12小時2026', type:'运动', date_start:'2026-11-01', registration_deadline:'2026-10-15', location:'新界', fee_type:'付费', organizer:'苗圃行動', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/en/race/hksos-x-sowers-action-challenging-12-hours/', age_group:'不限', team_size:'不限'},

  // === 中国学科竞赛 ===
  {title:'2026第六屆全國大學生人工智能知識競賽', type:'AI创作', date_start:'2026-09-01', date_end:'2026-12-31', registration_deadline:'2026-12-31', location:'线上', fee_type:'免费', source:'赛氪', source_url:'https://m.saikr.com/vse/AIKNOW2026', age_group:'成人公开', team_size:'个人赛'},

]

async function main() {
  console.log(`📋 批量入库第10轮: ${comps.length} 个比赛\n`)
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

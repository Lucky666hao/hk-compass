/**
 * 批量入库第15轮 — 香港运动日/匹克球/迷你四驱车
 * 运行: npx tsx scripts/batch-insert15.ts
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
  // === HK跑步/三项 ===
  {title:'第23屆PEGASUS荃灣10K超級夏日挑戰賽2026', title_en:'23rd PEGASUS Tsuen Wan 10K Summer Challenge 2026', type:'运动', date_start:'2026-08-30', registration_deadline:'2026-08-23', location:'新界', venue:'荃灣', fee_type:'付费', organizer:'PEGASUS', source:'Fitz', source_url:'https://fitz.hk/events/20260830-%e7%ac%ac23%e5%b1%86-pegasus-%e8%8d%83%e7%81%a3-10k-%e8%b6%85%e7%b4%9a%e5%a4%8f%e6%97%a5%e6%8c%91%e6%88%b0%e8%b3%bd/', age_group:'不限', team_size:'个人赛'},
  {title:'2026夏季鐵人三項挑戰賽', title_en:'2026 Summer Triathlon Challenge', type:'运动', date_start:'2026-09-06', registration_deadline:'2026-08-30', location:'新界', fee_type:'付费', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/summer-triathlon-challenge/', age_group:'不限', team_size:'个人赛'},
  {title:'2026水陸兩項系列賽（第4場）', title_en:'2026 Aquathlon Series Race 4', type:'运动', date_start:'2026-10-04', registration_deadline:'2026-09-20', location:'新界', fee_type:'付费', organizer:'中國香港三項鐵人總會', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/aquathlon-series-race-4/', age_group:'不限', team_size:'个人赛'},

  // === HK特色比赛 ===
  {title:'城市運動錦標賽—匹克球擂台賽2026', title_en:'City Sports Pickleball Challenge 2026', type:'运动', date_start:'2026-08-28', registration_deadline:'2026-08-27', location:'新界', fee_type:'免费', organizer:'香港賽馬會', source:'JCFitCity', source_url:'https://jcfitcity.hk/zh-Hant/event/Pickleball-Challenge-Court-Competition-HKPA-2026082803', age_group:'不限', team_size:'不限'},
  {title:'Hong Kong Cup 2026 田宮迷你四驅車世界賽港澳選拔賽', title_en:'Tamiya Mini 4WD HK Cup 2026', type:'其他', date_start:'2026-09-15', registration_deadline:'2026-09-01', location:'新界', venue:'荃灣廣場', fee_type:'付费', organizer:'田宮', source:'Tamiya', source_url:'https://tamiya.hk/product/hkc-2026-s3/', age_group:'不限', team_size:'不限'},

  // === 越野跑 ===
  {title:'Merry-Run-Round 越野賽2026', title_en:'Merry-Run-Round Trail Race 2026', type:'运动', date_start:'2026-10-25', registration_deadline:'2026-10-10', location:'新界', fee_type:'付费', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/en/race/merry-run-round/', age_group:'不限', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第15轮: ${comps.length} 个比赛\n`)
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

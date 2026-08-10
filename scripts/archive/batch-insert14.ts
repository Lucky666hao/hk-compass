/**
 * 批量入库第14轮 — HK单车节/视觉艺术/越野跑
 * 运行: npx tsx scripts/batch-insert14.ts
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
  // === HK单车 ===
  {title:'新鴻基地產香港單車節2026', title_en:'SHKP Hong Kong Cyclothon 2026', type:'运动', date_start:'2026-10-11', registration_deadline:'2026-09-15', location:'新界', fee_type:'付费', organizer:'香港旅遊發展局', source:'HKTB', source_url:'https://www.discoverhongkong.com/eng/what-s-new/events/cyclothon/', age_group:'不限', team_size:'不限'},

  // === HK越野 ===
  {title:'Barclays MoonTrekker 越野夜賽2026', title_en:'Barclays MoonTrekker Night Trail 2026', type:'运动', date_start:'2026-10-30', date_end:'2026-10-31', registration_deadline:'2026-09-30', location:'新界', venue:'大嶼山', fee_type:'付费', organizer:'Barclays', source:'MoonTrekker', source_url:'https://www.barclaysmoontrekker.com/info', age_group:'不限', team_size:'不限'},

  // === HKVAA (新URL) ===
  {title:'第二屆HKVAA香港視覺藝術獎2026', title_en:'2nd HKVAA Hong Kong Visual Art Award 2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-10-16', location:'线上', fee_type:'付费', organizer:'香港視覺藝術中心', source:'HKVAA', source_url:'https://www.cnchuangsai.com/58310.html', age_group:'不限', team_size:'不限'},

  // === 学界 ===
  {title:'全港學界足球精英賽2026-27', type:'运动', date_start:'2026-10-01', registration_deadline:'2026-09-30', location:'新界', fee_type:'免费', organizer:'香港學界體育聯會', source:'HKSSF', source_url:'https://www.hkssf-hk.org.hk/', age_group:'青少年', team_size:'7人以上'},
  {title:'全港學界羽毛球精英賽2026-27', type:'运动', date_start:'2026-10-15', registration_deadline:'2026-09-30', location:'港岛', fee_type:'免费', organizer:'香港學界體育聯會', source:'HKSSF', source_url:'https://www.hkssf-nt.org.hk/', age_group:'青少年', team_size:'个人赛'},

  // === 中国大学生 ===
  {title:'第六屆全國大學生集成電路創新創業大賽2026', title_en:'6th National IC Innovation Contest 2026', type:'创业路演', date_start:'2026-01-01', registration_deadline:'2026-12-31', location:'线上', fee_type:'付费', organizer:'工信部人才交流中心', source:'集成电路大赛', source_url:'http://univ.ciciec.com/', age_group:'成人公开', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第14轮: ${comps.length} 个比赛\n`)
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

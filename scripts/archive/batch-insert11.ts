/**
 * 批量入库第11轮 — 网络安全竞赛 + 大学生竞赛
 * 运行: npx tsx scripts/batch-insert11.ts
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
  // === 网络安全竞赛 (未来截止) ===
  {title:'第五屆中國研究生網絡安全創新大賽2026', title_en:'5th China Graduate Cybersecurity Innovation Contest 2026', type:'AI创作', date_start:'2026-09-01', date_end:'2026-12-27', registration_deadline:'2026-10-18', location:'线上', fee_type:'付费', organizer:'中國學位與研究生教育學會', source:'CPIPC', source_url:'https://cpipc.acge.org.cn/', age_group:'成人公开', team_size:'不限'},
  {title:'第九屆西湖論劍中國杭州網絡安全技能大賽2026', title_en:'9th West Lake Cyber Security Contest 2026', type:'AI创作', date_start:'2026-08-21', registration_deadline:'2026-08-10', location:'线上', fee_type:'免费', organizer:'杭州市政府', source:'西湖论剑', source_url:'https://www.hangzhou.gov.cn/col/col812266/art/2026/art_483d44943a4f4b898e1998389d4ee3b0.html', age_group:'成人公开', team_size:'不限'},
  // === HK 学界体育 ===
  {title:'全港學界籃球馬拉松2026', type:'运动', date_start:'2026-09-01', registration_deadline:'2026-09-15', location:'港岛', fee_type:'免费', organizer:'香港學界體育聯會', source:'HKSSF', source_url:'https://www.hkssf.org.hk/', age_group:'青少年', team_size:'7人以上'},
  {title:'全港學界游泳錦標賽2026-27', type:'运动', date_start:'2026-10-01', registration_deadline:'2026-09-30', location:'港岛', venue:'九龍公園游泳池', fee_type:'免费', organizer:'香港學界體育聯會', source:'HKSSF', source_url:'https://www.hkssf-nt.org.hk/', age_group:'青少年', team_size:'个人赛'},

  // === 中国数学/建模 ===
  {title:'2026年第十四屆APMCM亞太地區大學生數學建模競賽', title_en:'14th APMCM 2026', type:'AI创作', date_start:'2026-11-20', date_end:'2026-11-24', registration_deadline:'2026-11-19', location:'线上', fee_type:'付费', source:'APMCM', source_url:'https://www.saikr.com/apmcm/2026', age_group:'成人公开', team_size:'2-3人'},
  {title:'2026年第十三屆MathorCup高校數學建模挑戰賽', title_en:'13th MathorCup 2026', type:'AI创作', date_start:'2026-12-01', registration_deadline:'2026-11-30', location:'线上', fee_type:'付费', source:'MathorCup', source_url:'https://www.saikr.com/mathorcup/2026', age_group:'成人公开', team_size:'2-3人'},
]

async function main() {
  console.log(`📋 批量入库第11轮: ${comps.length} 个比赛\n`)
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

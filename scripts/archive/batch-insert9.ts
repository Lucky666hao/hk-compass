/**
 * 批量入库第9轮 — 桌球/武术/单车/HK表演艺术
 * 运行: npx tsx scripts/batch-insert9.ts
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
  // === HK体育 ===
  {title:'Hong Kong English Billiard Open Championship 2026', title_en:'2026香港英式桌球公開賽', type:'运动', date_start:'2026-10-04', date_end:'2026-10-31', registration_deadline:'2026-09-21', location:'新界', venue:'Navy Snooker Club (荃灣)', fee_type:'付费', organizer:'香港桌球總會', source:'HKBSCC', source_url:'https://www.hkbilliardsports.org.hk/en/competition/hong-kong-english-billiard-open-championship-2026/', age_group:'成人公开', team_size:'个人赛'},
  {title:'2026中國武術散手香港盃公開賽', title_en:'2026 China Wushu Sanshou HK Cup Open', type:'运动', date_start:'2026-10-11', registration_deadline:'2026-09-11', location:'港岛', venue:'鯉魚門體育館', fee_type:'付费', organizer:'中國香港武術聯會', source:'HK Wushu', source_url:'http://www.hkwushuu.com.hk/w_activity_s.html', age_group:'不限', team_size:'个人赛'},
  {title:'2026-2027全港公路單車賽—第三回合', title_en:'2026-27 HK Road Cycling Race Round 3', type:'运动', date_start:'2026-11-14', registration_deadline:'2026-10-23', location:'新界', venue:'大埔新娘潭路', fee_type:'付费', organizer:'中國香港單車總會', source:'Cycling HK', source_url:'https://www.cycling.org.hk/events/list/', age_group:'不限', team_size:'不限'},

  // === HK表演艺术 ===
  {title:'第14屆香港國際表演藝術節暨音樂比賽2026（第一時段）', title_en:'14th HK Intl Performing Arts Festival R1 2026', type:'音乐表演', date_start:'2026-11-21', date_end:'2026-12-06', registration_deadline:'2026-10-27', location:'港岛', fee_type:'付费', organizer:'香港青少年表演藝術交流發展協會', source:'HKYPAA', source_url:'https://hkypa.org/competition_details.php?event_id=1', age_group:'不限', team_size:'不限'},
  {title:'第14屆香港國際表演藝術節暨音樂比賽2026（第二時段）', title_en:'14th HK Intl Performing Arts Festival R2 2026', type:'音乐表演', date_start:'2026-12-12', date_end:'2026-12-31', registration_deadline:'2026-11-24', location:'港岛', fee_type:'付费', organizer:'香港青少年表演藝術交流發展協會', source:'HKYPAA', source_url:'https://hkypa.org/competition_details.php?event_id=1&lang=en', age_group:'不限', team_size:'不限'},

  // === 中国大学生学科竞赛 ===
  {title:'全國大學生廣告藝術大賽2026', title_en:'National College Advertising Art Contest 2026', type:'创意摄影设计', date_start:'2026-06-01', registration_deadline:'2026-09-15', location:'线上', fee_type:'付费', organizer:'教育部廣告教指委', source:'大广赛', source_url:'http://www.sun-ada.net/', age_group:'成人公开', team_size:'不限'},
  {title:'第五屆創研杯大學生英語翻譯競賽秋季賽2026（第二場）', title_en:'5th Chuangyan Cup English Translation Fall 2026 R2', type:'其他', date_start:'2026-11-25', registration_deadline:'2026-12-05', location:'线上', fee_type:'付费', organizer:'華夏文化促進會', source:'创研杯', source_url:'http://www.52jingsai.com/portal.php/ywgfh.52jingsai.com/games/article-23523-1.html', age_group:'成人公开', team_size:'个人赛'},
]

async function main() {
  console.log(`📋 批量入库第9轮: ${comps.length} 个比赛\n`)
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

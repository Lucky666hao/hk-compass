/**
 * 批量入库第6轮 — 政府比赛 + 迪士尼 + NCIECC + 英语竞赛
 * 运行: npx tsx scripts/batch-insert6.ts
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
  // === HK政府/公营机构比赛 ===
  {title:'地政總署45週年「我地的過去現在未來」攝影及短片創作比賽', title_en:'LandsD 45th Anniversary Photo & Video Contest', type:'创意摄影设计', date_start:'2026-07-20', registration_deadline:'2026-09-20', location:'线上', fee_type:'有奖金', organizer:'地政總署', source:'LandsD', source_url:'https://www.e-services-web2.landsd.gov.hk/e-services/sc/photoTakingVideoShootingContest-webform.php', age_group:'不限', team_size:'不限'},

  // === HK创意/设计 ===
  {title:'迪士尼幻想工程香港挑戰賽2026', title_en:'Disney ImagiNations Hong Kong Challenge 2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-09-13', location:'港岛', fee_type:'有奖金', organizer:'香港迪士尼樂園', source:'HK Disneyland', source_url:'https://hkcorporate.hongkongdisneyland.com/zh-cn/community/disney-imaginations.html', age_group:'成人公开', team_size:'4-6人'},
  {title:'香港國際AIGC文化數字内容創作大賽2026', title_en:'HK International AIGC Cultural Content Contest 2026', type:'AI创作', date_start:'2026-05-01', date_end:'2026-10-31', registration_deadline:'2026-09-30', location:'线上', fee_type:'有奖金', organizer:'香港教育大學', source:'EdUHK', source_url:'https://aigc.eduhk.org/', age_group:'成人公开', team_size:'不限'},

  // === 全国高校创新英语挑战赛 (NCIECC) ===
  {title:'第八屆全國高校創新英語挑戰賽NCIECC綜合能力賽2026', title_en:'8th NCIECC Comprehensive Ability 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-11-13', location:'线上', fee_type:'付费', organizer:'全國高校創新英語挑戰賽組委會', source:'NCIECC', source_url:'https://www.nciecc.com/zonghe.php', age_group:'成人公开', team_size:'个人赛'},
  {title:'第八屆全國高校創新英語挑戰賽NCIECC翻譯賽2026（第一場）', title_en:'8th NCIECC Translation Round 1 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-11-26', location:'线上', fee_type:'付费', organizer:'全國高校創新英語挑戰賽組委會', source:'NCIECC', source_url:'https://www.nciecc.com/translate.php', age_group:'成人公开', team_size:'个人赛'},
  {title:'第八屆全國高校創新英語挑戰賽NCIECC閱讀賽2026', title_en:'8th NCIECC Reading 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-12-25', location:'线上', fee_type:'付费', organizer:'全國高校創新英語挑戰賽組委會', source:'NCIECC', source_url:'https://www.nciecc.com/', age_group:'成人公开', team_size:'个人赛'},
  {title:'第八屆全國高校創新英語挑戰賽NCIECC詞匯賽2026-27', title_en:'8th NCIECC Vocabulary 2026-27', type:'其他', date_start:'2026-09-01', registration_deadline:'2027-01-14', location:'线上', fee_type:'付费', organizer:'全國高校創新英語挑戰賽組委會', source:'NCIECC', source_url:'https://www.nciecc.com/words.php', age_group:'成人公开', team_size:'个人赛'},

  // === 创研杯 ===
  {title:'第五屆創研杯大學生英語翻譯競賽秋季賽2026（第一場）', title_en:'5th Chuangyan Cup English Translation Fall 2026 R1', type:'其他', date_start:'2026-10-14', registration_deadline:'2026-10-24', location:'线上', fee_type:'付费', organizer:'華夏文化促進會', source:'创研杯', source_url:'http://www.52jingsai.com/portal.php/ywgfh.52jingsai.com/games/article-23523-1.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'第五屆創研杯大學生英語詞匯競賽秋季賽2026（第一場）', title_en:'5th Chuangyan Cup English Vocabulary Fall 2026 R1', type:'其他', date_start:'2026-10-01', registration_deadline:'2026-10-23', location:'线上', fee_type:'付费', organizer:'華夏文化促進會', source:'创研杯', source_url:'http://www.chqsn.com/delta/1057', age_group:'成人公开', team_size:'个人赛'},

  // === 英语阅读/写作 ===
  {title:'第八屆全國大學生語言文字能力大賽寫作專項賽2026', title_en:'8th National Language & Writing Contest 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-11-27', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://m.saikr.com/vse/WRITING2026', age_group:'成人公开', team_size:'个人赛'},
  {title:'第四屆大學生英語閱讀競賽NERCCS 2026', title_en:'4th National English Reading Contest 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-11-21', location:'线上', fee_type:'付费', source:'NERCCS', source_url:'http://m.52jingsai.com/article-23917.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'第六屆《英語世界》杯全國大學生英語詞匯大賽2026（暑期專場）', title_en:'6th English World Cup Vocabulary 2026 Summer', type:'其他', date_start:'2026-07-15', registration_deadline:'2026-08-20', location:'线上', fee_type:'付费', organizer:'商務印書館《英語世界》', source:'英语世界杯', source_url:'https://m.saikr.com/vocabulary2026', age_group:'成人公开', team_size:'个人赛'},
]

async function main() {
  console.log(`📋 批量入库第6轮: ${comps.length} 个比赛\n`)
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

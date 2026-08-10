/**
 * 批量入库已验证比赛（手动整理，跳过AI提取）
 * 运行: npx tsx scripts/batch-insert.ts
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
  {title:'COPA DE HK 香港國際格鬥錦標賽2026', title_en:'COPA DE HK International Grappling Tournament', type:'运动', date_start:'2026-10-17', date_end:'2026-10-18', registration_deadline:'2026-09-27', location:'港岛', venue:'伊利沙伯體育館', fee_type:'付费', organizer:'COPA DE HK', source:'Smoothcomp', source_url:'https://smoothcomp.com/zh/event/33235', age_group:'不限', team_size:'个人赛'},
  {title:'EQT Impact Challenge 香港2026', title_en:'EQT Impact Challenge Hong Kong 2026', type:'创业路演', date_start:'2026-10-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'有奖金', organizer:'EQT Group', source:'StartmeupHK', source_url:'https://www.startmeup.hk/zh-hans/eqt-impact-challenge-hong-kong-2026/', age_group:'成人公开', team_size:'不限'},
  {title:'WAC Annual Challenge 香港少年田徑賽2026', type:'运动', date_start:'2026-09-26', date_end:'2026-10-04', registration_deadline:'2026-08-26', location:'新界', fee_type:'付费', organizer:'Watsons Athletic Club', source:'WAC', source_url:'https://wac.aswatson.com/wac-annual-challenge/', age_group:'青少年', team_size:'不限'},
  {title:'平等機會盃中學校際辯論比賽2025-2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'平等機會委員會', source:'EOC', source_url:'https://www.eoc.org.hk/eodebate2025-26/application.html', age_group:'青少年', team_size:'4-6人'},
  {title:'全港學界對聯創作比賽2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-09-15', location:'线上', fee_type:'免费', organizer:'新市鎮文化教育協會', source:'CEANT', source_url:'https://ceant.org.hk/distich/', age_group:'青少年', team_size:'个人赛'},
  {title:'HKMAA 香港音樂文藝學術協會才藝大賽', type:'音乐表演', date_start:'2026-09-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'付费', organizer:'HKMAA', source:'HKMAA', source_url:'https://www.hkmaa.org/talent-regulation-on-site-mode', age_group:'不限', team_size:'不限'},
  {title:'創客中國國際中小企業創新創業大賽香港分站賽2026', title_en:'Maker in China HK 2026', type:'创业路演', date_start:'2026-09-24', registration_deadline:'2026-08-20', location:'港岛', fee_type:'有奖金', organizer:'數碼港', source:'Cyberport', source_url:'https://makerinchina.hk/', age_group:'成人公开', team_size:'不限'},
  {title:'第五屆大學生新媒體大賽2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-09-01', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://m.saikr.com/vse/XMTDX2026', age_group:'成人公开', team_size:'个人赛'},
  {title:'第三屆創新實踐杯全國大學生英語口語大賽', type:'其他', date_start:'2026-07-13', date_end:'2026-12-18', registration_deadline:'2026-12-18', location:'线上', fee_type:'免费', source:'赛氪', source_url:'https://m.saikr.com/vse/IPCESC/2026', age_group:'成人公开', team_size:'个人赛'},
  {title:'第四屆全國大學生數學創新思維挑戰賽2026', type:'其他', date_start:'2026-08-29', registration_deadline:'2026-08-28', location:'线上', fee_type:'免费', source:'赛氪', source_url:'https://m.saikr.com/vse/2026MATH', age_group:'成人公开', team_size:'个人赛'},
  {title:'第八屆CRH大學生程序設計大賽', type:'AI创作', date_start:'2026-09-12', date_end:'2026-09-13', registration_deadline:'2026-09-11', location:'线上', fee_type:'免费', source:'赛氪', source_url:'https://m.saikr.com/vse/CRH260803', age_group:'成人公开', team_size:'个人赛'},
  {title:'2026外研社國才杯全國大學生外語能力大賽', type:'其他', date_start:'2026-10-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'外研社', source:'外研社', source_url:'https://waiyu.jlau.edu.cn/info/1037/2063.htm', age_group:'成人公开', team_size:'个人赛'},
  {title:'COPA DE HK Junior 香港國際青少年格鬥錦標賽2026', type:'运动', date_start:'2026-10-18', registration_deadline:'2026-09-27', location:'港岛', venue:'伊利沙伯體育館', fee_type:'付费', organizer:'COPA DE HK', source:'Smoothcomp', source_url:'https://smoothcomp.com/jp/event/33352', age_group:'青少年', team_size:'个人赛'},
  {title:'首屆漢鼎盃全港中小學生原創作品朗誦大賽', type:'其他', date_start:'2026-09-19', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'漢鼎書院', source:'漢鼎書院', source_url:'https://www.hanacademy.edu.hk/tc/han-cup', age_group:'青少年', team_size:'个人赛'},
  {title:'香港菁英創作比賽2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-09-15', location:'线上', fee_type:'免费', organizer:'薪傳學社', source:'薪傳學社', source_url:'https://www.heritageconn.com/competition2026/', age_group:'青少年', team_size:'个人赛'},
  {title:'場域——2026第三屆香港青年創新設計獎', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'付费', source:'艺创展赛', source_url:'https://www.yczhansai.com/h-nd-295.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'2026年第六屆英語世界杯全國大學生英語聽力大賽', type:'其他', date_start:'2026-08-23', registration_deadline:'2026-10-24', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://m.saikr.com/vse/Listening26', age_group:'成人公开', team_size:'个人赛'},
]

async function main() {
  console.log(`📋 批量入库 ${comps.length} 个比赛\n`)
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
      console.log(`❌ ${c.title} — ${error.message}`)
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

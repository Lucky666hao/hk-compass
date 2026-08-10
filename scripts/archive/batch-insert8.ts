/**
 * 批量入库第8轮 — 三项铁人 + PolyU IFC + HK儿童比赛
 * 运行: npx tsx scripts/batch-insert8.ts
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
  // === HK三项铁人 ===
  {title:'2026世界鐵人三項盃香港站', title_en:'2026 World Triathlon Cup Hong Kong', type:'运动', date_start:'2026-11-07', registration_deadline:'2026-10-28', location:'港岛', fee_type:'付费', organizer:'中國香港三項鐵人總會', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/world-triathlon-cup-hong-kong/', age_group:'不限', team_size:'个人赛'},
  {title:'2026香港鐵人三項錦標賽', title_en:'2026 Hong Kong Triathlon Championships', type:'运动', date_start:'2026-11-29', registration_deadline:'2026-11-18', location:'新界', venue:'船灣', fee_type:'付费', organizer:'中國香港三項鐵人總會', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/en/race/hong-kong-triathlon-championships/', age_group:'不限', team_size:'个人赛'},
  {title:'2026年陸上兩項鐵人賽—比賽3', title_en:'2026 Duathlon Race 3', type:'运动', date_start:'2026-10-01', registration_deadline:'2026-09-25', location:'新界', fee_type:'付费', organizer:'中國香港三項鐵人總會', source:'TriHK', source_url:'https://www.triathlon.com.hk/zh-hant/event/apply/2684', age_group:'不限', team_size:'不限'},

  // === HK创新/创业 ===
  {title:'PolyU國際未來挑戰賽IFC 2026', title_en:'PolyU International Future Challenge 2026', type:'创业路演', date_start:'2026-09-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'有奖金', organizer:'香港理工大學', source:'PolyU', source_url:'https://sa.hkbu.edu.hk/en/career/Start-up-Support/Start-up-Competitions---Opportunities/PolyU-International-Future-Challenge-2026.html', age_group:'成人公开', team_size:'不限'},
  {title:'Innovate for Future 2026 創新科技比賽', title_en:'Innovate for Future 2026', type:'AI创作', date_start:'2026-09-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'有奖金', organizer:'香港科技創新中心', source:'CHKCI', source_url:'https://www.chkci.org.hk/post/20260323a', age_group:'成人公开', team_size:'不限'},
  {title:'第二屆SYSBS-HBI×PBS國際數字商業模擬與案例分析大賽2026', title_en:'2nd SYSBS-HBI×PBS International Digital Business Case Competition 2026', type:'创业路演', date_start:'2026-09-01', registration_deadline:'2026-11-15', location:'线上', fee_type:'付费', organizer:'PolyU Business School', source:'PolyU', source_url:'https://www.polyu.edu.hk/mm/about-mm/news-and-events/news/2026/2026-the-2nd-sysbs/', age_group:'成人公开', team_size:'2-3人'},

  // === 第二屆全國高校創新轉化大賽 ===
  {title:'第二屆全國高校創新轉化大賽2026', title_en:'2nd National College Innovation Transfer Contest 2026', type:'创业路演', date_start:'2026-07-01', date_end:'2026-12-31', registration_deadline:'2026-08-31', location:'线上', fee_type:'付费', source:'52jingsai', source_url:'http://www.52jingsai.com/portal.php/ywgfh.52jingsai.com/article-23869-1.html', age_group:'成人公开', team_size:'不限'},

  // === HK儿童/青少年 ===
  {title:'第十六屆香港青年兒童朗誦比賽2026', title_en:'16th HK Youth Speech Contest 2026', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/speech-contest-contest-2026-09', age_group:'不限', team_size:'个人赛'},
  {title:'第二屆全港十八區兒童中英文朗誦比賽2026-27', title_en:'2nd HK 18-District Children Speech Contest 2026-27', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-08-27', location:'线上', fee_type:'免费', organizer:'KACA', source:'KACA', source_url:'https://www.hkkaca.org/post/%E7%AC%AC%E4%BA%8C%E5%B1%86%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80%E5%85%92%E7%AB%A5%E4%B8%AD%E8%8B%B1%E6%96%87%E6%9C%97%E8%AA%A6%E6%AF%94%E8%B3%BD26-27%E5%B9%B4%E5%BA%A6', age_group:'不限', team_size:'个人赛'},
  {title:'ITEDA國際兒童及青少年故事演講比賽2026', title_en:'ITEDA International Storytelling Contest 2026', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-09-03', location:'线上', fee_type:'付费', organizer:'ITEDA', source:'ITEDA', source_url:'https://iteda.org/products/iteda-%E5%9C%8B%E9%9A%9B%E5%85%92%E7%AB%A5%E5%8F%8A%E9%9D%92%E5%B0%91%E5%B9%B4%E6%95%85%E4%BA%8B%E6%BC%94%E8%AC%9B%E6%AF%94%E8%B3%BD', age_group:'青少年', team_size:'个人赛'},
  {title:'第十六屆香港兒童中英文認字比賽2026', title_en:'16th HK Children Vocabulary Contest 2026', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/vocabulary-contest-2026-09', age_group:'儿童', team_size:'个人赛'},
  {title:'第二屆全港十八區兒童中英文認字比賽2026-27', title_en:'2nd HK 18-District Children Vocab Contest', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-08-27', location:'线上', fee_type:'免费', organizer:'KACA', source:'KACA', source_url:'https://www.hkkaca.org/post/%E7%AC%AC%E4%BA%8C%E5%B1%86%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80%E5%85%92%E7%AB%A5%E4%B8%AD%E8%8B%B1%E6%96%87%E8%AA%8D%E5%AD%97%E6%AF%94%E8%B3%BD26-27%E5%B9%B4%E5%BA%A6', age_group:'儿童', team_size:'个人赛'},
  {title:'屈臣氏田徑會兒童競技比賽2026', title_en:'WAC Children Athletics Challenge 2026', type:'运动', date_start:'2026-09-27', registration_deadline:'2026-08-26', location:'新界', fee_type:'付费', organizer:'屈臣氏田徑會', source:'WAC', source_url:'https://www.yellowbus.com.hk/%E5%B1%88%E8%87%A3%E6%B0%8F%E7%94%B0%E5%BE%91%E6%9C%83%E5%85%92%E7%AB%A5%E7%AB%B6%E6%8A%80%E6%AF%94%E8%B3%BD%E6%98%8E%E8%B5%B7%E6%8E%A5%E5%8F%97%E5%A0%B1%E5%90%8D-4%E4%BA%BA%E4%B8%80%E7%B5%84%E6%8C%91/', age_group:'儿童', team_size:'4-6人'},
]

async function main() {
  console.log(`📋 批量入库第8轮: ${comps.length} 个比赛\n`)
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

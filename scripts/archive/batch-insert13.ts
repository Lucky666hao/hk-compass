/**
 * 批量入库第13轮 — HK建筑/设计/中小学生比赛
 * 运行: npx tsx scripts/batch-insert13.ts
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
  // === HK建筑/设计奖 ===
  {title:'第36屆HKIA青年建築師獎2026', title_en:'36th HKIA Young Architects Award 2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-08-20', location:'线上', fee_type:'有奖金', organizer:'香港建築師學會', source:'HKIA', source_url:'https://hkia.net/en/whats-on/1/events/detail/1312', age_group:'成人公开', team_size:'不限'},
  {title:'Hong Kong Design Awards 2026', title_en:'2026香港設計大獎', type:'创意摄影设计', date_start:'2026-07-01', registration_deadline:'2026-09-03', location:'线上', fee_type:'付费', organizer:'Better Future Awards', source:'BFA', source_url:'https://betterfutureawards.com/hkg26/quickstart.asp', age_group:'成人公开', team_size:'不限'},
  {title:'DREAM Centre多媒體創意比賽2026', title_en:'DREAM Centre Multimedia Creative Competition 2026', type:'创意摄影设计', date_start:'2026-07-01', registration_deadline:'2026-08-20', location:'线上', fee_type:'免费', organizer:'DREAM Centre', source:'DREAM Centre', source_url:'https://thefilipinohub.com/events/dream-centre-multimedia-creative-competition-2026/', age_group:'不限', team_size:'个人赛'},

  // === HK中小学生 ===
  {title:'第九屆紫荊杯全港中小學生中國歷史文化知識競賽2026', title_en:'9th Bauhinia Cup Chinese History Knowledge Contest 2026', type:'其他', date_start:'2026-09-14', date_end:'2026-11-07', registration_deadline:'2026-09-14', location:'线上', fee_type:'免费', organizer:'紫荊雜誌社', source:'紫荆杯', source_url:'https://zijing.com.cn/web/article/1524086405849341952/web/content_1524086405849341952.html', age_group:'青少年', team_size:'个人赛'},
  {title:'全港青少年數學挑戰賽2026 HKYMC', title_en:'HK Youth Mathematics Challenge 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', organizer:'HKYMC', source:'HKYMC', source_url:'https://hkymc.hk/Apply.html', age_group:'青少年', team_size:'个人赛'},
  {title:'創意共享產品設計比賽2026', title_en:'Creative Sharing Product Design Competition 2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'免费', organizer:'香港教育大學', source:'EdUHK', source_url:'https://ceie.eduhk.hk/zh/%E3%80%8C%E5%89%B5%E6%84%8F%E5%85%B1%E4%BA%AB%E3%80%8D%E7%94%A2%E5%93%81%E8%A8%AD%E8%A8%88%E6%AF%94%E8%B3%BD-2026-guidelines/', age_group:'青少年', team_size:'不限'},

  // === 中国创新创业 ===
  {title:'第十三屆中國創新創業大賽2026（港澳台賽）', title_en:'13th China Innovation & Entrepreneurship Contest 2026 HK/Macau/TW', type:'创业路演', date_start:'2026-07-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'有奖金', organizer:'科技部火炬中心', source:'中国创新创业大赛', source_url:'http://www.cxcyds.com/', age_group:'成人公开', team_size:'不限'},
  {title:'2026年全國顛覆性技術創新創業大賽', type:'创业路演', date_start:'2026-09-01', registration_deadline:'2026-11-30', location:'线上', fee_type:'免费', organizer:'科技部', source:'颠覆性技术大赛', source_url:'http://www.dtx-tech.cn/', age_group:'成人公开', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第13轮: ${comps.length} 个比赛\n`)
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

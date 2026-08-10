/**
 * 批量入库第12轮 — iCAN + 大学生综合赛事
 * 运行: npx tsx scripts/batch-insert12.ts
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
  // === 创新创业 ===
  {title:'第二十屆iCAN大學生創新創業大賽2026', title_en:'20th iCAN Innovation & Entrepreneurship Contest 2026', type:'创业路演', date_start:'2026-04-01', date_end:'2026-12-31', registration_deadline:'2026-08-31', location:'线上', fee_type:'付费', organizer:'中國創造學會', source:'iCAN', source_url:'http://m.52jingsai.com/article-23617.html', age_group:'成人公开', team_size:'不限'},

  // === 更多全国竞赛 ===
  {title:'全國大學生光電設計競賽2026', type:'其他', date_start:'2026-07-01', registration_deadline:'2026-09-15', location:'线上', fee_type:'付费', source:'光电设计竞赛', source_url:'http://opt.zju.edu.cn/', age_group:'成人公开', team_size:'2-3人'},
  {title:'全國大學生金相技能大賽2026', title_en:'National Metallographic Skills Contest 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-10-15', location:'线上', fee_type:'付费', source:'金相大赛', source_url:'http://www.jxds.cn/', age_group:'成人公开', team_size:'个人赛'},
  {title:'全國大學生先進成圖技術與產品信息建模創新大賽2026', type:'其他', date_start:'2026-07-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', source:'成图大赛', source_url:'http://www.chengtudasai.com/', age_group:'成人公开', team_size:'个人赛'},
  {title:'全國大學生市場調查與分析大賽2026-27（專科組）', title_en:'National Market Research Contest 2026-27 Vocational', type:'其他', date_start:'2026-10-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', source:'市调大赛', source_url:'http://www.china-cssc.org/', age_group:'成人公开', team_size:'2-3人'},
  {title:'第八屆全國大學生地質技能競賽2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', source:'地质技能', source_url:'http://www.saikr.com/geoskill/2026', age_group:'成人公开', team_size:'2-3人'},
]

async function main() {
  console.log(`📋 批量入库第12轮: ${comps.length} 个比赛\n`)
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

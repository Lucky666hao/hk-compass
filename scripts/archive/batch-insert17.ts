/**
 * 批量入库第17轮 — 全国设计大赛
 * 运行: npx tsx scripts/batch-insert17.ts
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
  // === 全国设计比赛 ===
  {title:'2026華夏獎文化藝術設計大賽（秋季）', title_en:'2026 Huaxia Award Culture & Art Design (Fall)', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', source:'华夏奖', source_url:'https://www.cnyisai.com/event/c104.html', age_group:'成人公开', team_size:'不限'},
  {title:'中國設計未來之星大賽2026', title_en:'China Design Future Star 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', source:'上海设计周', source_url:'https://shdesignweek.com/awards/13', age_group:'成人公开', team_size:'不限'},
  {title:'2026立邦未來之星青年設計師大賽', title_en:'2026 Nippon Paint Future Star Designer Contest', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'有奖金', organizer:'立邦', source:'Nippon Paint', source_url:'http://ex.chinadaily.com.cn/exchange/partners/82/rss/channel/cn/columns/6ldgif/stories/WS69e1fb9aa310942cc49a82c0.html', age_group:'成人公开', team_size:'不限'},
  {title:'2026第二屆全國大學生人工智能時尚創新設計大賽', title_en:'2nd National AI Fashion Design Contest 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-10-08', location:'线上', fee_type:'付费', organizer:'北京服裝學院', source:'BIFT', source_url:'https://xw.bift.edu.cn/jgszyzz/78414e27603249719fc899a2caabf6ae.htm', age_group:'成人公开', team_size:'不限'},
  {title:'2026華韻獎全國高校數字創新設計大賽', title_en:'2026 Huayun Award National Digital Design Contest', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', source:'华韵奖', source_url:'https://ccart.ccu.edu.cn/info/2488/16319.htm', age_group:'成人公开', team_size:'不限'},
  {title:'米蘭設計周高校設計學科師生優秀作品展2026', title_en:'Milan Design Week China Colleges Exhibition 2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-11-30', location:'线上', fee_type:'付费', organizer:'米蘭設計周', source:'米兰设计周', source_url:'http://www.milan-aap.org.cn/', age_group:'成人公开', team_size:'不限'},
  {title:'2026第十屆米蘭設計周高校設計學科師生優秀作品展湖南師大初賽', title_en:'10th Milan Design Week HNNU Preliminary 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', source:'湖南师大', source_url:'https://scsy.hunnu.edu.cn/info/1014/4159.htm', age_group:'成人公开', team_size:'不限'},

  // === 福建文创 ===
  {title:'數字山海·智匯八閩—2026福建省高校大學生文創設計大賽', title_en:'Fujian College Cultural Creative Design Contest 2026', type:'创意摄影设计', date_start:'2026-04-24', registration_deadline:'2026-09-30', location:'线上', fee_type:'有奖金', source:'泉州师范', source_url:'https://lib.qztc.edu.cn/_t330/2026/0424/c4679a292843/page.htm', age_group:'成人公开', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第17轮: ${comps.length} 个比赛\n`)
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

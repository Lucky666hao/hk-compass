import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const comps = [
  // HK Design
  {title:'2026第三屆香港青年創新設計獎（第一階段）', title_en:'3rd Hong Kong Youth Innovation Design Award 2026 Phase 1', type:'创意摄影设计', date_start:'2026-07-15', registration_deadline:'2026-09-15', location:'线上', fee_type:'付费', organizer:'香港當代藝術文化研究院', source:'艺创展赛', source_url:'https://www.yczhansai.com/h-nd-295.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'2026第13屆環球藝術國際設計獎', title_en:'13th Global Art International Design Award 2026', type:'创意摄影设计', date_start:'2026-07-21', date_end:'2026-12-10', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', organizer:'香港環球藝術設計協會', source:'环球艺术', source_url:'http://m.333cn.com/contest/show-81.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'「碳中和：我們的理想家園」創作比賽2026', type:'创意摄影设计', date_start:'2026-06-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'有奖金', organizer:'香港中文大學', source:'CUHK', source_url:'https://enews.alumni.cuhk.edu.hk/zh-hk/issue/2026-06/1892', age_group:'成人公开', team_size:'不限'},
]

async function main() {
  let added = 0, skipped = 0, failed = 0
  for (const c of comps) {
    const { data: exist } = await s.from('competitions').select('id').eq('source_url', c.source_url).maybeSingle()
    if (exist) { skipped++; continue }
    const { error } = await s.from('competitions').insert({...c, eligibility:'不限', status:'报名中', description:null})
    if (error) { console.log('FAIL:', c.title.substring(0,50), '-', error.message); failed++ }
    else { console.log('OK:', c.title); added++ }
  }
  console.log('Added:', added, 'Skipped:', skipped, 'Failed:', failed)
  const { count } = await s.from('competitions').select('id', { count: 'exact', head: true })
  console.log('Total:', count)
}
main().catch(console.error)

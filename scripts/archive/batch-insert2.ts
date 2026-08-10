import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const comps = [
  {title:'Border Go! 慈善越野跑2026暨親子文化生態遊', type:'运动', date_start:'2026-11-08', registration_deadline:'2026-10-25', location:'新界', venue:'牛潭尾至坪輋', fee_type:'付费', organizer:'ASTKCE', source:'ASTKCE', source_url:'https://astkce.hk/bordergo/', age_group:'不限', team_size:'不限'},
  {title:'佛你跑2026', type:'运动', date_start:'2026-11-07', location:'新界', venue:'大嶼山昂坪地壇廣場', fee_type:'付费', organizer:'佛教慈善基金會', source:'佛你跑', source_url:'https://buddhayourun.org.hk', age_group:'不限', team_size:'不限'},
  {title:'高教社杯全國大學生數學建模競賽2026', title_en:'CUMCM 2026', type:'AI创作', date_start:'2026-09-10', date_end:'2026-09-13', registration_deadline:'2026-09-07', location:'线上', fee_type:'付费', organizer:'中國工業與應用數學學會', source:'高教社', source_url:'http://www.mcm.edu.cn/', age_group:'成人公开', team_size:'2-3人'},
  {title:'第十八屆全國大學生數學競賽2026', type:'其他', date_start:'2026-11-01', registration_deadline:'2026-10-19', location:'线上', fee_type:'付费', organizer:'中國數學會', source:'中国数学会', source_url:'http://www.cmathc.cn/', age_group:'成人公开', team_size:'个人赛'},
  {title:'數維杯全國大學生數學建模挑戰賽秋季賽2026', type:'AI创作', date_start:'2026-11-20', date_end:'2026-11-24', registration_deadline:'2026-11-20', location:'线上', fee_type:'付费', organizer:'數維杯組委會', source:'数维杯', source_url:'http://nmmcm.org.cn/News/198.html', age_group:'成人公开', team_size:'2-3人'},
  {title:'第八屆全國高校計算機能力挑戰賽2026', type:'AI创作', date_start:'2026-12-01', registration_deadline:'2026-11-25', location:'线上', fee_type:'付费', source:'计算机能力挑战赛', source_url:'https://www.ncccu.org.cn/', age_group:'成人公开', team_size:'个人赛'},
  {title:'百度之星程序設計大賽2026', title_en:'Baidu Star Programming Contest 2026', type:'AI创作', date_start:'2026-09-01', registration_deadline:'2026-09-15', location:'线上', fee_type:'免费', organizer:'百度', source:'百度之星', source_url:'https://www.zsjingsai.com/4751.html', age_group:'成人公开', team_size:'个人赛'},
]

async function main() {
  let added = 0, skipped = 0, failed = 0
  for (const c of comps) {
    const { data: exist } = await s.from('competitions').select('id').eq('source_url', c.source_url).maybeSingle()
    if (exist) { skipped++; continue }
    const { error } = await s.from('competitions').insert({...c, eligibility:'不限', status:'报名中', description:null})
    if (error) { console.log('FAIL:', c.title.substring(0,40), '-', error.message); failed++ }
    else { console.log('OK:', c.title); added++ }
  }
  console.log('Added:', added, 'Skipped:', skipped, 'Failed:', failed)
  const { count } = await s.from('competitions').select('id', { count: 'exact', head: true })
  console.log('Total:', count)
}
main().catch(console.error)

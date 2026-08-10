import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const comps = [
  // PaoBaoDao sports (new ones not in DB)
  {title:'香港10公里錦標賽2026', title_en:'Hong Kong 10K Championships 2026', type:'运动', date_start:'2026-10-04', location:'新界', fee_type:'付费', organizer:'香港業餘田徑總會', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/hong-kong-10k-championships/', age_group:'不限', team_size:'个人赛'},
  {title:'香港青少年田徑分齡賽2026（五）', type:'运动', date_start:'2026-09-12', date_end:'2026-09-13', location:'新界', fee_type:'付费', organizer:'協調田徑會', source:'協調田徑會', source_url:'http://www.pacers.org.hk/2026/06/18/22753/', age_group:'青少年', team_size:'个人赛'},
  {title:'PEGASUS 石門10公里賽2026', title_en:'PEGASUS Shek Mun 10K 2026', type:'运动', date_start:'2026-12-06', location:'新界', venue:'石門', fee_type:'付费', organizer:'PEGASUS', source:'PaoBaoDao', source_url:'https://www.paobaodao.com/hong-kong/race/pegasus-shek-mun-10k/', age_group:'不限', team_size:'个人赛'},

  // Business/innovation
  {title:'全國高校商業精英挑戰賽創新創業競賽2026', type:'创业路演', date_start:'2026-10-17', date_end:'2026-10-18', registration_deadline:'2026-08-25', location:'线上', fee_type:'付费', organizer:'中國貿促會商業行業委員會', source:'商业精英挑战赛', source_url:'https://business.dlut.edu.cn/info/1321/21442.htm', age_group:'成人公开', team_size:'4-6人'},
  {title:'華智·高校大學生創新創業大賽2026', type:'创业路演', date_start:'2026-07-20', registration_deadline:'2026-08-24', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://m.saikr.com/vse/HZCXCY', age_group:'成人公开', team_size:'2-3人'},
  {title:'工行杯全國大學生金融科技創新大賽2026', title_en:'ICBC Cup Fintech Innovation Contest 2026', type:'创业路演', date_start:'2026-08-01', date_end:'2026-10-31', registration_deadline:'2026-10-15', location:'线上', fee_type:'免费', organizer:'中國工商銀行', source:'工行杯', source_url:'https://www.gonghangbei.com/', age_group:'成人公开', team_size:'不限'},
  {title:'普譯獎全國大學生英語寫作大賽2026', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-09-15', location:'线上', fee_type:'付费', source:'普译奖', source_url:'https://www.puyiaward.com/', age_group:'成人公开', team_size:'个人赛'},
  {title:'2026中國國際大學生創新大賽（教育部）', title_en:'China International College Students Innovation Competition 2026', type:'创业路演', date_start:'2026-08-10', date_end:'2026-11-15', registration_deadline:'2026-09-25', location:'线上', fee_type:'免费', organizer:'教育部', source:'教育部', source_url:'https://cy.ncss.cn', age_group:'成人公开', team_size:'不限'},
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

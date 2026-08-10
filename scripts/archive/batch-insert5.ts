/**
 * 批量入库第5轮 — HK艺术比赛 + 全国大学生竞赛
 * 运行: npx tsx scripts/batch-insert5.ts
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
  // === HK 免费艺术/才艺比赛 (CYACA/HKAEA/KACA/HKAOAC) ===
  {title:'第五屆香港攝影比賽2026', title_en:'5th Hong Kong Photography Contest 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/photography-contest-2026-09', age_group:'不限', team_size:'个人赛'},
  {title:'全港校際鋼琴公開賽2026（8月）', title_en:'HK Inter-school Piano Open 2026 Aug', type:'音乐表演', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'有奖金', organizer:'HKAEA', source:'HKAEA', source_url:'https://www.hkcaea.org/post/pianoaug2026', age_group:'不限', team_size:'个人赛'},
  {title:'全港傑出學生大賽2026（8月）', title_en:'HK Outstanding Student Contest 2026 Aug', type:'其他', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'HKAEA', source:'HKAEA', source_url:'https://www.hkcaea.org/post/outstandingaug2026', age_group:'青少年', team_size:'个人赛'},
  {title:'第十六屆香港青年兒童歌唱比賽2026', title_en:'16th HK Youth Singing Contest 2026', type:'音乐表演', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/singing-contest-2026-09', age_group:'不限', team_size:'不限'},
  {title:'第十六屆香港青年兒童音樂比賽2026', title_en:'16th HK Youth Music Contest 2026', type:'音乐表演', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/music-contest-2026-09', age_group:'不限', team_size:'不限'},
  {title:'第十六屆香港青年兒童跳舞比賽2026', title_en:'16th HK Youth Dance Contest 2026', type:'音乐表演', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/dance-contest-2026-09', age_group:'不限', team_size:'不限'},
  {title:'第九屆香港青年兒童花式溜冰比賽2026', title_en:'9th HK Youth Figure Skating Contest 2026', type:'运动', date_start:'2026-08-01', registration_deadline:'2026-08-31', location:'线上', fee_type:'免费', organizer:'CYACA', source:'CYACA', source_url:'https://www.hkcyaca.com/post/iceskating-contest-2026-09', age_group:'不限', team_size:'不限'},
  {title:'第二屆全港十八區兒童視藝比賽2026-27', title_en:'2nd HK 18-District Children Visual Arts Contest 2026-27', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-08-27', location:'线上', fee_type:'免费', organizer:'KACA', source:'KACA', source_url:'https://www.hkkaca.org/post/%E7%AC%AC%E4%BA%8C%E5%B1%86%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80%E5%85%92%E7%AB%A5%E8%A6%96%E8%97%9D%E6%AF%94%E8%B3%BD26-27%E5%B9%B4%E5%BA%A6', age_group:'不限', team_size:'个人赛'},

  // === 全国大学生竞赛 ===
  {title:'大學生AI+信息素養大賽2026', title_en:'College AI+Info Literacy Contest 2026', type:'AI创作', date_start:'2026-09-01', date_end:'2026-11-27', registration_deadline:'2026-09-17', location:'线上', fee_type:'免费', organizer:'高校圖工委', source:'高校图工委', source_url:'https://lib.xzhmu.edu.cn/info/1017/2449.htm', age_group:'成人公开', team_size:'个人赛'},
  {title:'中國高校計算機大賽—人工智能創意賽2026（C4-AI）', title_en:'C4-AI 2026', type:'AI创作', date_start:'2026-09-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'免费', organizer:'教育部計算機教指委', source:'C4-AI', source_url:'http://today.hit.edu.cn/article/2026/06/08/130452', age_group:'成人公开', team_size:'不限'},
  {title:'第十二屆中金所杯全國大學生金融知識大賽2026', title_en:'12th CFFEX Cup Financial Knowledge Contest 2026', type:'其他', date_start:'2026-09-10', date_end:'2026-12-06', registration_deadline:'2026-10-31', location:'线上', fee_type:'免费', organizer:'中國金融期貨交易所', source:'中金所', source_url:'https://guba.eastmoney.com/news,cfhpl,1756122923.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'正大杯全國大學生市場調查與分析大賽2026-27', title_en:'Cup Cup Market Research Contest 2026-27', type:'其他', date_start:'2026-09-01', date_end:'2027-06-30', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', organizer:'中國商業統計學會', source:'正大杯', source_url:'http://www.china-cssc.org/', age_group:'成人公开', team_size:'2-3人'},
  {title:'中國大學生廣告藝術節學院獎2026秋季賽', title_en:'Academy Award Fall 2026', type:'创意摄影设计', date_start:'2026-09-01', registration_deadline:'2026-11-20', location:'线上', fee_type:'免费', organizer:'中國廣告協會', source:'学院奖', source_url:'https://www.adzgnewcreator.com/', age_group:'成人公开', team_size:'不限'},
  {title:'第八屆全國大學生教育教學能力大賽2026', title_en:'8th National Teaching Skills Contest 2026', type:'其他', date_start:'2026-10-01', registration_deadline:'2026-12-12', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://m.saikr.com/vse/EDU2026', age_group:'成人公开', team_size:'个人赛'},
  {title:'普譯獎全國大學生英語寫作大賽2026秋季', title_en:'Puyi Award English Writing Fall 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-12-04', location:'线上', fee_type:'付费', source:'普译奖', source_url:'https://www.puyiaward.com/', age_group:'成人公开', team_size:'个人赛'},
  {title:'第六屆全國大學生漢語大賽2026', title_en:'6th National College Chinese Contest 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-12-19', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://m.saikr.com/vse/HANYU2026', age_group:'成人公开', team_size:'个人赛'},
  {title:'第十屆華為ICT大賽中國賽2026-27', title_en:'10th Huawei ICT Competition China 2026-27', type:'AI创作', date_start:'2026-09-10', date_end:'2027-05-31', registration_deadline:'2026-11-30', location:'线上', fee_type:'免费', organizer:'華為', source:'华为ICT', source_url:'https://www.huaweiacad.com/', age_group:'成人公开', team_size:'2-3人'},
  {title:'譯達人杯全國大學生英語翻譯競賽2026', title_en:'Yidaren Cup College English Translation 2026', type:'其他', date_start:'2026-09-01', date_end:'2027-01-31', registration_deadline:'2026-12-15', location:'线上', fee_type:'付费', source:'译达人杯', source_url:'https://www.52jingsai.com/article-21734-1.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'求是杯國際詩歌創作與翻譯大賽2026', title_en:'Qiushi Cup Poetry & Translation 2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-11-30', location:'线上', fee_type:'免费', source:'求是杯', source_url:'https://www.cnchuangsai.com/58422.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'九斗杯全國大學生物理知識競賽2026', title_en:'Jiudou Cup College Physics Contest 2026', type:'其他', date_start:'2026-10-20', registration_deadline:'2026-11-15', location:'线上', fee_type:'免费', source:'九斗杯', source_url:'http://m.52jingsai.com/article-21945.html', age_group:'成人公开', team_size:'个人赛'},
  {title:'外研社國才杯全國大學生外語能力大賽2026（綜合賽道）', title_en:'FLTRP ETIC Cup 2026 Comprehensive', type:'其他', date_start:'2026-10-15', registration_deadline:'2026-09-30', location:'线上', fee_type:'免费', organizer:'外研社', source:'外研社', source_url:'https://uchallenge.unipus.cn/', age_group:'成人公开', team_size:'个人赛'},

  // === 香港体育 ===
  {title:'2026-2027年度香港盾射箭比賽', title_en:'HK Shield Archery 2026-27', type:'运动', date_start:'2026-09-12', date_end:'2026-09-13', registration_deadline:'2026-08-21', location:'新界', venue:'獅子山公園射箭場', fee_type:'付费', organizer:'香港射箭總會', source:'HK Archery', source_url:'https://www.archery.org.hk/content/2026-2027%E5%B9%B4%E5%BA%A6%E9%A6%99%E6%B8%AF%E7%9B%BE%E5%B0%84%E7%AE%AD%E6%AF%94%E8%B3%BD', age_group:'不限', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第5轮: ${comps.length} 个比赛\n`)
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

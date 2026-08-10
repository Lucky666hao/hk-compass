/**
 * 批量入库第7轮 — 设计/文创/AI视频/科技美术
 * 运行: npx tsx scripts/batch-insert7.ts
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
  // === 文创/设计 ===
  {title:'第五屆「非遺新體驗」國潮文創設計大賽2026', title_en:'5th Intangible Heritage Guochao Design Contest 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-10-23', location:'线上', fee_type:'有奖金', source:'designkaa', source_url:'https://designkaa.com/show-3283.html', age_group:'成人公开', team_size:'不限'},
  {title:'「則徐有禮·邀你共創」林則徐紀念館文創設計大賽2026', title_en:'Lin Zexu Memorial Creative Design Contest 2026', type:'创意摄影设计', date_start:'2026-08-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'有奖金', source:'designkaa', source_url:'https://designkaa.com/show-3277.html', age_group:'成人公开', team_size:'不限'},
  {title:'全國大學生科技美術設計創新作品大賽2026', title_en:'National Tech-Art Design Innovation Contest 2026', type:'创意摄影设计', date_start:'2026-07-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', source:'征集码头', source_url:'http://www.zhengjimt.com/zjxx/shufa/270522.html', age_group:'成人公开', team_size:'不限'},

  // === 数字媒体/AI视频 ===
  {title:'第八屆全國高校計算機能力挑戰賽數字媒體創新設計賽2026', title_en:'8th NCCCCU Digital Media Design 2026', type:'创意摄影设计', date_start:'2026-07-09', registration_deadline:'2026-11-19', location:'线上', fee_type:'付费', organizer:'全國高校計算機能力挑戰賽組委會', source:'NCCCCU', source_url:'http://www.ncccu.org.cn/index/Paper/case7.html?way=hubei', age_group:'成人公开', team_size:'2-3人'},
  {title:'「AI生成世界」AI圖像圖形技術創新大賽2026（視頻賽道）', title_en:'AI Generated World Video Track 2026', type:'AI创作', date_start:'2026-11-01', date_end:'2027-03-31', registration_deadline:'2026-12-31', location:'线上', fee_type:'付费', source:'赛氪', source_url:'https://www.saikr.com/vse/AIGC2602', age_group:'成人公开', team_size:'不限'},
  {title:'第二屆「復新」全球大學生智能影像創作大賽2026', title_en:'2nd Fuxin Global AI Imaging Contest 2026', type:'AI创作', date_start:'2026-07-01', registration_deadline:'2026-09-20', location:'线上', fee_type:'有奖金', source:'澎湃', source_url:'https://m.thepaper.cn/newsDetail_forward_33355856', age_group:'成人公开', team_size:'不限'},

  // === 香港设计/艺术 ===
  {title:'2026香港視覺藝術獎 HKVAA', title_en:'Hong Kong Visual Art Award 2026', type:'创意摄影设计', date_start:'2026-10-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'付费', organizer:'HKVAA', source:'HKVAA', source_url:'https://www.hkvaa.org/', age_group:'不限', team_size:'不限'},

  // === 更多全国竞赛 ===
  {title:'第十屆全國大學生生命科學競賽2026（創新創業類）', title_en:'10th National Life Science Contest Innovation 2026', type:'创业路演', date_start:'2026-09-01', registration_deadline:'2026-10-15', location:'线上', fee_type:'付费', organizer:'教育部生命科學教指委', source:'生命科学竞赛', source_url:'http://www.culsc.cn/', age_group:'成人公开', team_size:'4-6人'},
  {title:'全國大學生節能減排社會實踐與科技競賽2026', type:'创业路演', date_start:'2026-09-01', registration_deadline:'2026-10-31', location:'线上', fee_type:'免费', organizer:'教育部能源動力教指委', source:'节能减排竞赛', source_url:'http://www.jienengjianpai.org/', age_group:'成人公开', team_size:'不限'},
  {title:'全國大學生化工設計競賽2026', type:'其他', date_start:'2026-09-01', registration_deadline:'2026-09-30', location:'线上', fee_type:'付费', organizer:'中國化工學會', source:'化工设计竞赛', source_url:'http://iche.zju.edu.cn/', age_group:'成人公开', team_size:'不限'},
  {title:'全國大學生集成電路創新創業大賽2026', type:'AI创作', date_start:'2026-01-01', registration_deadline:'2026-12-31', location:'线上', fee_type:'付费', organizer:'工信部', source:'集成电路大赛', source_url:'http://univ.ciciec.com/', age_group:'成人公开', team_size:'不限'},
]

async function main() {
  console.log(`📋 批量入库第7轮: ${comps.length} 个比赛\n`)
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

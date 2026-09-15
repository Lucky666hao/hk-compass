/**
 * 新比赛批量入库（2026-09 批次6）—— 运动赛事 + 高校/學界/音乐赛事
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 已剔除：文裕盃(8/31已截止)、香港青年創新設計獎(xingxiancn/yczhansai/chuangyisai 大陆平台)、
 *         港大國際科創大賽(6/21已截止)、英才盃/紫荊杯/情繫中華(bau.com.hk/zijing.com.cn)。
 * 运行: node scripts/scrape-batch6.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const normDate = (s) => (s ? String(s).slice(0, 10) : null)

// 字段说明（与 competitions 表约束严格对齐）：
// location: 港岛|九龙|新界|线上   eligibility: 个人报名|学校提名|两者皆可|不限
// team_size: 个人赛|2-3人|4-6人|7人以上|不限   age_group: 儿童|青少年|成人公开|不限
// status: 报名中|即将开始|已结束   date_start 为 NOT NULL，未知时用报名截止日兜底
const COMPETITIONS = [
  {
    url: 'https://hknmm.com',
    title: '首屆北部都會區馬拉松 2026',
    title_en: 'Northern Metropolis Marathon 2026',
    type: '运动',
    description: '新界鄉議局慶祝成立100周年舉辦的首屆北部都會區馬拉松，賽道破天荒跑上粉嶺繞道。設全馬、半馬、10公里及1.5公里親子組，總名額1.5萬個。11月1日由沙田起步，終點上水北區運動場。全馬挑戰組HK$470、半馬HK$370、10公里HK$320起。其餘組別報名截止9月21日，先到先得。',
    date_start: '2026-11-01',
    date_end: null,
    deadline: '2026-09-21',
    location: '新界',
    venue: '上水北區運動場',
    fee_type: '付费',
    prize: '挑戰組首五名設獎金',
    organizer: '新界鄉議局',
    registration_link: 'https://hknmm.com',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '新界鄉議局',
    universities: null,
  },
  {
    url: 'https://hackathon.cathaypacific.com/en_HK/',
    title: 'Cathay Hackathon 2026（國泰航空黑客松）',
    title_en: 'Cathay Hackathon 2026',
    type: '其他',
    description: '國泰航空主辦的年度編程黑客松（第10屆），開放予所有本科生、研究生及過去兩年內畢業生，不限科系。參賽者可獲商務艙來回機票、最高100,000 Asia Miles及國泰數位/IT實習或畢業培訓生計劃快速通道。9月27日23:59截止報名，10月遞交方案，11月14-15日於香港進行24小時開發日及總決賽路演。',
    date_start: '2026-11-14',
    date_end: null,
    deadline: '2026-09-27',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: '商務艙來回機票、最高100,000 Asia Miles、實習/培訓生計劃快速通道',
    organizer: '國泰航空',
    registration_link: 'https://hackathon.cathaypacific.com/en_HK/',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '國泰航空',
    universities: null,
  },
  {
    url: 'https://www.hongkongdisneyland.com',
    title: '香港迪士尼樂園「奇妙跑步嘉年華」Magic Run Fest 2026',
    title_en: 'Hong Kong Disneyland Magic Run Fest 2026',
    type: '运动',
    description: '香港迪士尼樂園度假區舉辦的「奇妙跑步嘉年華」，設優獸大都會10公里跑、彼思5公里跑、Duffy與好友3公里跑、魔雪奇緣3公里跑四大主題賽事。公眾報名費HK$680，早鳥HK$650。公眾正式報名截止9月27日23:59，11月28-29日舉行，名額先到先得。',
    date_start: '2026-11-28',
    date_end: '2026-11-29',
    deadline: '2026-09-27',
    location: '新界',
    venue: '香港迪士尼樂園度假區',
    fee_type: '付费',
    prize: null,
    organizer: '香港迪士尼樂園度假區',
    registration_link: 'https://www.hongkongdisneyland.com',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港迪士尼樂園度假區',
    universities: null,
  },
  {
    url: 'https://hkumusicfestival.hku.hk/apply',
    title: 'HKU Music Festival 2026（香港大學音樂節）',
    title_en: 'HKU Music Festival 2026',
    type: '音乐表演',
    description: '香港大學音樂節，開放予所有港大學生（本科及研究生，全日制及兼讀制）。徵求3至8分鐘原創音樂作品，涵蓋古典、流行、中樂、音樂劇等。設12個獎項，每個港幣8,000元。11月10日截止報名，12月初公布結果。',
    date_start: '2026-11-10',
    date_end: null,
    deadline: '2026-11-10',
    location: '港岛',
    venue: '香港大學',
    fee_type: '有奖金',
    prize: '12個獎項，每個港幣8,000元',
    organizer: '香港大學',
    registration_link: 'https://hkumusicfestival.hku.hk/apply',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港大學',
    universities: ['香港大學'],
  },
  {
    url: 'https://www.sportsoho.com/pg/match/read/11496084/',
    title: '2026 GARMIN RUN 馬拉松系列賽 — 香港站',
    title_en: 'GARMIN RUN Marathon Series — Hong Kong 2026',
    type: '运动',
    description: 'GARMIN RUN馬拉松系列賽香港站，12月20日於沙田運動場開跑，設21公里、10公里及3公里活力跑。21公里路線途經城門河畔、大學站及白石角海濱公園。報名截止10月31日23:59，先到先得、額滿即止。',
    date_start: '2026-12-20',
    date_end: null,
    deadline: '2026-10-31',
    location: '新界',
    venue: '沙田運動場',
    fee_type: '付费',
    prize: null,
    organizer: 'Garmin',
    registration_link: 'https://www.sportsoho.com/pg/match/read/11496084/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'Garmin',
    universities: null,
  },
  {
    url: 'https://starryworldcpa.com/%e8%b6%85%e6%96%b0%e8%81%b2%e6%ad%8c%e5%94%b1%e5%a4%a7%e8%b3%bd2026%ef%bc%886-10%e6%88%aa%e6%ad%a2%ef%bc%89/',
    title: '超新聲歌唱大賽 2026',
    title_en: 'Super New Voice Singing Contest 2026',
    type: '音乐表演',
    description: '星格流行音樂學院／沙田文藝協會有限公司主辦，設流行曲組、少年組（18歲或以下）、金曲組（35歲或以上）、藝術歌曲組及小組大合唱。初賽10月25日及11月8日，決賽12月13日於沙田大會堂。獎金獎品總值高達HK$50,000。少年組報名費HK$150，其餘組別HK$200。截止報名10月6日。',
    date_start: '2026-10-25',
    date_end: null,
    deadline: '2026-10-06',
    location: '新界',
    venue: '沙田大會堂',
    fee_type: '有奖金',
    prize: '獎金獎品總值高達HK$50,000',
    organizer: '星格流行音樂學院、沙田文藝協會有限公司',
    registration_link: 'https://starryworldcpa.com/%e8%b6%85%e6%96%b0%e8%81%b2%e6%ad%8c%e5%94%b1%e5%a4%a7%e8%b3%bd2026%ef%bc%886-10%e6%88%aa%e6%ad%a2%ef%bc%89/',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '星格流行音樂學院',
    universities: null,
  },
  {
    url: 'https://hkfew.org.hk/%e6%9c%80%e6%96%b0%e6%b6%88%e6%81%af/item/12760-%e5%85%a8%e6%b8%af%e4%b8%ad%e5%b0%8f%e5%ad%b8%e3%80%8c%e5%85%a9%e6%96%87%e4%b8%89%e8%aa%9e%e3%80%8d%e8%8f%81%e8%8b%b1%e5%a4%a7%e6%af%94%e6%8b%bc%ef%bc%88%e7%ac%ac%e4%ba%8c%e5%8d%81%e4%b8%89%e5%b1%86%ef%bc%89%e7%8f%be%e6%ad%a3%e6%8e%a5%e5%8f%97%e5%a0%b1%e5%90%8d%ef%bc%81',
    title: '全港中小學「兩文三語」菁英大比拼（第二十三屆）',
    title_en: '23rd Biliteracy & Trilingualism Elite Competition for Hong Kong Primary & Secondary Schools',
    type: '其他',
    description: '香港教育工作者聯會（教聯會）教育機構有限公司主辦。今屆只接受網上報名，中學組及小學組分別報名。中學組初賽（即席中英作文）10月24日，複賽11月21日，決賽12月12日。中學組截止報名10月10日，小學組10月24日。參賽須經學校提名。',
    date_start: '2026-10-24',
    date_end: null,
    deadline: '2026-10-10',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港教育工作者聯會',
    registration_link: 'https://hkfew.org.hk/%e6%9c%80%e6%96%b0%e6%b6%88%e6%81%af/item/12760-%e5%85%a8%e6%b8%af%e4%b8%ad%e5%b0%8f%e5%ad%b8%e3%80%8c%e5%85%a9%e6%96%87%e4%b8%89%e8%aa%9e%e3%80%8d%e8%8f%81%e8%8b%b1%e5%a4%a7%e6%af%94%e6%8b%bc%ef%bc%88%e7%ac%ac%e4%ba%8c%e5%8d%81%e4%b8%89%e5%b1%86%ef%bc%89%e7%8f%be%e6%ad%a3%e6%8e%a5%e5%8f%97%e5%a0%b1%e5%90%8d%ef%bc%81',
    age_group: '青少年',
    team_size: '个人赛',
    eligibility: '学校提名',
    status: '报名中',
    source: '香港教育工作者聯會',
    universities: null,
  },
]

async function main() {
  console.log(`🔍 待入库 ${COMPETITIONS.length} 条已核实比赛\n`)
  let added = 0, skipped = 0, failed = 0

  for (const c of COMPETITIONS) {
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .eq('source_url', c.url)
      .maybeSingle()
    if (existing) { console.log(`⏭ 已存在: ${c.title.slice(0, 40)}`); skipped++; continue }

    const dateStart = normDate(c.date_start) || normDate(c.deadline)

    const { error } = await supabase.from('competitions').insert({
      title: c.title.slice(0, 200),
      title_en: c.title_en?.slice(0, 200) || null,
      type: c.type,
      description: c.description?.slice(0, 1000) || null,
      date_start: dateStart,
      date_end: normDate(c.date_end),
      registration_deadline: normDate(c.deadline),
      location: c.location,
      venue: c.venue?.slice(0, 200) || null,
      fee_type: c.fee_type || '付费',
      fee_amount: null,
      prize: c.prize?.slice(0, 200) || null,
      organizer: c.organizer?.slice(0, 200) || null,
      registration_link: (c.registration_link || c.url).slice(0, 500),
      age_group: c.age_group || '不限',
      team_size: c.team_size || '不限',
      eligibility: c.eligibility || '不限',
      status: c.status || '报名中',
      source: c.source,
      source_url: c.url,
      target_universities: c.universities,
      review_status: 'pending',
    })

    if (error) { console.log(`  ❌ ${c.title.slice(0, 40)}: ${error.message}`); failed++ }
    else { console.log(`  ✅ [${c.type}] ${c.title.slice(0, 50)}`); added++ }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ 新增 ${added} | ⏭ 跳过 ${skipped} | ❌ 失败 ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count}`)
}

main().catch(console.error)

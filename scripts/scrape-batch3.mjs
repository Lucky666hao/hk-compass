/**
 * 新比赛批量入库（2026-09 批次）—— 重点高校/学生赛事 + 社会公开赛事
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 运行: node scripts/scrape-batch3.mjs
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
    url: 'https://ge.hkbu.edu.hk/en/news/BUildAgenticAIHackathon/',
    title: 'BUild Agentic AI Hackathon（AWS支持）',
    title_en: 'BUild Agentic AI Hackathon — powered by AWS',
    type: 'AI创作',
    description: '香港浸會大學主辦、AWS支持的人工智能黑客松，使用 Kiro 進行 Vibe Coding / Spec-Driven Development 實戰開發，無需編程背景。所有本科生及研究生可參加，每隊 4–5 名學生。',
    date_start: '2026-10-09',
    date_end: null,
    deadline: '2026-09-10',
    location: '九龙',
    venue: '香港浸會大學',
    fee_type: '免费',
    prize: '冠軍隊伍每人 HKD 1,000 禮券等',
    organizer: '香港浸會大學',
    registration_link: 'https://ge.hkbu.edu.hk/en/news/BUildAgenticAIHackathon/',
    age_group: '成人公开',
    team_size: '4-6人',
    eligibility: '不限',
    status: '报名中',
    source: '香港浸會大學',
    universities: null,
  },
  {
    url: 'https://www.hkage.edu.hk/zh-cn/article/2260',
    title: '國際生物奧林匹克－香港區比賽 2026',
    title_en: 'International Biology Olympiad – Hong Kong Contest 2026',
    type: '其他',
    description: '香港資優教育學苑主辦的國際生物奧林匹克香港區選拔賽，選拔香港代表隊參加國際賽。對象為香港中學生，設學校提名（9 月 11 日截止）及學生自我提名（9 月 18 日截止）。',
    date_start: '2026-09-18',
    date_end: null,
    deadline: '2026-09-18',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港資優教育學苑',
    registration_link: 'https://www.hkage.edu.hk/zh-cn/article/2260',
    age_group: '青少年',
    team_size: '个人赛',
    eligibility: '两者皆可',
    status: '报名中',
    source: '香港資優教育學苑',
    universities: null,
  },
  {
    url: 'https://www.polyu.edu.hk/kteo/competitions-and-events/polyu-ifc/polyu-ifc-2026/',
    title: '理大國際未來挑戰賽 2026',
    title_en: 'PolyU International Future Challenge 2026',
    type: '创业路演',
    description: '香港理工大學旗艦創新創業比賽，設多個賽區，徵集具潛力的科技與商業項目。面向理大學生、校友、研究人員及初創團隊，最晚賽區報名截止 10 月 4 日。',
    date_start: '2026-10-04',
    date_end: null,
    deadline: '2026-10-04',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港理工大學（知識轉移及創業處）',
    registration_link: 'https://www.polyu.edu.hk/kteo/competitions-and-events/polyu-ifc/polyu-ifc-2026/',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '不限',
    status: '报名中',
    source: '香港理工大學',
    universities: ['POLYU'],
  },
  {
    url: 'https://www.e-services-web2.landsd.gov.hk/e-services/tc/photoTakingVideoShootingContest-webform.php',
    title: '地政總署「我地的過去、現在、未來」攝影及短片創作比賽',
    title_en: null,
    type: '创意摄影设计',
    description: '香港地政總署為慶祝成立 45 周年舉辦的攝影及短片創作比賽，主題圍繞香港土地與城市變遷。面向香港居民（公開組），以個人名義提交作品，截止 9 月 20 日。',
    date_start: '2026-09-20',
    date_end: null,
    deadline: '2026-09-20',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港地政總署',
    registration_link: 'https://www.e-services-web2.landsd.gov.hk/e-services/tc/photoTakingVideoShootingContest-webform.php',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港地政總署',
    universities: null,
  },
  {
    url: 'https://www.vtc.edu.hk/hqip/upcoming-event-details.php?id=990',
    title: '生成式AI短片創作比賽',
    title_en: 'Generative AI Short Video Creation Competition',
    type: 'AI创作',
    description: '職業訓練局主辦的生成式 AI 短片創作比賽，主題涵蓋智慧港口、海上生活、綠色航運、海事安全等。設中學組（中一至中六，個人或最多 4 人團隊）及公開組（18 歲或以上香港居民），截止 10 月 16 日。',
    date_start: '2026-10-16',
    date_end: null,
    deadline: '2026-10-16',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '職業訓練局（VTC）',
    registration_link: 'https://www.vtc.edu.hk/hqip/upcoming-event-details.php?id=990',
    age_group: '不限',
    team_size: '4-6人',
    eligibility: '不限',
    status: '报名中',
    source: '職業訓練局',
    universities: null,
  },
  {
    url: 'https://timable.com/hk/en/event/6a793d0697024b799a95076e/',
    title: '香港亞太區青年樂隊大賽 2026（香港區選拔賽）',
    title_en: 'Asia Pacific Youth Music Festival 2026 — Hong Kong Regional',
    type: '音乐表演',
    description: '香港青年協會主辦的青年樂隊比賽，香港區選拔賽勝出者可晉級亞太區總決賽。以樂隊為單位報名，截止 9 月 11 日，亞太區總決賽 12 月 11 日舉行。',
    date_start: '2026-12-11',
    date_end: null,
    deadline: '2026-09-11',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港青年協會（HKFYG）',
    registration_link: 'https://form.jotform.com/261801863808462',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '不限',
    status: '报名中',
    source: '香港青年協會',
    universities: null,
  },
  {
    url: 'https://www.paobaodao.com/hong-kong/race/hong-kong-aquathlon-championships/',
    title: '2026 香港水陸兩項錦標賽',
    title_en: 'Hong Kong Aquathlon Championships 2026',
    type: '运动',
    description: '香港三項鐵人總會主辦的水陸兩項（游泳＋跑步）錦標賽，公開報名，報名期 9 月 1 日至 9 月 23 日，10 月 11 日於新界舉行。',
    date_start: '2026-10-11',
    date_end: null,
    deadline: '2026-09-23',
    location: '新界',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: '香港三項鐵人總會',
    registration_link: 'https://www.paobaodao.com/hong-kong/race/hong-kong-aquathlon-championships/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港三項鐵人總會',
    universities: null,
  },
  {
    url: 'https://www.archery.org.hk/content/2026-2027%E5%B9%B4%E5%BA%A6%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%AE%A4%E5%85%A7%E5%B0%84%E7%AE%AD%E5%85%AC%E9%96%8B%E8%B3%BD',
    title: '2026-2027年度香港青少年室內射箭公開賽',
    title_en: 'Hong Kong Youth Indoor Archery Open 2026-2027',
    type: '运动',
    description: '香港射箭總會主辦的青少年室內射箭公開賽，設多個弓種與年齡組別，10 月 18 日及 25 日舉行，報名截止 9 月 25 日。',
    date_start: '2026-10-18',
    date_end: '2026-10-25',
    deadline: '2026-09-25',
    location: '九龙',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: '香港射箭總會',
    registration_link: 'https://www.archery.org.hk/content/2026-2027%E5%B9%B4%E5%BA%A6%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%AE%A4%E5%85%A7%E5%B0%84%E7%AE%AD%E5%85%AC%E9%96%8B%E8%B3%BD',
    age_group: '青少年',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港射箭總會',
    universities: null,
  },
  {
    url: 'https://www.jotform.com/form/261652682422457',
    title: '2026年香港沿徑定向入圍賽（速決賽）',
    title_en: 'Hong Kong Trail Orienteering Qualification 2026 (Temp O)',
    type: '运动',
    description: '香港定向總會主辦的沿徑定向入圍賽（速決賽），10 月 1 日於青衣公園舉行，報名截止 9 月 17 日，公開報名。',
    date_start: '2026-10-01',
    date_end: null,
    deadline: '2026-09-17',
    location: '新界',
    venue: '青衣公園',
    fee_type: '付费',
    prize: null,
    organizer: '香港定向總會',
    registration_link: 'https://www.jotform.com/form/261652682422457',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港定向總會',
    universities: null,
  },
  {
    url: 'https://news.mingpao.com/ins/%E7%86%B1%E9%96%80hotpick/article/20260820/special/1787141110389',
    title: '新鴻基地產香港單車節 2026',
    title_en: 'Sun Hung Kai Properties Hong Kong Cyclothon 2026',
    type: '运动',
    description: '香港旅遊發展局主辦的大型單車盛事，10 月 11 日舉行，首設「五隧三橋」路線，西九設觀賞區及嘉年華。公眾報名先到先得，額滿即止。',
    date_start: '2026-10-11',
    date_end: null,
    deadline: null,
    location: '九龙',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港旅遊發展局',
    registration_link: 'https://news.mingpao.com/ins/%E7%86%B1%E9%96%80hotpick/article/20260820/special/1787141110389',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港旅遊發展局',
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
    else { console.log(`  ✅ [${c.type}] ${c.title.slice(0, 50)}${c.universities ? ' → ' + c.universities.join(',') : ''}`); added++ }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ 新增 ${added} | ⏭ 跳过 ${skipped} | ❌ 失败 ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count}`)
}

main().catch(console.error)

/**
 * 香港大專院校比賽批量入库（2026-11 批次16）—— 继续补充 /uni 板块
 * 数据来源：WebSearch 发现 → curl+cheerio 逐条核实官方页面（全部 source_url 返回 200、截止日从原文提取）。
 * 均为高校/官方机构主办，面向香港大专生，不编造、不含大陆征稿平台。
 * target_universities 存「大写缩写」，与 uni 页面 `uni.slug.toUpperCase()` 比较逻辑一致；
 * review_status 一律 pending，由人工审核（不自动通过）。
 * 运行: node scripts/scrape-batch16.mjs
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

const ALL8 = ['HKU', 'CUHK', 'HKUST', 'CITYU', 'POLYU', 'HKBU', 'LINGNAN', 'EDUHK']

const COMPETITIONS = [
  {
    url: 'https://www.gs1hk.org/iotdatahackathon',
    title: 'IOT Data Hackathon 2027',
    title_en: 'IOT Data Hackathon 2027',
    type: '其他',
    description: '香港貨品編碼協會（GS1 HK）主辦，聯同數碼港、香港科技園及數字政策辦公室協辦，以真實數據結合科技。設學生組（隊員須為大專院校在讀學生、至少一名就讀香港大專院校）及專業組，每隊最多6人、費用全免。2026年12月20日截止報名，2027年1月8日簡介會，3月20-21日黑客松暨匯報日。查詢 iot@gs1hk.org。',
    deadline: '2026-12-20',
    dateStart: '2027-01-08',
    dateEnd: '2027-03-21',
    fee_type: '免费',
    prize: null,
    organizer: '香港貨品編碼協會（GS1 HK）× 數碼港 × 香港科技園',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港貨品編碼協會（GS1 HK）',
    universities: ALL8,
  },
  {
    url: 'http://cpo.eduhk.hk/en/news-and-events/events/upcoming/siw2027-hongkong',
    title: 'Startup Innovation Weekend (SIW) 2027 香港區選拔賽',
    title_en: 'National Selection of Startup Innovation Weekend (SIW) 2027 for Hong Kong, China',
    type: '创业路演',
    description: '全球初創創新週末（SIW）中國香港區選拔賽，面向大學創業團隊及成立不超過5年的初創（需有MVP或高保真原型）。2026年11月30日截止申請，12月19日香港現場選拔，優勝隊伍可代表中國香港出戰2027年4月雅加達全球賽。詳見 siw.icia.global。',
    deadline: '2026-11-30',
    dateStart: '2026-12-19',
    dateEnd: '2026-12-19',
    fee_type: '免费',
    prize: '優勝者可代表中國香港出戰2027年4月雅加達全球賽',
    organizer: 'Startup Innovation Weekend（SIW）× 香港教育大學',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港教育大學',
    universities: ALL8,
  },
  {
    url: 'https://i.cs.hku.hk/~icpc/',
    title: '第51屆ICPC國際大學生程序設計競賽亞洲區域賽（香港站）',
    title_en: 'The 51st ICPC Asia Hong Kong Regional Contest',
    type: '其他',
    description: '國際大學生程序設計競賽（ICPC）第51屆亞洲區域賽香港站，由香港大學主辦，2027年1月9-10日現場賽。香港及澳門院校每間最多註冊2隊，須於2026年11月14日前於ICPC Global及PTA系統完成登記（由院校教練提名）。詳見 i.cs.hku.hk/~icpc/。',
    deadline: '2026-11-14',
    dateStart: '2027-01-09',
    dateEnd: '2027-01-10',
    fee_type: '免费',
    prize: null,
    organizer: '香港大學（ICPC Asia）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '学校提名',
    source: '香港大學',
    universities: ALL8,
  },
  {
    url: 'https://ceant.org.hk/distich/',
    title: '第三十一屆全港學界對聯創作比賽（大學及大專組）',
    title_en: '31st Hong Kong Students Couplet Writing Competition (University & Tertiary)',
    type: '其他',
    description: '新市鎮文化教育協會主辦、伍絜宜慈善基金贊助。大學及大專組指定上聯「塞下秋來風景異」（律聯），2026-2027學年就讀不超過學士學位之全日制在港學生免費參加，每人最多投兩稿。冠軍HKD1,000及紀念杯、亞軍HKD800、季軍HKD600、優異獎HKD400。2027年1月12日截止網上報名。',
    deadline: '2027-01-12',
    dateStart: '2026-10-01',
    dateEnd: null,
    fee_type: '有奖金',
    prize: '冠軍HKD1,000及紀念杯、亞軍HKD800、季軍HKD600、優異獎HKD400、特別獎HKD200',
    organizer: '新市鎮文化教育協會（伍絜宜慈善基金贊助）',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    source: '新市鎮文化教育協會',
    universities: ALL8,
  },
]

async function main() {
  console.log(`🔍 待入库 ${COMPETITIONS.length} 条已核实大專院校比赛\n`)
  let added = 0, skipped = 0, failed = 0

  for (const c of COMPETITIONS) {
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .eq('source_url', c.url)
      .maybeSingle()
    if (existing) { console.log(`⏭ 已存在: ${c.title.slice(0, 40)}`); skipped++; continue }

    const { error } = await supabase.from('competitions').insert({
      title: c.title.slice(0, 200),
      title_en: c.title_en?.slice(0, 200) || null,
      type: c.type,
      description: c.description?.slice(0, 1000) || null,
      date_start: normDate(c.dateStart) || normDate(c.deadline),
      date_end: normDate(c.dateEnd),
      registration_deadline: normDate(c.deadline),
      location: '线上',
      venue: null,
      fee_type: c.fee_type || '免费',
      fee_amount: null,
      prize: c.prize?.slice(0, 200) || null,
      organizer: c.organizer?.slice(0, 200) || null,
      registration_link: c.url.slice(0, 500),
      age_group: c.age_group || '不限',
      team_size: c.team_size || '不限',
      eligibility: c.eligibility || '个人报名',
      status: '报名中',
      source: c.source,
      source_url: c.url,
      target_universities: c.universities,
      review_status: 'pending',
    })

    if (error) { console.log(`  ❌ ${c.title.slice(0, 40)}: ${error.message}`); failed++ }
    else { console.log(`  ✅ [${c.type}] ${c.title.slice(0, 50)} → ${c.universities?.length || 0} 校`); added++ }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ 新增 ${added} | ⏭ 跳过 ${skipped} | ❌ 失败 ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count}`)
}

main().catch(console.error)

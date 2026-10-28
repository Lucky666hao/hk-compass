/**
 * 香港大專院校比賽批量入库（2026-10 批次14）—— 继续补充 /uni 板块
 * 数据来源：WebSearch 发现 → curl+cheerio 逐条核实官方页面（全部 source_url 返回 200、截止日从原文提取）。
 * 均为高校/官方机构/名企主办，面向香港大专生，不编造、不含大陆征稿平台。
 * target_universities 存「大写缩写」，与 uni 页面 `uni.slug.toUpperCase()` 比较逻辑一致；review_status 一律 pending。
 * 运行: node scripts/scrape-batch14.mjs
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
    url: 'https://www.samsung.com/hk/offer/solvefortomorrow/',
    title: 'Samsung Solve for Tomorrow 2026（大專組）',
    title_en: 'Samsung Solve for Tomorrow 2026',
    type: '其他',
    description: '三星電子香港主辦的STEM創新比賽，主題「看見所需，啟動未來」，結合AI工具、設計思維與STEM，圍繞「包容社區／體育與科技／環境永續」提出社會問題解決方案。分小學、中學、大專三組；大專組2至5人同校全日制學生（學士／副學士／高級文憑，研究生除外）。2026年11月13日23:59截止報名，12月4日前遞交概念計劃書。',
    deadline: '2026-11-13',
    dateStart: '2026-09-03',
    dateEnd: '2027-04-30',
    fee_type: '免费',
    prize: null,
    organizer: '三星電子香港（Samsung Electronics Hong Kong）',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    source: '三星電子香港',
    universities: ALL8,
  },
  {
    url: 'http://daretochange.internad.hk/tc/competition_details.aspx',
    title: '青企局「敢闖。敢創」創業比賽（大專組）',
    title_en: "YDC 'Dare to Change' Business Plan Competition (Tertiary)",
    type: '创业路演',
    description: '青年企業家發展局（YDC）主辦，讓就讀香港大專院校的全日制學生及2026年度全日制大專課程畢業生，以6分鐘創業計劃匯報向評審展示創新商業意念。晉級決賽可獲創業資助及專家一對一指導，得獎者有機會於香港科學園獲免租辦公室。2027年1月29日下午5時截止網上報名，3月22日前遞交創業計劃簡報。',
    deadline: '2027-01-29',
    dateStart: '2026-11-02',
    dateEnd: '2027-07-03',
    fee_type: '免费',
    prize: '晉級決賽隊伍獲創業資助；得獎者有機會於香港科學園獲免租辦公室',
    organizer: '青年企業家發展局（YDC）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '青年企業家發展局',
    universities: ALL8,
  },
  {
    url: 'https://www.hkmu.edu.hk/sao/tc/sc-other-opportunities/%e5%bb%a3%e9%9d%92%e8%8f%af%e6%9c%8d%e5%a5%bd%e8%81%b2%e9%9f%b32026/',
    title: '廣青華服好聲音2026（大專組）',
    title_en: 'Guangdong Youth Hanfu Voice 2026',
    type: '音乐表演',
    description: '香港廣東青年總會主辦，以華服為載體，結合音樂、演講、朗誦、舞蹈等形式（鼓勵用客家話或潮州話表演），線上影片甄選。設大專組及公開組（12至40歲香港青年），費用全免。初賽影片遞交至2026年12月16日，2027年2月決賽。',
    deadline: '2026-12-16',
    dateStart: '2026-09-18',
    dateEnd: '2027-02-28',
    fee_type: '免费',
    prize: '各組冠軍HK$1,500禮券、亞軍HK$1,200、季軍HK$900、優異獎HK$300及最佳演繹／台風獎',
    organizer: '香港廣東青年總會',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    source: '香港廣東青年總會',
    universities: ALL8,
  },
  {
    url: 'https://osa-career.hksyu.edu/2026/10/20/h2-future-%c2%b7-ai-for-good-challenge/',
    title: '氫建未來·小紅花AI向善挑戰賽 2026-2027',
    title_en: 'H2Future · AI for Good Challenge 2026–2027',
    type: '其他',
    description: '以「碳中和」為主題，設「氫能源應用」與「低碳生活」兩大選項，配合「AI應用」與「AI智能體」賽道，提升高中及大專學生的AI技術水平，實踐以人為本的「AI向善」精神。全港高中及大專學生（中學組及大專組）隊際2至5人參賽。2026年11月6日截止報名。',
    deadline: '2026-11-06',
    dateStart: '2026-10-20',
    dateEnd: null,
    fee_type: '免费',
    prize: null,
    organizer: '氫建未來 H2Future（小紅花AI向善）',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港樹仁大學',
    universities: ALL8,
  },
  {
    url: 'https://www.startmeup.hk/hong-kong-techathon-11th-edition/',
    title: 'Hong Kong Techathon+ 第11屆',
    title_en: 'Hong Kong Techathon+ 11th Edition',
    type: '创业路演',
    description: '香港科技園公司（HKSTP）聯同15間大學及機構合辦的旗艦科創大賽，本屆核心主題聚焦「AI+」，面向學生及科研創業者，是進入香港科技生態的起步平台。勝出者可獲現金獎、創投資金及直接進入香港科技生態。2027年1月11日截止提交。',
    deadline: '2027-01-11',
    dateStart: '2027-01-11',
    dateEnd: null,
    fee_type: '免费',
    prize: '現金獎、創投資金及直接進入香港科技生態',
    organizer: '香港科技園公司（HKSTP）聯同15間大學及機構',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港科技園公司',
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

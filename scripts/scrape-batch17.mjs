/**
 * 香港大專院校比賽批量入库（2026-11 批次17）—— 继续补充 /uni 板块
 * 数据来源：WebSearch 发现 → curl+cheerio 逐条核实官方页面（全部 source_url 返回 200、截止日从原文提取）。
 * 均为高校/官方机构/名企主办，面向香港大专生，不编造、不含大陆征稿平台。
 * target_universities 存「大写缩写」，与 uni 页面 `uni.slug.toUpperCase()` 比较逻辑一致；
 * review_status 一律 pending，由人工审核（不自动通过）。
 * 运行: node scripts/scrape-batch17.mjs
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
    url: 'https://jahk.org/program-overviews/healthnext-challenge/',
    title: 'Cigna Healthcare x JA HealthNext Challenge 2026/27',
    title_en: 'Cigna Healthcare x JA HealthNext Challenge 2026/27',
    type: '其他',
    description: '信諾環球香港（Cigna）與青年成就香港部（JA Hong Kong）合辦，邀請香港30歲以下大專學生4至6人組隊，圍繞「更合適的醫療保障／更佳的醫療體驗／更健康的生活」三大方向，構思具實際應用潛力的創新方案。2026年12月11日截止申請，2027年1月22日前遞交方案，6月總決賽暨頒獎。',
    deadline: '2026-12-11',
    dateStart: '2026-12-11',
    dateEnd: '2027-06-30',
    fee_type: '有奖金',
    prize: '冠軍HK$50,000、亞軍HK$30,000、季軍HK$15,000及實習機會',
    organizer: '信諾環球香港（Cigna）× 青年成就香港部（JA Hong Kong）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '青年成就香港部（JA Hong Kong）',
    universities: ALL8,
  },
  {
    url: 'https://www.hkfyg.org.hk/zh/2026/11/11/%e5%a4%a7%e7%81%a3%e5%8d%80%e3%80%8c%e6%99%ba%e6%85%a7%e8%aa%bf%e8%a7%a3%e3%80%8d%e9%9d%92%e5%b9%b4%e6%8f%90%e6%a1%88%e6%af%94%e8%b3%bd/',
    title: '大灣區「智慧調解」青年調解提案比賽（大專及公開組）',
    title_en: 'Greater Bay Area "Smart Mediation" Youth Proposal Competition (Tertiary)',
    type: '其他',
    description: '青協「大灣區青年調解訓練中心」主辦，主題「多元調解・智融共贏」，設計有助促進溝通、預防衝突及推廣調解文化的創新方案。大專及公開組對象為全日制大專生或35歲或以下青年，個人或最多4人組隊。設調解入門工作坊及行業領袖分享，決賽隊伍獲資深調解員指導及到訪深圳。冠軍HK$10,000。2026年12月28日截止報名。',
    deadline: '2026-12-28',
    dateStart: '2026-12-28',
    dateEnd: null,
    fee_type: '有奖金',
    prize: '冠軍HK$10,000、亞軍及季軍亦設獎金；決賽隊伍獲導師指導及深圳交流',
    organizer: '香港青年協會（大灣區青年調解訓練中心）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港青年協會',
    universities: ALL8,
  },
  {
    url: 'https://www.hkfew.org.hk/%e6%9c%80%e6%96%b0%e6%b6%88%e6%81%af/item/12870-%e3%80%90%e5%9b%9e%e6%ad%b830%e5%b9%b4%e7%8d%bb%e7%a6%ae%e3%80%91%e3%80%8a%e6%a6%9c%e6%a8%a3%e5%b0%91%e5%b9%b4%e3%80%8b%e5%be%ae%e9%9b%bb%e5%bd%b1%e7%b3%bb%e5%88%97%e6%b4%bb%e5%8b%95%e6%af%94%e8%b3%bd%e2%94%80%e2%94%80%e8%ac%9b%e5%a5%bd%e9%a6%99%e6%b8%af%e6%95%85%e4%ba%8b%e3%83%bb%e6%8b%8d%e5%87%ba%e5%b0%91%e5%b9%b4%e9%a2%a8%e5%bd%a9-%e7%8f%be%e6%ad%a3%e6%8e%a5%e5%8f%97%e5%a0%b1%e5%90%8d',
    title: '《榜樣少年》微電影系列活動比賽（大專組）',
    title_en: '"Model Youth" Microfilm Competition (Tertiary)',
    type: '创意摄影设计',
    description: '中國電影基金會主辦、香港教育局支持、教聯會及香港語言研究中心協辦，慶祝香港回歸30周年。以「講好香港故事・拍出少年風彩」為主題，歡迎全港各大專、中學及高小學校組隊以微電影發掘本地故事、文化傳承與社區精神，得獎者獲豐富獎金，得獎作品有機會於香港中央圖書館展出及代表香港參加全國《榜樣少年星光盃》微電影大賽。2027年1月9日截止報名、1月29日前遞交影片。',
    deadline: '2027-01-09',
    dateStart: '2027-01-09',
    dateEnd: null,
    fee_type: '免费',
    prize: null,
    organizer: '中國電影基金會（香港教育局支持）',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港教育工作者聯會',
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

/**
 * 香港大專院校比賽批量入库（2026-10 批次13）—— 为 /uni 板块补充真实大学/大专赛事
 * 数据来源：WebSearch 发现 → curl+cheerio 逐条核实官方页面（全部 source_url 返回 200、截止日从原文提取）。
 * 均为高校/官方机构主办，面向香港大专生，不编造、不含大陆征稿平台。
 * target_universities 存「大写缩写」，与 uni 页面 `uni.slug.toUpperCase()` 比较逻辑一致；
 * null = 面向全港不限校（本批全部面向香港各大专院校，故标八大）。review_status 一律 pending，由人工审核。
 * 运行: node scripts/scrape-batch13.mjs
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

// 香港八大公立院校（对应 university-data.ts 的 slug，大写后与比较逻辑一致）
const ALL8 = ['HKU', 'CUHK', 'HKUST', 'CITYU', 'POLYU', 'HKBU', 'LINGNAN', 'EDUHK']

const COMPETITIONS = [
  {
    url: 'https://ug.hkubs.hku.hk/competition/orbis-future-vision-leaders-program-2026-27-visionary-startup',
    title: '奧比斯未來願景領袖計劃 2026/27：創業組（Visionary Startup）',
    title_en: 'Orbis Future Vision Leaders Program 2026/27: Visionary Startup',
    type: '创业路演',
    description: '由奧比斯（Orbis）與香港大學經濟及工商管理學院合辦，面向香港及海外大學生，以聯合國可持續發展目標（SDG）為框架設計應對全球失明問題的社會創業方案。2至5人組隊，獲初創企業CEO一對一指導。2026年11月25日中午12時前提交初步方案至 student.hk@orbis.org。',
    deadline: '2026-11-25',
    dateStart: '2026-11-25',
    dateEnd: null,
    fee_type: '免费',
    prize: null,
    organizer: '奧比斯 Orbis × 香港大學經濟及工商管理學院（FBE）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港大學經濟及工商管理學院',
    universities: ALL8,
  },
  {
    url: 'https://adsci.hksyu.edu/news-and-events/news/detail/20260930_HKSAR_30th_SmartTech_Design_Competition',
    title: 'HKSAR 30周年智能科技設計比賽：AIoT共建北部都會區',
    title_en: 'HKSAR 30th Smart-Tech Design Competition: AIoT for Northern Metropolis',
    type: '其他',
    description: '慶祝香港特區成立30周年，小米冠名贊助、香港城市大學協辦。以「智能生活／綠色智慧社區／智能基建」為主題，2至4人同校組隊（大專組限30隊，先到先得），利用小米AIoT平台搭建模型，免報名費、小米提供硬件培訓。2026年11月13日截止報名、2027年3月5日遞交作品。查詢 aiot.comp@cityu.edu.hk。',
    deadline: '2026-11-13',
    dateStart: '2026-10-01',
    dateEnd: '2027-04-24',
    fee_type: '免费',
    prize: '冠軍隊伍可赴北京參觀小米電動車智能工廠；小米贊助智能家居及數碼產品',
    organizer: '小米集團（冠名贊助）× 香港城市大學',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港城市大學',
    universities: ALL8,
  },
  {
    url: 'https://eo.hkbu.edu.hk/low-carbon-campus/Latest-updates-Events-and-Activities/2026/Recyclables-Art-Creation-Competition.html',
    title: '回收物料藝術創作比賽',
    title_en: 'Recyclables Art Creation Competition',
    type: '创意摄影设计',
    description: 'GREEN@TIN HAU（環保署「綠在區區」）主辦，邀請全港大專及中學生把回收物料升級再造為日常用品、創意家具或藝術作品，設三組各設冠亞季軍（冠軍HK$10,000）。個人或隊伍免費報名，入圍作品有機會公開展出。2026年11月13日截止報名、12月18日截止初選作品遞交。',
    deadline: '2026-11-13',
    dateStart: '2026-11-13',
    dateEnd: '2026-12-18',
    fee_type: '有奖金',
    prize: '各組冠軍HK$10,000、亞軍HK$5,000、季軍HK$3,000',
    organizer: 'GREEN@TIN HAU（環保署「綠在區區」）',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港浸會大學',
    universities: ALL8,
  },
  {
    url: 'https://ec.hkust.edu.hk/events/global-student-entrepreneur-awards-gsea-2026-2027',
    title: '全球學生創業家大獎 GSEA 2026-2027（香港區）',
    title_en: 'Global Student Entrepreneur Awards (GSEA) 2026 - 2027',
    type: '创业路演',
    description: '由香港科技大學創業中心主辦的全球學生創業家大獎（GSEA）香港區賽，面向在學創業者。2026年11月4日截止申請，11月17日香港準決賽，11月26日GSEA中國區總決賽。',
    deadline: '2026-11-04',
    dateStart: '2026-11-04',
    dateEnd: '2026-11-26',
    fee_type: '免费',
    prize: null,
    organizer: '香港科技大學創業中心（Entrepreneurship Center）',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    source: '香港科技大學',
    universities: ['HKUST'],
  },
  {
    url: 'https://competition.hkgbc.org.hk/tc/latest_news_inside.php?id=1079',
    title: '「綠色空間 由我創造」學生比賽 2026-2027',
    title_en: '"My Green Space" Student Competition 2026-2027',
    type: '创意摄影设计',
    description: '香港綠色建築議會（HKGBC）主辦，本屆主題「自然正向的理想建築環境」，歡迎本地中小學生及本地／大灣區大專生以二維藝術、三維模型、多媒體或提案形式參賽，個人或小組（最多6人）。2026年12月31日截止報名，2027年3月31日下午6時前遞交作品，獎金最高HK$8,000。',
    deadline: '2026-12-31',
    dateStart: '2026-09-01',
    dateEnd: '2027-03-31',
    fee_type: '有奖金',
    prize: '獎金最高HK$8,000及獎狀，得獎作品有機會公開展出',
    organizer: '香港綠色建築議會（HKGBC）',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    source: '香港綠色建築議會',
    universities: ALL8,
  },
  {
    url: 'https://www.sense-program.hk/secalendar/%E5%B0%8F%E6%83%B3%E6%B3%95-%C2%B7-%E5%A4%A7%E6%94%B9%E8%AE%8A%E2%80%94%E5%85%A8%E6%B8%AF%E5%8F%AF%E6%8C%81%E7%BA%8C%E7%99%BC%E5%B1%95%E8%88%87%E7%B6%A0%E8%89%B2%E9%BB%9E%E5%AD%90%E5%80%8B%E4%BA%BA%E6%AF%94%E8%B3%BD-2026',
    title: '小想法 · 大改變—全港可持續發展與綠色點子個人比賽 2026',
    title_en: null,
    type: '其他',
    description: '「可持續發展與綠色學校計劃」由香港交易所慈善基金資助、豐盛社企學會主辦。全港學生（高小／初中／高中／大專組）免費以個人名義參加，於 MintMind.ai 平台回答5條問題、提出可持續發展與綠色點子。大專組冠軍獲現金券HK$1,000。2026年12月4日截止登記。',
    deadline: '2026-12-04',
    dateStart: '2026-09-21',
    dateEnd: '2027-06-19',
    fee_type: '有奖金',
    prize: '大專組冠軍現金券HK$1,000、亞軍HK$500、季軍HK$300、優異獎HK$100',
    organizer: '豐盛社企學會（香港交易所慈善基金資助）',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '两者皆可',
    source: '豐盛社企學會',
    universities: ALL8,
  },
  {
    url: 'https://www.cwisa.com/en/application.php',
    title: '2026俊和學生創新獎',
    title_en: 'Chun Wo Innovation Student Awards 2026 (CWISA)',
    type: '其他',
    description: '俊和發展集團主辦，主題「點亮城市 AI賦能 建設永續未來」，鼓勵香港及大灣區高校全日制本科生及研究生以工程創新方案推動可持續城市與智慧城市發展。個人或組隊（每組最多8人、至少一名工程相關院系成員），免費全程線上提交。金獎HK$100,000。2026年12月14日截止報名。',
    deadline: '2026-12-14',
    dateStart: '2026-09-14',
    dateEnd: null,
    fee_type: '有奖金',
    prize: '金獎HK$100,000、銀獎HK$50,000、銅獎HK$30,000及多個特別獎',
    organizer: '俊和發展集團（亞洲聯合基建控股）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '俊和發展集團',
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

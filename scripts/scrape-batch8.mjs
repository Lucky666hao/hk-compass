/**
 * 新比赛批量入库（2026-09 批次8）—— 机械人/短片/写作/艺术/漫画/问答/厨艺
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 已剔除：世界華人學生作文大賽(中國僑聯)、《讀者》徵文(readers-hk 大陸刊物)、
 *         環球藝術國際設計獎/香港青年創新設計獎/HKVAA(xingxiancn/chuangyisai/newunivs 大陆平台)、
 *         全港中學學界原創日本漫畫IP角色創作大賽(5/29已截止)、小棋聖盃(3/22已截止)。
 * 运行: node scripts/scrape-batch8.mjs
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
    url: 'https://events.vex.com/zh-CN/robot-competitions/vex-iq-competition/RE-VIQRC-26-4822.html',
    title: '蔡章閣盃 VEX IQ 機械人挑戰賽 2026',
    title_en: 'Choi Cheung Kok Cup VEX IQ Robotics Competition 2026',
    type: '其他',
    description: 'VEX IQ機械人挑戰賽（中／小學組），比賽11月14日於屯門廠商會蔡章閣中學舉行。報名費US$50／HK$399。截止報名及付款11月2日。',
    date_start: '2026-11-14',
    date_end: null,
    deadline: '2026-11-02',
    location: '新界',
    venue: '廠商會蔡章閣中學（屯門）',
    fee_type: '付费',
    prize: null,
    organizer: 'VEX',
    registration_link: 'https://events.vex.com/zh-CN/robot-competitions/vex-iq-competition/RE-VIQRC-26-4822.html',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '学校提名',
    status: '报名中',
    source: 'VEX',
    universities: null,
  },
  {
    url: 'https://events.vex.com/ru/robot-competitions/vex-iq-competition/RE-VIQRC-26-5388.html',
    title: '離島盃 VEX IQ 機械人錦標賽 2026',
    title_en: 'Outlying Islands Cup VEX IQ Tournament 2026',
    type: '其他',
    description: 'VEX IQ機械人錦標賽（小學／中學組），比賽11月21日於離島區舉行。報名費US$100／HK$785，付款截止11月9日。截止報名11月20日。',
    date_start: '2026-11-21',
    date_end: null,
    deadline: '2026-11-20',
    location: '新界',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: 'VEX',
    registration_link: 'https://events.vex.com/ru/robot-competitions/vex-iq-competition/RE-VIQRC-26-5388.html',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '学校提名',
    status: '报名中',
    source: 'VEX',
    universities: null,
  },
  {
    url: 'https://blog.scs.org.hk/2026/09/01/%e3%80%90%e6%9c%80%e6%96%b0%e6%b4%bb%e5%8b%95%e3%80%91%e9%a6%99%e6%b8%af%e6%80%a7%e6%96%87%e5%8c%96%e5%ad%b8%e6%9c%83-25-%e9%80%b1%e5%b9%b4-%e3%80%8c%e6%88%91%e8%81%bd%e9%81%8e%e6%9c%80/',
    title: '「我聽過…最浪漫的愛情故事」青少年短片比賽',
    title_en: '"The Most Romantic Love Story I Have Ever Heard" Youth Short Film Competition',
    type: '创意摄影设计',
    description: '香港性文化學會25週年主辦，邀請全港在讀中學生及大專生以2分鐘內短片講述「我聽過…最浪漫的愛情故事」，可真人或手繪、動畫等不露臉形式，嚴禁AI代製。冠軍HK$800、亞軍HK$500、季軍HK$300，優異獎HK$100。截止報名及交件10月18日，11月7日於沙田公園頒獎。',
    date_start: '2026-11-07',
    date_end: null,
    deadline: '2026-10-18',
    location: '线上',
    venue: '沙田公園（頒獎）',
    fee_type: '有奖金',
    prize: '冠軍HK$800、亞軍HK$500、季軍HK$300、優異獎HK$100',
    organizer: '香港性文化學會',
    registration_link: 'https://blog.scs.org.hk/2026/09/01/%e3%80%90%e6%9c%80%e6%96%b0%e6%b4%bb%e5%8b%95%e3%80%91%e9%a6%99%e6%b8%af%e6%80%a7%e6%96%87%e5%8c%96%e5%ad%b8%e6%9c%83-25-%e9%80%b1%e5%b9%b4-%e3%80%8c%e6%88%91%e8%81%bd%e9%81%8e%e6%9c%80/',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港性文化學會',
    universities: null,
  },
  {
    url: 'https://www.i-learner.edu.hk/zh/i-learner-writing-competition-2026/',
    title: 'i-Learner Writing Competition 2026',
    title_en: 'i-Learner Writing Competition 2026',
    type: '其他',
    description: 'i-Learner主辦的英文寫作比賽，開放予香港及澳門學生（小一至中六），分虛構及非虛構寫作，設小學低／高年級及初中／高中組。獎金獎品總值HK$60,000，另設獎盃及證書。截止11月30日。',
    date_start: '2026-11-30',
    date_end: null,
    deadline: '2026-11-30',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: '獎金獎品總值HK$60,000',
    organizer: 'i-Learner',
    registration_link: 'https://www.i-learner.edu.hk/zh/i-learner-writing-competition-2026/',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'i-Learner',
    universities: null,
  },
  {
    url: 'https://www.hkipcc.org.hk',
    title: '2026-2027 文學之星中學生作文大賽（香港賽區）',
    title_en: '2026-2027 Star of Literature Secondary School Essay Competition (Hong Kong Region)',
    type: '其他',
    description: '中學生作文大賽（香港賽區），設初中組（中一至中三）及高中組（中四至中六）。參賽學校須先進行校內初賽，初中、高中每組須至少80名學生參加，每校每組最多提交5篇作品，經學校網上遞交（報名網頁9月15日起開放）。截止遞交11月10日。',
    date_start: '2026-11-10',
    date_end: null,
    deadline: '2026-11-10',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: null,
    registration_link: 'https://www.hkipcc.org.hk',
    age_group: '青少年',
    team_size: '个人赛',
    eligibility: '学校提名',
    status: '报名中',
    source: '文學之星中學生作文大賽',
    universities: null,
  },
  {
    url: 'https://www.kssa.org.hk/node/158',
    title: '中文寫作比賽 2026（海鷗社 香港區選拔賽）',
    title_en: 'Chinese Writing Competition 2026 (Sea Gull Society, Hong Kong Region)',
    type: '其他',
    description: '海鷗社主辦的香港區選拔賽，設高小組、初中組（中一至中三）、高中組（中四至中六），須以原稿紙寫作，初中不少於800字、高中不少於1000字。費用全免。截止11月20日（以郵戳為準），結果12月下旬以電郵通知。',
    date_start: '2026-11-20',
    date_end: null,
    deadline: '2026-11-20',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '海鷗社',
    registration_link: 'https://www.kssa.org.hk/node/158',
    age_group: '青少年',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '海鷗社',
    universities: null,
  },
  {
    url: 'https://www.startartworkshop.com/post/gvaa-2026-%E8%A6%96%E8%A6%BA%E8%97%9D%E8%A1%93%E5%A4%A7%E8%B3%BD-%E7%A7%8B%E5%AD%A3%E8%B3%BD',
    title: 'GVAA 2026 視覺藝術大賽（秋季賽）',
    title_en: 'GVAA 2026 Visual Art Competition (Autumn)',
    type: '创意摄影设计',
    description: 'GVAA視覺藝術大賽秋季賽，即日起至9月30日報名及提交作品，結果暫定10月下旬公布。',
    date_start: '2026-09-30',
    date_end: null,
    deadline: '2026-09-30',
    location: '线上',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: 'GVAA',
    registration_link: 'https://www.startartworkshop.com/post/gvaa-2026-%E8%A6%96%E8%A6%BA%E8%97%9D%E8%A1%93%E5%A4%A7%E8%B3%BD-%E7%A7%8B%E5%AD%A3%E8%B3%BD',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'GVAA',
    universities: null,
  },
  {
    url: 'https://www.hkyouthnurture.org/basiclawcomics2026',
    title: '《基本法》及「一國兩制」漫畫設計比賽 2026',
    title_en: 'Basic Law & "One Country, Two Systems" Comic Design Competition 2026',
    type: '创意摄影设计',
    description: '香港青年培育協會主辦，以漫畫形式表達《基本法》及「一國兩制」主題。截止報名9月30日，遞交作品10月31日，11月下旬公布結果，12月6日頒獎。',
    date_start: '2026-10-31',
    date_end: null,
    deadline: '2026-09-30',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港青年培育協會',
    registration_link: 'https://www.hkyouthnurture.org/basiclawcomics2026',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港青年培育協會',
    universities: null,
  },
  {
    url: 'https://www.oshc.org.hk/tchi/main/awards_campaigns/SQ2026/',
    title: '職安健常識問答比賽 2026',
    title_en: 'Occupational Safety & Health Quiz Competition 2026',
    type: '其他',
    description: '職業安全健康局及勞工處合辦，設企業機構組、團體／工會組及學生組。企業機構組及團體／工會組冠軍獎金高達HK$10,000，學生組冠軍HK$3,000禮券。初賽12月14-15日於青衣職安健學院，總決賽2027年2-3月。截止報名10月26日。',
    date_start: '2026-12-14',
    date_end: null,
    deadline: '2026-10-26',
    location: '新界',
    venue: '職安健學院（青衣涌美路62號）',
    fee_type: '有奖金',
    prize: '冠軍獎金高達HK$10,000、學生組冠軍HK$3,000禮券',
    organizer: '職業安全健康局、勞工處',
    registration_link: 'https://www.oshc.org.hk/tchi/main/awards_campaigns/SQ2026/',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '職業安全健康局',
    universities: null,
  },
  {
    url: 'https://www.fspphk.org/competition.php?lang=tc',
    title: '「識煮惜食」廚神爭霸戰 2026',
    title_en: '"Cook Wise, Food Wise" Culinary Showdown 2026',
    type: '其他',
    description: '惜食香港運動「咪嘥嘢」推廣小組委員會主辦，鼓勵以創意廚藝實踐惜食。公開組以個人名義參賽（18歲或以上），費用全免。現場烹飪展示及最終評審11月28日，12月於香港會議展覽中心頒獎。公開組截止報名9月30日。',
    date_start: '2026-11-28',
    date_end: null,
    deadline: '2026-09-30',
    location: '线上',
    venue: '香港會議展覽中心（頒獎）',
    fee_type: '免费',
    prize: null,
    organizer: '惜食香港運動「咪嘥嘢」推廣小組委員會',
    registration_link: 'https://www.fspphk.org/competition.php?lang=tc',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '惜食香港運動',
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

/**
 * 新比赛批量入库（2026-09 批次9）—— 面向社会成年公众的公开赛事（越野跑/铁三/摄影/成人歌唱/绘画）
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 已剔除：2026香港狂野HK WILD(reg.zuicool.com 内地平台+人民币)、香港青年創新設計獎(xingxiancn/chuangyisai)、
 *         Writory短篇小說(国际在线非香港)、《讀者》徵文(readers-hk 大陸刊物)、
 *         龙舟/篮球联赛(均已截止)。
 * 运行: node scripts/scrape-batch9.mjs
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
    url: 'https://astkce.hk/bordergo/info/',
    title: '「Border Go!」慈善越野跑 2026',
    title_en: 'Border Go! Charity Trail Run 2026',
    type: '运动',
    description: '沙頭角文化生態協會主辦的慈善越野跑，11月8日舉行，20.4公里由牛潭尾跑至坪輋，途經牛潭山、麒麟山、蛇嶺。挑戰組／公開組HK$300，隊制組／團體組每隊HK$900。截止報名10月25日。',
    date_start: '2026-11-08',
    date_end: null,
    deadline: '2026-10-25',
    location: '新界',
    venue: '牛潭尾至坪輋',
    fee_type: '付费',
    prize: null,
    organizer: '沙頭角文化生態協會',
    registration_link: 'https://astkce.hk/bordergo/info/',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '沙頭角文化生態協會',
    universities: null,
  },
  {
    url: 'https://www.mountainrangehk.com/mrtp30',
    title: '越嶺系列賽 — 大埔30 2026',
    title_en: 'Mountain Range Trail Series — Tai Po 30 2026',
    type: '运动',
    description: '越嶺系列賽大埔站，11月8日舉行，約31.5公里，總爬升約1,600米。完賽可獲UTMB Index及ITRA 2分。個人HK$690、雙人每隊HK$1,380（早鳥HK$580／HK$1,160）。截止報名10月29日。',
    date_start: '2026-11-08',
    date_end: null,
    deadline: '2026-10-29',
    location: '新界',
    venue: '大埔',
    fee_type: '付费',
    prize: null,
    organizer: '越嶺系列賽（Mountain Range）',
    registration_link: 'https://www.mountainrangehk.com/mrtp30',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '越嶺系列賽',
    universities: null,
  },
  {
    url: 'https://www.hkaaa.com/tc/comp_details.php?id=290',
    title: '香港山路（攀升）挑戰賽 2026',
    title_en: 'Hong Kong Mountain Climb Challenge 2026',
    type: '运动',
    description: '香港田徑總會（HKAAA）主辦，12月6日舉行，由大埔梧桐寨路起點至大帽山終點，約5公里、海拔爬升800米，名額200人。田總註冊運動員HK$250，非註冊運動員HK$300。報名期至11月11日，先到先得。',
    date_start: '2026-12-06',
    date_end: null,
    deadline: '2026-11-11',
    location: '新界',
    venue: '大埔梧桐寨路至大帽山',
    fee_type: '付费',
    prize: null,
    organizer: '香港田徑總會（HKAAA）',
    registration_link: 'https://www.hkaaa.com/tc/comp_details.php?id=290',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港田徑總會',
    universities: null,
  },
  {
    url: 'https://www.paobaodao.com/hong-kong/race/hong-kong-triathlon-championships/',
    title: '2026 香港鐵人三項錦標賽',
    title_en: '2026 Hong Kong Triathlon Championships',
    type: '运动',
    description: '香港三項鐵人總會主辦，11月22日舉行，設標準距離等組別。報名期11月2日至11月18日。',
    date_start: '2026-11-22',
    date_end: null,
    deadline: '2026-11-18',
    location: '新界',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: '香港三項鐵人總會',
    registration_link: 'https://www.paobaodao.com/hong-kong/race/hong-kong-triathlon-championships/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港三項鐵人總會',
    universities: null,
  },
  {
    url: 'https://www.fungyuen.org/22ndbutterflyphotocompetition2026',
    title: '第二十二屆香港蝴蝶攝影比賽 2026',
    title_en: '22nd Hong Kong Butterfly Photography Competition 2026',
    type: '创意摄影设计',
    description: '環保協進會「鳳園蝴蝶保育區」主辦，任何年齡人士可參加（須持香港身份證）。相片須為2026年內於香港境內拍攝，每人最多提交2張。截止報名11月30日。',
    date_start: '2026-11-30',
    date_end: null,
    deadline: '2026-11-30',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '環保協進會「鳳園蝴蝶保育區」',
    registration_link: 'https://www.fungyuen.org/22ndbutterflyphotocompetition2026',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '環保協進會',
    universities: null,
  },
  {
    url: 'https://starryworldcpa.com/%e3%80%8a%e8%a5%bf%e8%b2%a2%e5%8d%80%e6%ad%a3%e5%90%91%e4%ba%ba%e7%94%9f%e6%ad%8c%e5%94%b1%e6%af%94%e8%b3%bd2026%e3%80%8b%e7%8f%be%e6%ad%a3%e6%8e%a5%e5%8f%97%e5%a0%b1%e5%90%8d%ef%bc%8114-10%e6%88%aa/',
    title: '西貢區正向人生歌唱比賽 2026',
    title_en: 'Sai Kung District Positive Life Singing Contest 2026',
    type: '音乐表演',
    description: '年齡不限（18歲以下須家長／監護人同意），歡迎居住、工作、就讀或熱愛西貢區人士參加，個人或組合形式（組合最多8人）。初賽10月17日及18日，決賽11月21日。截止報名10月14日中午12時。',
    date_start: '2026-10-17',
    date_end: null,
    deadline: '2026-10-14',
    location: '新界',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: null,
    registration_link: 'https://starryworldcpa.com/%e3%80%8a%e8%a5%bf%e8%b2%a2%e5%8d%80%e6%ad%a3%e5%90%91%e4%ba%ba%e7%94%9f%e6%ad%8c%e5%94%b1%e6%af%94%e8%b3%bd2026%e3%80%8b%e7%8f%be%e6%ad%a3%e6%8e%a5%e5%8f%97%e5%a0%b1%e5%90%8d%ef%bc%8114-10%e6%88%aa/',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '西貢區正向人生歌唱比賽',
    universities: null,
  },
  {
    url: 'https://www.hksingerchannel.com/post/%E9%8A%80%E9%AB%AE%E5%A5%BD%E8%81%B2%E9%9F%B3-%E6%AD%8C%E5%94%B1%E6%AF%94%E8%B3%BD',
    title: '銀髮好聲音歌唱比賽',
    title_en: 'Silver Voice Singing Contest',
    type: '音乐表演',
    description: 'Hong Kong Singer Channel主辦，對象為50歲或以上人士，設上世紀廣東歌曲組、本世紀廣東歌曲組、英文歌曲組及國語歌曲組。報名費每組HK$300。比賽11月8日於上環文娛中心五樓演講廳舉行。截止報名10月8日。',
    date_start: '2026-11-08',
    date_end: null,
    deadline: '2026-10-08',
    location: '港岛',
    venue: '上環文娛中心',
    fee_type: '付费',
    prize: null,
    organizer: 'Hong Kong Singer Channel',
    registration_link: 'https://www.hksingerchannel.com/post/%E9%8A%80%E9%AB%AE%E5%A5%BD%E8%81%B2%E9%9F%B3-%E6%AD%8C%E5%94%B1%E6%AF%94%E8%B3%BD',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'Hong Kong Singer Channel',
    universities: null,
  },
  {
    url: 'https://www.art-mate.net/doc/100328',
    title: '香港專業聲樂大賽 2026',
    title_en: 'Hong Kong Professional Vocal Competition 2026',
    type: '音乐表演',
    description: '為不同年齡界別及演唱風格的聲樂愛好者與專業歌者提供舞台，設多個組別。報名費HKD 480至980。截止報名11月1日。',
    date_start: '2026-11-01',
    date_end: null,
    deadline: '2026-11-01',
    location: '线上',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: '香港專業聲樂大賽',
    registration_link: 'https://www.art-mate.net/doc/100328',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港專業聲樂大賽',
    universities: null,
  },
  {
    url: 'https://hkaaca.com/q4-aaca-registration/',
    title: '第九屆香港藝術文化協會繪畫比賽',
    title_en: '9th Hong Kong Art & Culture Association Painting Competition',
    type: '创意摄影设计',
    description: '香港藝術文化協會主辦，主題「彩繪可持續：繽紛生活圖譜」，個人或團體報名均可。參賽費HKD 200。截止11月8日。',
    date_start: '2026-11-08',
    date_end: null,
    deadline: '2026-11-08',
    location: '线上',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: '香港藝術文化協會',
    registration_link: 'https://hkaaca.com/q4-aaca-registration/',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港藝術文化協會',
    universities: null,
  },
  {
    url: 'http://www.jsform.com/web/formview/6a62cd9ef08020cca45fe684',
    title: '第十六屆國際巡迴賽（土耳其站）書法／繪畫／攝影比賽',
    title_en: '16th International Circuit (Turkey Stop) Calligraphy / Painting / Photography Competition',
    type: '创意摄影设计',
    description: '國際巡迴賽土耳其站，涵蓋書法、繪畫、攝影類別，個人及團體均可報名，頒獎於香港文化中心舉行。參賽費每項HKD 350。截止報名10月23日。',
    date_start: '2026-10-23',
    date_end: null,
    deadline: '2026-10-23',
    location: '线上',
    venue: '香港文化中心（頒獎）',
    fee_type: '付费',
    prize: null,
    organizer: null,
    registration_link: 'http://www.jsform.com/web/formview/6a62cd9ef08020cca45fe684',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '國際巡迴賽',
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

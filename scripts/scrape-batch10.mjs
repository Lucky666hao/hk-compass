/**
 * 新比赛批量入库（2026-09 批次10）—— 面向社会成年公众的公开赛事（攀石/公路單車/舞蹈/文創設計/高爾夫）
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 已剔除：維港泳2026(8/27已截止)、DSA亞洲專項體育舞蹈錦標賽/香港公開賽2026(賽程11/1才公布、報名期未定)、
 *         咖啡/茶/調酒比赛(均7-8月截止)、《讀者》徵文/Writory(大陸刊物/国际非香港)、保齡球/壁球(無成人公開)。
 * 运行: node scripts/scrape-batch10.mjs
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
    url: 'https://hkcmcu.org.hk/hk/local-events-and-activities/2023-10-09-09-05-20/728-2026',
    title: '香港抱石系列賽 2026（初級組）',
    title_en: 'Hong Kong Bouldering Series 2026 (Novice Group)',
    type: '运动',
    description: '中國香港攀山及攀登總會主辦，2026年10至11月共4站（初級組，17歲或以上、未曾於攀石/運動攀登比賽獲前三名者）。第2站10月31日於Hong Kong Climbing Park舉行、第3站11月14日，各站0900-1900。每分站港幣$250，9月30日前報名整個系列賽享$850/4站早鳥優惠。4站完成後以最佳3場成績計總成績，頭24名男女運動員有機會獲邀參加香港抱石錦標賽初級組準決賽。第2站截止報名10月16日。',
    date_start: '2026-10-31',
    date_end: null,
    deadline: '2026-10-16',
    location: '九龙',
    venue: 'Hong Kong Climbing Park（第2站）；各站不同攀石場館',
    fee_type: '付费',
    prize: null,
    organizer: '中國香港攀山及攀登總會（香港競賽攀登運動總會）',
    registration_link: 'https://hkcmcu.org.hk/hk/local-events-and-activities/2023-10-09-09-05-20/728-2026',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '中國香港攀山及攀登總會',
    universities: null,
  },
  {
    url: 'https://www.cycling.org.hk/events/list/',
    title: '2026-2027 全港公路單車賽 第三回合（個人計時賽）',
    title_en: '2026-2027 Hong Kong Road Cycling Race — Round 3 (Individual Time Trial)',
    type: '运动',
    description: '中國香港單車總會有限公司主辦，11月14日（星期六）06:00-09:30於大埔新娘潭路舉行個人計時賽，名額限120人。屬會優先報名於9月25日下午6時前提交；公開網上報名9月28日上午10時開始，額滿即止，最終截止10月23日下午6時。',
    date_start: '2026-11-14',
    date_end: null,
    deadline: '2026-10-23',
    location: '新界',
    venue: '大埔新娘潭路',
    fee_type: '付费',
    prize: null,
    organizer: '中國香港單車總會有限公司',
    registration_link: 'https://www.cycling.org.hk/events/list/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '中國香港單車總會',
    universities: null,
  },
  {
    url: 'https://dancenefertiti.com/hkiedf/',
    title: '第九屆香港國際埃及舞蹈節 2026（Live Band 比賽）',
    title_en: '9th Hong Kong International Egyptian Dance Festival 2026 (Live Band Competition)',
    type: '其他',
    description: 'Nefertiti Egyptian & Middle Eastern Dance School主辦。Live Band比賽（只限獨舞Solo only），設Oriental／Folklore組別，費用每位舞者港幣$1,000。所有參賽者可獲主秀免費門票一張及舞蹈節全部活動5折優惠。主秀11月18日晚上7:30舉行。Live Band比賽截止報名10月31日23:59（香港時間）。查詢WhatsApp +852 9137 5928。',
    date_start: '2026-11-18',
    date_end: null,
    deadline: '2026-10-31',
    location: '港岛',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: 'Nefertiti Egyptian & Middle Eastern Dance School',
    registration_link: 'https://dancenefertiti.com/hkiedf/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'Nefertiti Egyptian & Middle Eastern Dance School',
    universities: null,
  },
  {
    url: 'https://temples.tungwahcsd.org/',
    title: '第六屆東華三院文獻怡中華文創設計獎 2026',
    title_en: '6th Tung Wah Group of Hospitals Ginny Man Chinese Cultural & Creative Design Award 2026',
    type: '创意摄影设计',
    description: '東華三院主辦，旨在推廣中華文化與文創設計，設公開組等多個組別，公開組冠軍獎金高達港幣$50,000。截止報名10月12日。詳見主辦方網頁。',
    date_start: '2026-10-12',
    date_end: null,
    deadline: '2026-10-12',
    location: '线上',
    venue: null,
    fee_type: '有奖金',
    prize: '公開組冠軍港幣$50,000',
    organizer: '東華三院',
    registration_link: 'https://temples.tungwahcsd.org/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '東華三院',
    universities: null,
  },
  {
    url: 'https://www.kscgolf.org.hk/chi/golf/tournaments/',
    title: '賽馬會滘西洲國際業餘公開賽 2026',
    title_en: 'Jockey Club Kau Sai Chau International Amateur Open 2026',
    type: '运动',
    description: '賽馬會滘西洲公眾高爾夫球場主辦，11月6日至8日於北場舉行，男子個人比桿賽。報名期9月25日開始，截止10月23日。詳見球場賽事網頁。',
    date_start: '2026-11-06',
    date_end: '2026-11-08',
    deadline: '2026-10-23',
    location: '新界',
    venue: '賽馬會滘西洲公眾高爾夫球場（北場）',
    fee_type: '付费',
    prize: null,
    organizer: '賽馬會滘西洲公眾高爾夫球場',
    registration_link: 'https://www.kscgolf.org.hk/chi/golf/tournaments/',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '賽馬會滘西洲公眾高爾夫球場',
    universities: null,
  },
  {
    url: 'https://www.kscgolf.org.hk/chi/golf/tournaments/#collapseSearch',
    title: '賽馬會滘西洲精英賽 2026',
    title_en: 'Jockey Club Kau Sai Chau Elite Competition 2026',
    type: '运动',
    description: '賽馬會滘西洲公眾高爾夫球場主辦，12月11日至13日於南場、北場及東場舉行，男子／女子個人總桿定分式比賽。截止報名11月27日。詳見球場賽事網頁。',
    date_start: '2026-12-11',
    date_end: '2026-12-13',
    deadline: '2026-11-27',
    location: '新界',
    venue: '賽馬會滘西洲公眾高爾夫球場（南場、北場、東場）',
    fee_type: '付费',
    prize: null,
    organizer: '賽馬會滘西洲公眾高爾夫球場',
    registration_link: 'https://www.kscgolf.org.hk/chi/golf/tournaments/#collapseSearch',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '賽馬會滘西洲公眾高爾夫球場',
    universities: null,
  },
  {
    url: 'https://www.cnhickorygolfers.com/CHOC2026.html',
    title: '第三屆中國胡桃木公開賽 2026（復古高爾夫）',
    title_en: '3rd China Hickory Open 2026',
    type: '运动',
    description: 'China Hickory Golfers主辦的復古胡桃木球桿高爾夫賽事，於香港賽馬會滘西洲公眾高爾夫球場舉行，11月16日至18日，名額80人、先到先得。11月16日北場國家賽（走路），11月17至18日南場公開賽（開車）。截止報名10月15日。',
    date_start: '2026-11-16',
    date_end: '2026-11-18',
    deadline: '2026-10-15',
    location: '新界',
    venue: '賽馬會滘西洲公眾高爾夫球場',
    fee_type: '付费',
    prize: null,
    organizer: 'China Hickory Golfers',
    registration_link: 'https://www.cnhickorygolfers.com/CHOC2026.html',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'China Hickory Golfers',
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

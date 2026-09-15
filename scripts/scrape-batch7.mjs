/**
 * 新比赛批量入库（2026-09 批次7）—— 创业/AI创作/摄影/朗诵演讲/舞蹈/机械人
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 已剔除：AIGC國際大賽(aigcglobal.com.cn)、HKAIDA·香港AI藝術創作大賽(newunivs.com)、
 *         2026HKVAA香港視覺藝術獎(newunivs.com) —— 均屬大陸征稿平台。
 * 运行: node scripts/scrape-batch7.mjs
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
    url: 'https://hksec.hk',
    title: '香港社會企業挑戰賽 HKSEC 2026-27',
    title_en: 'Hong Kong Social Enterprise Challenge (HKSEC) 2026-27',
    type: '创业路演',
    description: '香港中文大學創業中心主辦、民政及青年事務局贊助（第20屆），主題「Connect for Good: Power Up & Go Bold!」。每隊2至4人，成員須為18至35歲香港居民並具本科或以上學歷，至少50%成員為本港或海外大專院校在讀生或近期畢業生。冠軍隊伍最高可獲港幣30萬元。截止報名10月26日。',
    date_start: '2026-10-26',
    date_end: null,
    deadline: '2026-10-26',
    location: '新界',
    venue: '香港中文大學',
    fee_type: '有奖金',
    prize: '冠軍最高HK$300,000、亞軍最高HK$150,000、最創新意念獎HK$20,000',
    organizer: '香港中文大學創業中心',
    registration_link: 'https://hksec.hk',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港中文大學創業中心',
    universities: null,
  },
  {
    url: 'https://www.hkmaritimemuseum.org/event-details/generative-ai-short-video-creation-competition-in-cantonese?lang=zh',
    title: '「說好香港海事故事」生成式AI短片創作比賽 2026',
    title_en: '"Tell the Hong Kong Maritime Story" Generative AI Short Video Competition 2026',
    type: 'AI创作',
    description: '職業訓練局海事服務業訓練委員會、海事訓練學院及香港海事博物館合辦，運用生成式AI技術製作原創短片，講述香港海事歷史、文化、航運發展或海洋保育。設中學組（個人或最多4人一隊）及公開組（18歲或以上香港居民）。免費參加。截止投稿10月16日，11月21日於中環8號碼頭香港海事博物館頒獎。',
    date_start: '2026-11-21',
    date_end: null,
    deadline: '2026-10-16',
    location: '港岛',
    venue: '香港海事博物館',
    fee_type: '免费',
    prize: null,
    organizer: '職業訓練局海事服務業訓練委員會、海事訓練學院、香港海事博物館',
    registration_link: 'https://www.hkmaritimemuseum.org/event-details/generative-ai-short-video-creation-competition-in-cantonese?lang=zh',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '職業訓練局',
    universities: null,
  },
  {
    url: 'https://hkia.net/zh-HK/whats-on/9/70A/detail/1344',
    title: '香港建築師學會70周年建築攝影比賽',
    title_en: 'HKIA 70th Anniversary Architectural Photography Competition',
    type: '创意摄影设计',
    description: '香港建築師學會主辦，慶祝學會成立70周年。邀請參賽者探索「人、建築與城市」的關係，記錄人們如何體驗、使用及身處於香港的建築與城市環境。設公開組及會員組，最佳作品獎為相機，各類別設書券。截止投件10月15日，11月中公布結果及展覽開幕。',
    date_start: '2026-10-15',
    date_end: null,
    deadline: '2026-10-15',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: '最佳作品獎（相機）及各類別書券',
    organizer: '香港建築師學會',
    registration_link: 'https://hkia.net/zh-HK/whats-on/9/70A/detail/1344',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港建築師學會',
    universities: null,
  },
  {
    url: 'https://www.hkbiodiversitymuseum.org/ant-photo-contest',
    title: '香港螞蟻攝影比賽 2026（Ant Photo Contest）',
    title_en: 'Hong Kong Ant Photo Contest 2026',
    type: '创意摄影设计',
    description: '香港大學香港生物多樣性博物館主辦，參賽相片須於2026年6月1日至10月31日間在香港範圍內拍攝野生螞蟻，不得擺拍或干擾自然環境。任何年齡可參加，10歲或以下設兒童組。免費參加，公開組最多交5張、兒童組最多2張。截止10月31日，結果2027年初公布。',
    date_start: '2026-10-31',
    date_end: null,
    deadline: '2026-10-31',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '香港生物多樣性博物館（香港大學）',
    registration_link: 'https://www.hkbiodiversitymuseum.org/ant-photo-contest',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港生物多樣性博物館',
    universities: null,
  },
  {
    url: 'http://www.pthua.org/zongyisai',
    title: '第十屆全港學界朗誦故事演講綜合才藝展演 2026',
    title_en: '10th Territory-wide School Recitation, Storytelling & Speech Talent Showcase 2026',
    type: '其他',
    description: '全港學界朗誦、故事、演講綜合才藝展演，設1人至多人組別。比賽11月1日及11月8日於沙田石門鄉議局大樓或線上實時進行。費用1人HK$380／項起，已包括證書、評分紙及獎項。截止報名10月24日下午5時。',
    date_start: '2026-11-01',
    date_end: null,
    deadline: '2026-10-24',
    location: '新界',
    venue: '沙田石門鄉議局大樓',
    fee_type: '付费',
    prize: null,
    organizer: null,
    registration_link: 'http://www.pthua.org/zongyisai',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '全港學界才藝展演',
    universities: null,
  },
  {
    url: 'https://hkcapc.com/',
    title: '香港少兒藝術盃（第十屆）全港學校朗誦點評大賽',
    title_en: '10th Hong Kong Children Art Cup — School Recitation Review Competition',
    type: '其他',
    description: '全港學校／校際朗誦點評大賽，設獨誦、對誦／二人合誦、合誦／小組集誦（3-6人）。比賽11月15日及11月22日，11月10日網上公布組別安排。獨誦HK$380／項，對誦HK$500／項，合誦HK$900／項。截止報名10月25日。',
    date_start: '2026-11-15',
    date_end: null,
    deadline: '2026-10-25',
    location: '线上',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: null,
    registration_link: 'https://hkcapc.com/',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港少兒藝術盃',
    universities: null,
  },
  {
    url: 'https://hkypa.org/competition_details.php?event_id=5',
    title: 'HKYPA 第十四屆香港國際朗誦及公開演講大賽 2026',
    title_en: '14th Hong Kong International Recitation & Public Speaking Competition 2026',
    type: '其他',
    description: '香港青少年表演藝術交流發展協會主辦。現場賽事11月14日於屯門大會堂及11月22日於香港文化中心舉行，現場賽事截止報名10月28日；視頻賽事截止報名及遞交11月30日，12月30日公布結果。',
    date_start: '2026-11-14',
    date_end: null,
    deadline: '2026-10-28',
    location: '九龙',
    venue: '香港文化中心、屯門大會堂',
    fee_type: '付费',
    prize: null,
    organizer: '香港青少年表演藝術交流發展協會',
    registration_link: 'https://hkypa.org/competition_details.php?event_id=5',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港青少年表演藝術交流發展協會',
    universities: null,
  },
  {
    url: 'https://www.staricca.com/post/%E7%AC%AC%E5%8D%81%E5%9B%9B%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E8%B7%B3%E8%88%9E%E5%A4%A7%E8%B3%BD2026',
    title: '第十四屆香港青少年及兒童跳舞大賽 2026',
    title_en: '14th Hong Kong Youth & Children Dance Competition 2026',
    type: '其他',
    description: '智慧之星兒童文化協會主辦，免費報名，網上遞交舞蹈錄影作品。設幼稚園PN至K3、小學P1-P6、中學及公開組。截止報名10月13日，結果10月20日公布。',
    date_start: '2026-10-13',
    date_end: null,
    deadline: '2026-10-13',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '智慧之星兒童文化協會',
    registration_link: 'https://www.staricca.com/post/%E7%AC%AC%E5%8D%81%E5%9B%9B%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E8%B7%B3%E8%88%9E%E5%A4%A7%E8%B3%BD2026',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '智慧之星兒童文化協會',
    universities: null,
  },
  {
    url: 'https://events.vex.com/cs/robot-competitions/vex-iq-competition/RE-VIQRC-26-4473.html',
    title: '沙角盃 VEX IQ 機械人大賽 2026（Scrimmage）',
    title_en: 'Sha Kok Cup VEX IQ Robotics Competition 2026 (Scrimmage)',
    type: '其他',
    description: 'VEX IQ機械人大賽（Scrimmage），適合小學及中學隊伍，比賽11月7日於沙田區舉行，免費參加。截止報名10月24日。',
    date_start: '2026-11-07',
    date_end: null,
    deadline: '2026-10-24',
    location: '新界',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: 'VEX',
    registration_link: 'https://events.vex.com/cs/robot-competitions/vex-iq-competition/RE-VIQRC-26-4473.html',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '学校提名',
    status: '报名中',
    source: 'VEX',
    universities: null,
  },
  {
    url: 'https://events.vex.com/it/robot-competitions/vex-robotics-competition/VE-V5-26-65668.html',
    title: 'Kowloon Central VEX V5 機械人比賽（初中／高中組）',
    title_en: 'Kowloon Central VEX V5 Tournament (MS/HS)',
    type: '其他',
    description: 'VEX V5機械人比賽（初中及高中組），比賽11月14日於九龍區舉行。截止報名11月13日。',
    date_start: '2026-11-14',
    date_end: null,
    deadline: '2026-11-13',
    location: '九龙',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: 'VEX',
    registration_link: 'https://events.vex.com/it/robot-competitions/vex-robotics-competition/VE-V5-26-65668.html',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '学校提名',
    status: '报名中',
    source: 'VEX',
    universities: null,
  },
  {
    url: 'https://gnet.com.hk/%E7%AC%AC%E4%BA%8C%E5%B1%86%E5%9C%8B%E9%9A%9B%E6%94%9D%E5%BD%B1%E9%80%A3%E7%92%B0%E6%B2%99%E9%BE%8D%E7%9A%87%E6%9C%9D%E7%B2%BE%E8%8B%B1-2026',
    title: '第二屆國際攝影連環沙龍～皇朝精英 2026',
    title_en: '2nd International Photography Circuit Salon ~ Dynasty Elite 2026',
    type: '创意摄影设计',
    description: '第二屆國際攝影連環沙龍，接受世界各地攝影愛好者投稿，費用約20至30美元。截止投稿10月31日，11月28日完成評審，12月5日公布成績，12月19日網上沙龍展覽。',
    date_start: '2026-10-31',
    date_end: null,
    deadline: '2026-10-31',
    location: '线上',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: null,
    registration_link: 'https://gnet.com.hk/%E7%AC%AC%E4%BA%8C%E5%B1%86%E5%9C%8B%E9%9A%9B%E6%94%9D%E5%BD%B1%E9%80%A3%E7%92%B0%E6%B2%99%E9%BE%8D%E7%9A%87%E6%9C%9D%E7%B2%BE%E8%8B%B1-2026',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '皇朝精英',
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

/**
 * 新比赛批量入库（2026-09 批次5）—— 高校/大專生/學界赛事 + 社会公开艺术赛事
 * 数据来源：WebSearch 逐条核实的、仍在报名期的真实香港比赛（不编造、不含大陆征稿平台）
 * 关键字段（时间/地点/人群/人数/身份）全部预填确定值，不依赖 AI 抓取，确保真实性与确定性。
 * 运行: node scripts/scrape-batch5.mjs
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
    url: 'https://www.hku.hk/others/scamsniperhku.html',
    title: '港大反詐狙擊手短片創作大賽 2026（ScamSniper HKU）',
    title_en: 'HKU ScamSniper Short Film Creation Contest 2026',
    type: '创意摄影设计',
    description: '香港大學主辦的反詐短片創作大賽，總獎金高達港幣 14 萬元，免費參加。開放予所有現正就讀港大的學生（本科生及研究生）及公眾人士，設「真人微短劇」及「AI 生成短片」兩大類別。截止報名及提交作品 9 月 13 日 23:59，最多 10 部入圍作品將獲港大正式採納為教育及宣傳材料。',
    date_start: '2026-09-13',
    date_end: null,
    deadline: '2026-09-13',
    location: '港岛',
    venue: '香港大學',
    fee_type: '有奖金',
    prize: '總獎金高達港幣 140,000 元',
    organizer: '香港大學',
    registration_link: 'https://www.hku.hk/others/scamsniperhku.html',
    age_group: '不限',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '香港大學',
    universities: null,
  },
  {
    url: 'https://www.wenweipo.com/a/202608/28/AP6a909eade4b0c1e500268268.html',
    title: '全港大專生 Dem Beat 反詐比賽',
    title_en: 'Territory-wide Anti-Deception Dem Beat Competition for Tertiary Students',
    type: '音乐表演',
    description: '警務處反詐騙協調中心（ADCC）聯同中國移動香港舉辦，號召全港大專院校全日制學生以 6 至 10 人一隊，用節奏口號（Dem Beat）創作反詐主題表演。冠軍獎金港幣 10 萬元。截止報名 9 月 25 日，決賽 10 月 11 日於尖沙咀 K11 MUSEA 舉行。',
    date_start: '2026-10-11',
    date_end: null,
    deadline: '2026-09-25',
    location: '九龙',
    venue: 'K11 MUSEA',
    fee_type: '有奖金',
    prize: '冠軍獎金港幣 100,000 元',
    organizer: '警務處反詐騙協調中心、中國移動香港',
    registration_link: 'https://www.wenweipo.com/a/202608/28/AP6a909eade4b0c1e500268268.html',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    status: '报名中',
    source: '警務處反詐騙協調中心',
    universities: null,
  },
  {
    url: 'https://www.hkfew.org.hk/en/%e7%a4%be%e6%9c%83/%e5%90%88%e4%bd%9c/item/12715-%e3%80%90%e6%ad%a1%e8%bf%8e%e5%8f%83%e5%8a%a0%e3%80%91%e5%85%a8%e6%b8%af%e4%b8%ad%e5%ad%b8%e7%94%9f%e6%af%9b%e7%ad%86%e6%9b%b8%e6%b3%95%e6%af%94%e8%b3%bd2026',
    title: '全港中學生毛筆書法比賽 2026',
    title_en: 'Hong Kong Secondary School Chinese Brush Calligraphy Competition 2026',
    type: '其他',
    description: '香港理工大學孔子學院、香港華夏教育機構、馮燊均國學基金會主辦（教聯會及多個教育團體支持）。設初中組（中一至中三）及高中組（中四至中六），參賽者必須經就讀學校提名。截止報名 9 月 24 日，比賽暫定 12 月 5 日於香港理工大學舉行。',
    date_start: '2026-12-05',
    date_end: null,
    deadline: '2026-09-24',
    location: '九龙',
    venue: '香港理工大學',
    fee_type: '免费',
    prize: null,
    organizer: '香港理工大學孔子學院、香港華夏教育機構、馮燊均國學基金會',
    registration_link: 'https://www.hkfew.org.hk/en/%e7%a4%be%e6%9c%83/%e5%90%88%e4%bd%9c/item/12715-%e3%80%90%e6%ad%a1%e8%bf%8e%e5%8f%83%e5%8a%a0%e3%80%91%e5%85%a8%e6%b8%af%e4%b8%ad%e5%ad%b8%e7%94%9f%e6%af%9b%e7%ad%86%e6%9b%b8%e6%b3%95%e6%af%94%e8%b3%bd2026',
    age_group: '青少年',
    team_size: '个人赛',
    eligibility: '学校提名',
    status: '报名中',
    source: '香港教育工作者聯會',
    universities: null,
  },
  {
    url: 'https://www.hkedcity.net/registration/form.php?reg_form_id=1257',
    title: '全港學界國家安全常識挑戰賽 2026/27',
    title_en: 'Territory-wide National Security Knowledge Challenge 2026/27',
    type: '其他',
    description: '律政司、保安局、教育局及善德基金會合辦，分小學組、中學組及非華語中學生英文組。9 月 11 日起經香港教育城接受報名，學生於 9 月 23 日至 10 月 7 日登入專題網頁作網上初賽。得分最高學校獲邀參加 11 月實體隊際賽，總決賽於 2027 年 4 月 15 日全民國家安全教育日舉行。',
    date_start: '2026-09-11',
    date_end: null,
    deadline: null,
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '律政司、保安局、教育局、善德基金會',
    registration_link: 'https://www.hkedcity.net/registration/form.php?reg_form_id=1257',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '学校提名',
    status: '即将开始',
    source: '教育局',
    universities: null,
  },
  {
    url: 'https://events.vex.com/zh-CN/robot-competitions/vex-iq-competition/RE-VIQRC-26-4289.html',
    title: 'Hong Kong VEX IQ Robotics Competition（MS）Signature Event 2026',
    title_en: 'Hong Kong VEX IQ Robotics Competition (MS) Signature Event 2026',
    type: '其他',
    description: '香港 VEX IQ 機械人競賽（初中組）Signature Event，10 月 22 至 23 日於灣仔伊利沙伯體育館舉行。隊伍以學校或機構名義報名，截止報名 10 月 13 日 23:59。所有出席人士（教練、學生及家長）須於截止前提交同意書。',
    date_start: '2026-10-22',
    date_end: '2026-10-23',
    deadline: '2026-10-13',
    location: '港岛',
    venue: '伊利沙伯體育館',
    fee_type: '付费',
    prize: null,
    organizer: 'VEX（聯校科技教育協會、香港科技教育學會）',
    registration_link: 'https://events.vex.com/zh-CN/robot-competitions/vex-iq-competition/RE-VIQRC-26-4289.html',
    age_group: '青少年',
    team_size: '不限',
    eligibility: '学校提名',
    status: '报名中',
    source: 'VEX',
    universities: null,
  },
  {
    url: 'https://www.staricca.com/post/%E7%AC%AC%E5%8D%81%E5%9B%9B%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E7%AB%A5%E7%9C%9F%E7%84%A1%E9%99%90%E8%97%9D%E8%A1%93%E5%A4%A7%E8%B3%BD2026',
    title: '第十四屆香港青少年及兒童「童真無限」藝術大賽 2026',
    title_en: '14th Hong Kong Youth & Children Art Competition 2026',
    type: '创意摄影设计',
    description: '智慧之星兒童文化協會主辦，設公開組、幼稚園、小學及中學組，項目包括繪畫組及填色組，主題涵蓋海陸空動物、卡通人物及自選主題。截止報名 10 月 13 日，結果 10 月 20 日公布。',
    date_start: '2026-10-13',
    date_end: null,
    deadline: '2026-10-13',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: '智慧之星兒童文化協會',
    registration_link: 'https://www.staricca.com/post/%E7%AC%AC%E5%8D%81%E5%9B%9B%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E7%AB%A5%E7%9C%9F%E7%84%A1%E9%99%90%E8%97%9D%E8%A1%93%E5%A4%A7%E8%B3%BD2026',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '智慧之星兒童文化協會',
    universities: null,
  },
  {
    url: 'https://www.hkgcpaa.com/post/%E7%AC%AC%E5%8D%81%E4%BA%94%E5%B1%86%E5%85%A8%E6%B8%AF18%E5%8D%80%E7%AB%A5%E5%A4%A2%E9%A3%9B%E6%8F%9A%E8%A6%96%E8%A6%BA%E8%97%9D%E8%A1%93%E5%89%B5%E4%BD%9C%E6%AF%94%E8%B3%BD',
    title: '第十五屆全港18區童夢飛揚視覺藝術創作比賽',
    title_en: '15th Hong Kong 18 Districts Visual Art Creation Competition',
    type: '创意摄影设计',
    description: '免費參加的全港 18 區視覺藝術創作比賽，設公開組、幼稚園、小學及中學組，項目包括填色、繪畫及手工勞作，主題為「最喜愛動物」。截止報名 10 月 15 日，結果 10 月 22 日公布。',
    date_start: '2026-10-15',
    date_end: null,
    deadline: '2026-10-15',
    location: '线上',
    venue: null,
    fee_type: '免费',
    prize: null,
    organizer: null,
    registration_link: 'https://www.hkgcpaa.com/post/%E7%AC%AC%E5%8D%81%E4%BA%94%E5%B1%86%E5%85%A8%E6%B8%AF18%E5%8D%80%E7%AB%A5%E5%A4%A2%E9%A3%9B%E6%8F%9A%E8%A6%96%E8%A6%BA%E8%97%9D%E8%A1%93%E5%89%B5%E4%BD%9C%E6%AF%94%E8%B3%BD',
    age_group: '不限',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: '全港18區童夢飛揚',
    universities: null,
  },
  {
    url: 'https://www.startartworkshop.com/post/gvaa-2026-%E8%81%96%E8%AA%95%E5%92%AD%E8%A8%AD%E8%A8%88%E6%AF%94%E8%B3%BD',
    title: 'GVAA 2026 聖誕咭設計比賽（電繪）',
    title_en: 'GVAA 2026 Christmas Card Design Competition (Digital)',
    type: '创意摄影设计',
    description: '電繪聖誕咭設計比賽，主題為「歡樂聖誕」，設公開組（2007 年或之前出生）。截止報名及提交作品 10 月 17 日 11:59pm，結果暫定 10 月下旬公布。個人每份 HK$250，團體（10 人或以上）每份 HK$230。',
    date_start: '2026-10-17',
    date_end: null,
    deadline: '2026-10-17',
    location: '线上',
    venue: null,
    fee_type: '付费',
    prize: null,
    organizer: 'GVAA',
    registration_link: 'https://www.startartworkshop.com/post/gvaa-2026-%E8%81%96%E8%AA%95%E5%92%AD%E8%A8%AD%E8%A8%88%E6%AF%94%E8%B3%BD',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    status: '报名中',
    source: 'GVAA',
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

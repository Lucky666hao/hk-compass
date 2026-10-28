/**
 * 香港大專院校比賽批量入库（2026-10 批次15）—— 继续补充 /uni 板块
 * 数据来源：WebSearch 发现 → curl+cheerio 逐条核实官方页面（全部 source_url 返回 200、截止日从原文提取）。
 * 均为高校/官方机构主办，面向香港大专生，不编造、不含大陆征稿平台。
 * target_universities 存「大写缩写」，与 uni 页面 `uni.slug.toUpperCase()` 比较逻辑一致；
 * review_status 一律 pending，由人工审核（不自动通过）。
 * 运行: node scripts/scrape-batch15.mjs
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
    url: 'https://cecp.must.edu.mo/news/article/view/id-43105.html?locale=zh_MO',
    title: '數碼港大灣區青年創業計劃 2026',
    title_en: 'Cyberport Greater Bay Area Youth Entrepreneurship Programme 2026',
    type: '创业路演',
    description: '數碼港（Cyberport）主辦，面向18至30歲、就讀或畢業於香港／澳門／廣東大專院校（畢業不超過3年）的青年。先以個人名義申請，經個人遴選及創業營培訓後，跨地域組隊提交創業項目。計劃總種子基金100萬港元，10個獲選團隊各獲10萬港元資助（6個月計劃期）。創業營報名截止2026年11月27日。',
    deadline: '2026-11-27',
    dateStart: '2026-11-27',
    dateEnd: null,
    fee_type: '有奖金',
    prize: '總種子基金100萬港元，10個獲選團隊各獲10萬港元資助',
    organizer: '數碼港（Cyberport）',
    age_group: '成人公开',
    team_size: '不限',
    eligibility: '个人报名',
    source: '數碼港（Cyberport）',
    universities: ALL8,
  },
  {
    url: 'https://calendar.hkust.edu.hk/events/xianggangkejidaxue-chuangyixiezuowenxuejiang',
    title: '香港科技大學創意寫作文學獎',
    title_en: 'HKUST Creative Writing Literary Prize',
    type: '其他',
    description: '香港科技大學人文學部主辦，僅限科大在讀本科生及研究生參加。設小說、散文、詩歌、AI小說實驗組，各組不設題目或主題限制。初評由人文學部博士組成，終評由科大教授及著名作家主持。小說首獎HK$30,000、AI實驗文學首獎HK$20,000、散文／詩歌首獎各HK$10,000，另設優秀獎。截稿2026年12月31日午夜12時，以PDF電郵至 ustlitprize@ust.hk。',
    deadline: '2026-12-31',
    dateStart: '2026-10-16',
    dateEnd: '2026-12-31',
    fee_type: '有奖金',
    prize: '小說首獎HK$30,000、AI實驗文學首獎HK$20,000、散文／詩歌首獎各HK$10,000及多個優秀獎',
    organizer: '香港科技大學人文學部（HKUST Institute for Advanced Study）',
    age_group: '成人公开',
    team_size: '个人赛',
    eligibility: '个人报名',
    source: '香港科技大學',
    universities: ['HKUST'],
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
  const { count: uniCount } = await supabase.from('competitions').select('id', { count: 'exact', head: true }).not('target_universities', 'is', null).eq('review_status', 'approved').neq('status', '已结束')
  console.log(`🎓 /uni 可见比赛数: ${uniCount}`)
}

main().catch(console.error)

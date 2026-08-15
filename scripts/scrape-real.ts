/**
 * 真实比赛采集脚本
 * 1. 接收手动搜索验证过的比赛 URL 列表
 * 2. 用 fetch 获取页面 HTML
 * 3. 用 DeepSeek API 提取结构化数据
 * 4. 验证后入库（只保留未来可报名的）
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// 归一化函数
function normalizeTeamSize(v: string | undefined): string {
  if (!v) return '不限'
  const s = v.toLowerCase()
  if (/个人|個人|单人|單人|individual|solo|单人赛|個人賽|1人|^1$/.test(s)) return '个人赛'
  if (/2.*3|2-3|2~3|双人|兩人|pair|duo/.test(s)) return '2-3人'
  if (/4.*6|4-6|4~6|小队|小組/.test(s)) return '4-6人'
  if (/7|团队|團隊|team|团体|團體|多人|组队|組隊/.test(s)) return '7人以上'
  return '不限'
}
function normalizeAgeGroup(v: string | undefined): string {
  if (!v) return '不限'
  const s = v.toLowerCase()
  if (/儿童|兒童|小孩|kid|child|幼儿|親子|小学|小學/.test(s)) return '儿童'
  if (/青少年|青年|teen|youth|中学|中學|少年/.test(s)) return '青少年'
  if (/成人|公开|公開|adult|大众|大眾|公眾/.test(s)) return '成人公开'
  return '不限'
}
function normalizeFeeType(v: string | undefined): string {
  if (!v) return '付费'
  const s = v.toLowerCase()
  if (/免费|免費|全免/.test(s)) return '免费'
  if (/奖金|獎金|有奖/.test(s)) return '有奖金'
  return '付费'
}

// 已验证的真实比赛 URL（来自 WebSearch）
const COMPETITIONS = [
  // === 体育 ===
  { url: 'https://www.hkharbourrace.com/latest-news/registration-opens-july-29-for-victoria-harbour-race-2026-welcoming-4000-swimmers-on-nov-15/', source: '维港泳官网', category: '运动' },
  { url: 'https://jcfitcity.hk/zh-Hant/event/Pickleball-Challenge-Court-Competition-HKPA-2026082803', source: '赛马会好动城市', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/hong-kong-aquathlon-championships/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/world-triathlon-cup-hong-kong/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/avohk-5k-series-race-4-south-bay/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://smoothcomp.com/zh/event/33352', source: 'Smoothcomp', category: '运动' },
  { url: 'https://www.kscgolf.org.hk/chi/golf/tournaments/jcksc-international-amateur-open-2026/', source: '滘西洲高爾夫', category: '运动' },
  { url: 'https://www.hkfa.com/news/latest-news/22566/detail', source: 'HKFA', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/scarpa-hong-kong-short-distance-trail-race/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/pocari-sweat-run-fest/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/summer-trail-run/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/runaround-saikung/', source: 'PaoBaoDao', category: '运动' },

  // === 电竞 ===
  { url: 'https://csgo.com.hk/2026/07/13/kwun-tong-district-esports-tournament-experience-day-2026-application/tournament/', source: 'TomorrowLAN', category: '电竞' },
  { url: 'https://csgo.com.hk/2026/06/16/zowie-prodigy-series-season-2-accept-enrollment/tournament/', source: 'TomorrowLAN', category: '电竞' },
  { url: 'https://www.ps-esports.com/calendar/2025-valorant-champions-tour-vct-ze97t', source: 'PS Esports', category: '电竞' },

  // === AI/Tech/创业 ===
  { url: 'https://www.hkcert.org/tc/event/ai-x-cybersecurity-challenge', source: 'HKCERT', category: 'AI创作' },
  { url: 'https://makerinchina.hk/', source: '创客中国', category: '创业路演' },
  { url: 'https://ec.hkust.edu.hk/events/firebird-hackathon-hkust-35th-anniversary-ai-hackathon', source: 'HKUST', category: 'AI创作' },
  { url: 'https://cse.hkust.edu.hk/GDGoChackathon2026/hackathon', source: 'HKUST CSE', category: 'AI创作' },
  { url: 'https://www.hkpcacademy.org/en/hackathon-for-good-2026/', source: 'HKPC Academy', category: 'AI创作' },
  { url: 'https://www.bochk.com/dam/more/bochkchallenge/2026/info_sc.html', source: '中银香港', category: '创业路演' },
  { url: 'https://tec.hku.hk/event/hong-kong-techathon-2026/', source: 'HKU TEC', category: '创业路演' },
  { url: 'https://www.polyu.edu.hk/kteo/competitions-and-events/polyu-ifc/polyu-ifc-2026/', source: 'PolyU', category: '创业路演' },

  // === 音乐/表演 ===
  { url: 'https://hkypa.org/competition_details.php?event_id=1&lang=en', source: 'HKYPAA', category: '音乐表演' },
  { url: 'https://www.eventbrite.hk/e/red-bull-dance-your-style-hong-kong-final-tickets-1991537151230', source: 'Eventbrite', category: '音乐表演' },
  { url: 'https://gasca.org/products/hkmusic', source: 'GASCA', category: '音乐表演' },

  // === 创意/设计/摄影 ===
  { url: 'https://www.yczhansai.com/h-nd-295.html', source: '艺创展赛', category: '创意摄影设计' },
  { url: 'https://www.cnchuangsai.com/58310.html', source: '创赛网', category: '创意摄影设计' },
  { url: 'https://www.e-services-web2.landsd.gov.hk/e-services/sc/photoTakingVideoShootingContest-webform.php', source: '地政总署', category: '创意摄影设计' },
  { url: 'https://thefilipinohub.com/events/dream-centre-multimedia-creative-competition-2026/', source: 'FilipinoHub', category: '创意摄影设计' },

  // === 综合/教育 ===
  { url: 'https://www.hkcyaa.com/post/gbayc-artfestival2026', source: 'CYACA', category: '创意摄影设计' },

  // ====== 新增批次 (2026-08-09) ======
  // === 全国学术/大学生比赛(香港可参加) ===
  { url: 'https://cy.ncss.cn', source: '教育部', category: '创业路演' },
  { url: 'https://waiyu.jlau.edu.cn/info/1037/2063.htm', source: '外研社', category: '其他' },
  { url: 'https://m.saikr.com/vse/Listening26', source: '赛氪', category: '其他' },
  { url: 'https://www.saikr.com/contest/notice_detail/45964', source: '赛氪', category: 'AI创作' },

  // === 香港运动新增 ===
  { url: 'https://www.sportsoho.com/pg/match/ww.dark45.com/light-16', source: 'Sportsoho', category: '运动' },
  { url: 'https://www.disneyimaginations.hk/', source: 'Disney', category: '创意摄影设计' },

  // === 写作/朗诵 ===
  { url: 'https://www.hanacademy.edu.hk/tc/han-cup', source: '汉鼎书院', category: '其他' },
  { url: 'https://www.heritageconn.com/competition2026/', source: '薪传学社', category: '其他' },
  { url: 'https://events.polyu.edu.hk/essaycompetition2026/submission', source: 'PolyU', category: '其他' },
]

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HK-Compass/1.0)', 'Accept': 'text/html,application/xhtml+xml' },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function extractWithAI(html: string, url: string): Promise<any | null> {
  // 只用前 4000 字符给 AI
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)

  const prompt = `从以下香港比赛页面文本中提取结构化信息。只返回JSON，不要其他内容。

页面URL: ${url}
页面文本:
${text}

返回JSON格式:
{
  "title": "比赛名称(中文优先)",
  "title_en": "英文名称(如有)",
  "type": "运动|电竞|创意摄影设计|AI创作|创业路演|音乐表演|其他",
  "description": "简要描述(100字内)",
  "date_start": "YYYY-MM-DD",
  "date_end": "YYYY-MM-DD或null",
  "registration_deadline": "YYYY-MM-DD或null(报名截止日)",
  "location": "港岛|九龙|新界|线上|不限",
  "venue": "具体场地或null",
  "fee_type": "免费|付费|有奖金",
  "fee_amount": "费用金额或null",
  "prize": "奖金描述或null",
  "organizer": "主办方或null",
  "registration_link": "报名链接或null",
  "age_group": "儿童|青少年|成人公开|不限",
  "team_size": "个人赛|2-3人|4-6人|7人以上|不限"
}

如果页面明显不是比赛页面或无法提取信息，返回 {"error": "not_a_competition"}。`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1000,
      }),
    })
    const json: any = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) return null

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('AI extraction error:', e)
    return null
  }
}

async function main() {
  console.log(`🔍 处理 ${COMPETITIONS.length} 个真实比赛URL\n`)

  let added = 0, skipped = 0, failed = 0

  for (const comp of COMPETITIONS) {
    // Check duplicate
    const { data: existing } = await supabase.from('competitions').select('id').eq('source_url', comp.url).maybeSingle()
    if (existing) {
      console.log(`⏭ 已存在: ${comp.url.slice(0, 60)}`)
      skipped++
      continue
    }

    console.log(`\n📄 ${comp.url.slice(0, 80)}`)
    const html = await fetchPage(comp.url)
    if (!html) {
      console.log(`  ❌ 无法访问`)
      failed++
      continue
    }

    const data = await extractWithAI(html, comp.url)
    if (!data || data.error) {
      console.log(`  ❌ 提取失败: ${data?.error || 'no data'}`)
      failed++
      continue
    }

    // 验证日期 — 必须在未来
    const now = new Date()
    if (data.registration_deadline) {
      if (new Date(data.registration_deadline) < now) {
        console.log(`  ⏰ 报名已截止: ${data.title} (${data.registration_deadline})`)
        skipped++
        continue
      }
    } else if (data.date_start && new Date(data.date_start) < now) {
      console.log(`  ⏰ 比赛已开始: ${data.title} (${data.date_start})`)
      skipped++
      continue
    }

    // 插入
    const { error } = await supabase.from('competitions').insert({
      title: data.title?.slice(0, 200) || 'Unknown',
      title_en: data.title_en?.slice(0, 200) || null,
      type: data.type || comp.category,
      description: data.description?.slice(0, 1000) || null,
      date_start: data.date_start || new Date().toISOString().split('T')[0],
      date_end: data.date_end || null,
      registration_deadline: data.registration_deadline || null,
      location: ['港岛','九龙','新界','线上'].includes(data.location) ? data.location : '线上',
      venue: data.venue?.slice(0, 200) || null,
      fee_type: normalizeFeeType(data.fee_type),
      fee_amount: String(data.fee_amount || '').slice(0, 50) || null,
      prize: data.prize?.slice(0, 200) || null,
      organizer: data.organizer?.slice(0, 200) || null,
      registration_link: data.registration_link?.slice(0, 500) || null,
      age_group: normalizeAgeGroup(data.age_group),
      team_size: normalizeTeamSize(data.team_size),
      eligibility: '不限',
      status: '报名中',
      source: comp.source,
      source_url: comp.url,
      review_status: 'pending',
    })

    if (error) {
      console.log(`  ❌ 入库失败: ${error.message}`)
      failed++
    } else {
      console.log(`  ✅ [${data.type}] ${data.title?.slice(0, 60)}`)
      added++
    }

    // Rate limit for DeepSeek
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n======= 结果 =======`)
  console.log(`✅ 新增: ${added}`)
  console.log(`⏭ 跳过: ${skipped}`)
  console.log(`❌ 失败: ${failed}`)

  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count} / 1000`)
}

main().catch(console.error)

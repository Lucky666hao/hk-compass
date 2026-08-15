/**
 * Fitz.hk 批量采集 — 香港运动赛事
 * Fitz 是 WordPress 站点，HTML 清晰可直接解析
 * 抓取所有 /events/ 页面 → 提取香港本地比赛 → 入库
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// 归一化函数：确保AI返回值匹配数据库约束
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

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HK-Compass/1.0)', 'Accept': 'text/html' },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function extractWithAI(html: string, url: string): Promise<any | null> {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)

  const prompt = `从以下香港运动比赛页面提取信息。只返回JSON：
页面URL: ${url}
页面内容: ${text}

返回JSON:
{
  "title": "比赛名称(中文)",
  "title_en": "英文名称(如有)",
  "date_start": "YYYY-MM-DD",
  "date_end": "YYYY-MM-DD或null",
  "registration_deadline": "YYYY-MM-DD或null",
  "location": "港岛|九龙|新界|线上|不限",
  "venue": "场地或null",
  "fee_type": "免费|付费|有奖金",
  "fee_amount": "费用或null",
  "prize": "奖金或null",
  "organizer": "主办方或null",
  "registration_link": "报名链接或null",
  "age_group": "儿童|青少年|成人公开|不限",
  "team_size": "个人赛|2-3人|4-6人|7人以上|不限",
  "is_hk_event": true或false,
  "is_future_event": true或false(比赛是否在2026年8月10日后)
}
如果页面不是香港本地比赛或已过期，返回 {"is_hk_event": false} 或 {"is_future_event": false}。`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 1000 }),
    })
    const json: any = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) return null
    const m = content.match(/\{[\s\S]*\}/)
    if (!m) return null
    return JSON.parse(m[0])
  } catch { return null }
}

async function main() {
  console.log('🔍 抓取 Fitz.hk 赛事列表...')

  // 收集所有 events 页面 URL
  const allEventUrls: string[] = []

  // 抓取多页 (category/events + 分页)
  for (let page = 1; page <= 10; page++) {
    const listUrl = page === 1
      ? 'https://fitz.hk/category/events/'
      : `https://fitz.hk/category/events/page/${page}/`

    const html = await fetchHtml(listUrl)
    if (!html) { console.log(`  列表页 ${page} 不可访问`); continue }

    const $ = cheerio.load(html)
    let count = 0
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href.includes('/events/') && href.startsWith('https://fitz.hk/')) {
        // 排除图片链接
        if (/\.(png|jpg|jpeg|gif|webp)$/i.test(href)) return
        if (!allEventUrls.includes(href)) {
          allEventUrls.push(href)
          count++
        }
      }
    })
    console.log(`  第${page}页: +${count} 个赛事URL (总计 ${allEventUrls.length})`)
    if (count === 0) break
  }

  console.log(`\n📋 共 ${allEventUrls.length} 个赛事页面\n`)

  let added = 0, skipped = 0, failed = 0

  for (const url of allEventUrls) {
    // 查重
    const { data: existing } = await supabase.from('competitions').select('id').eq('source_url', url).maybeSingle()
    if (existing) { skipped++; continue }

    console.log(`📄 ${url.slice(0, 80)}`)
    const html = await fetchHtml(url)
    if (!html) { console.log(`  ❌ 无法访问`); failed++; continue }

    const data = await extractWithAI(html, url)
    if (!data) { console.log(`  ❌ AI提取失败`); failed++; continue }
    if (!data.is_hk_event) { console.log(`  🌍 非香港赛事`); skipped++; continue }
    if (!data.is_future_event) { console.log(`  ⏰ 已过期`); skipped++; continue }

    const { error } = await supabase.from('competitions').insert({
      title: data.title?.slice(0, 200) || 'Unknown',
      title_en: data.title_en?.slice(0, 200) || null,
      type: '运动',
      description: null,
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
      source: 'Fitz',
      source_url: url,
      review_status: 'pending',
    })

    if (error) {
      console.log(`  ❌ ${error.message}`)
      failed++
    } else {
      console.log(`  ✅ ${data.title?.slice(0, 60)}`)
      added++
    }

    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n======= 结果 =======`)
  console.log(`✅ 新增: ${added} | ⏭ 跳过: ${skipped} | ❌ 失败: ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count} / 1000`)
}

main().catch(console.error)

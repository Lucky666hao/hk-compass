/**
 * 艺术/音乐/绘画比赛批量采集器
 * 针对 WordPress 类比赛站点：HKYCAA, YCMAA, KACA, WACAC, HKPAOA 等
 * 运行: npx tsx scripts/scrape-arts.ts
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

const DEEPSEEK = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function nTeamSize(v: string | undefined): string {
  if (!v) return '不限'
  const s = v.toLowerCase()
  if (/个人|個人|单人|單人|individual|solo|单人赛|個人賽|^1人$|^1$/.test(s)) return '个人赛'
  if (/2.*3|2-3|2~3|双人|兩人|pair|duo/.test(s)) return '2-3人'
  if (/4.*6|4-6|4~6|小队|小組/.test(s)) return '4-6人'
  if (/7|团队|團隊|team|团体|團體|多人|组队|組隊/.test(s)) return '7人以上'
  return '不限'
}
function nAge(v: string | undefined): string {
  if (!v) return '不限'
  const s = v.toLowerCase()
  if (/儿童|兒童|小孩|kid|child|幼儿|幼兒|親子|小学|小學|幼稚園/.test(s)) return '儿童'
  if (/青少年|青年|teen|youth|中学|中學|少年/.test(s)) return '青少年'
  if (/成人|公开|公開|adult|大众|大眾|公眾|大專|大學/.test(s)) return '成人公开'
  return '不限'
}
function nFee(v: string | undefined): string {
  if (!v) return '付费'
  const s = v.toLowerCase()
  if (/免费|免費|全免|費用全免/.test(s)) return '免费'
  if (/奖金|獎金|有奖|現金獎/.test(s)) return '有奖金'
  return '付费'
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HK-Compass/1.0)', 'Accept': 'text/html' } })
    clearTimeout(t)
    if (!r.ok) return null
    return await r.text()
  } catch { return null }
}

async function extractWithAI(html: string, url: string): Promise<any | null> {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)

  const prompt = `从这个香港比赛页面提取信息。只返回JSON：
URL: ${url}
内容: ${text}

返回JSON:
{
  "title": "比赛名称(中文优先)",
  "title_en": "英文名称(如有)",
  "type": "运动|电竞|创意摄影设计|AI创作|创业路演|音乐表演|其他",
  "date_start": "YYYY-MM-DD或null",
  "date_end": "YYYY-MM-DD或null",
  "registration_deadline": "YYYY-MM-DD或null",
  "location": "线上|港岛|九龙|新界",
  "venue": "场地或null",
  "fee_type": "免费|付费|有奖金",
  "fee_amount": "费用或null",
  "prize": "奖金或null",
  "organizer": "主办方或null",
  "registration_link": "报名链接或null",
  "age_group": "儿童|青少年|成人公开|不限",
  "team_size": "个人赛|2-3人|4-6人|7人以上|不限",
  "is_hk_event": true或false,
  "is_future_event": true或false(报名截止日/比赛日在2026年8月10日后)
}
如果不是香港比赛或无未来日期，返回 {"is_hk_event": false} 或 {"is_future_event": false}。`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 1000 }),
    })
    const j: any = await res.json()
    const content = j.choices?.[0]?.message?.content
    if (!content) return null
    const m = content.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  } catch { return null }
}

// 多个艺术比赛网站的列表页
const SOURCES = [
  // HKYCAA — 香港青年创艺协会
  { name: 'HKYCAA', baseUrl: 'https://www.hkycaa.org', pages: ['https://www.hkycaa.org/contest'], category: '音乐表演' },
  // YCMAA — 青少年及儿童音乐艺术协会
  { name: 'YCMAA', baseUrl: 'https://www.ycmaa.com', pages: ['https://www.ycmaa.com/competitions', 'https://www.ycmaa.com/post'], category: '音乐表演' },
  // KACA — 儿童艺术文化协会
  { name: 'KACA', baseUrl: 'https://www.hkkaca.org', pages: ['https://www.hkkaca.org/post', 'https://www.hkkaca.org/blog'], category: '创意摄影设计' },
  // HKGCPAA — 香港艺创协会
  { name: 'HKGCPAA', baseUrl: 'https://www.hkgcpaa.com', pages: ['https://www.hkgcpaa.com/post', 'https://www.hkgcpaa.com/blog'], category: '音乐表演' },
  // HKPAOA — 香港钢琴及管弦乐协会
  { name: 'HKPAOA', baseUrl: 'https://www.hkpaoa.com', pages: ['https://www.hkpaoa.com/blog', 'https://www.hkpaoa.com/post'], category: '音乐表演' },
  // WACAC — 全球创意艺术文化协会
  { name: 'WACAC', baseUrl: 'https://www.wacachk.org', pages: ['https://www.wacachk.org/41', 'https://www.wacachk.org/blog'], category: '创意摄影设计' },
  // HKAOAC — 香港文艺协会
  { name: 'HKAOAC', baseUrl: 'https://www.hkaoac.com', pages: ['https://www.hkaoac.com/post', 'https://www.hkaoac.com/blog'], category: '创意摄影设计' },
  // HKYCTA — 香港青少年及儿童才艺表演协会
  { name: 'HKYCTA', baseUrl: 'https://www.hkycta.com', pages: ['https://www.hkycta.com/post', 'https://www.hkycta.com/blog'], category: '音乐表演' },
  // 香港音乐创艺发展中心
  { name: 'HKMusicArts', baseUrl: 'https://hkmusic-arts.com', pages: ['https://hkmusic-arts.com/blog'], category: '音乐表演' },
]

const COMP_KEYWORDS = /比賽|比赛|大賽|大赛|competition|報名|报名|register|賽事|contest|award|獎|竞赛|挑戰|challenge|招募|申請|apply|enroll|音樂|music|钢琴|繪畫|绘画|art|設計|design|攝影|摄影|歌唱|跳舞|dance/

async function main() {
  console.log(`🎨 HK Compass 艺术比赛采集 — ${SOURCES.length} 个来源\n`)

  let allUrls: { url: string; source: string }[] = []

  // Phase 1: 收集所有比赛URL
  for (const src of SOURCES) {
    console.log(`🔍 ${src.name}...`)
    for (const pageUrl of src.pages) {
      const html = await fetchHtml(pageUrl)
      if (!html) { console.log(`  ❌ ${pageUrl}`); continue }
      const $ = cheerio.load(html)
      let count = 0
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const text = $(el).text().trim()
        if (!text || text.length < 5) return
        if (!COMP_KEYWORDS.test(text)) return
        if (/\.(png|jpg|jpeg|gif|webp|pdf)$/i.test(href)) return
        let fullUrl: string
        try { fullUrl = new URL(href, src.baseUrl).href } catch { return }
        // 只保留同站URL
        if (!fullUrl.includes(new URL(src.baseUrl).hostname)) return
        allUrls.push({ url: fullUrl, source: src.name })
        count++
      })
      console.log(`  ${pageUrl}: +${count}`)
    }
  }

  // 去重
  const seen = new Set<string>()
  allUrls = allUrls.filter(u => { const k = u.url; if (seen.has(k)) return false; seen.add(k); return true })
  console.log(`\n📋 共 ${allUrls.length} 个候选比赛URL\n`)

  let added = 0, skipped = 0, failed = 0

  // Phase 2: 逐个处理
  for (const { url, source } of allUrls) {
    // 查重
    const { data: existing } = await supabase.from('competitions').select('id').eq('source_url', url).maybeSingle()
    if (existing) { skipped++; continue }

    const html = await fetchHtml(url)
    if (!html) { failed++; continue }

    const data = await extractWithAI(html, url)
    if (!data) { failed++; continue }
    if (!data.is_hk_event) { skipped++; continue }
    if (!data.is_future_event) { skipped++; continue }

    const { error } = await supabase.from('competitions').insert({
      title: data.title?.slice(0, 200) || 'Unknown',
      title_en: data.title_en?.slice(0, 200) || null,
      type: data.type || '其他',
      description: data.description?.slice(0, 1000) || null,
      date_start: data.date_start || new Date().toISOString().split('T')[0],
      date_end: data.date_end || null,
      registration_deadline: data.registration_deadline || null,
      location: ['港岛','九龙','新界','线上'].includes(data.location) ? data.location : '线上',
      venue: data.venue?.slice(0, 200) || null,
      fee_type: nFee(data.fee_type),
      fee_amount: String(data.fee_amount || '').slice(0, 50) || null,
      prize: data.prize?.slice(0, 200) || null,
      organizer: data.organizer?.slice(0, 200) || null,
      registration_link: data.registration_link?.slice(0, 500) || null,
      age_group: nAge(data.age_group),
      team_size: nTeamSize(data.team_size),
      eligibility: '不限',
      status: '报名中',
      source: source,
      source_url: url,
    })

    if (error) {
      console.log(`❌ ${data.title?.slice(0, 40)} — ${error.message}`)
      failed++
    } else {
      console.log(`✅ [${data.type}] ${data.title?.slice(0, 60)}`)
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

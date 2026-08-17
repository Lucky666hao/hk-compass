/**
 * 手动搜索验证过的新比赛批量采集（2026-08-17）
 * 来源：WebSearch 找到的、还在报名期的比赛
 * 运行: npx tsx scripts/scrape-new-batch.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

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

async function fetchPage(url: string): Promise<string | null> {
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
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
  const prompt = `从以下香港比赛页面提取结构化信息。只返回JSON：
URL: ${url}
内容: ${text}

返回JSON:
{
  "title": "比赛名称(中文优先)",
  "title_en": "英文名称(如有)",
  "type": "运动|电竞|创意摄影设计|AI创作|创业路演|音乐表演|其他",
  "description": "简要描述(100字内)",
  "date_start": "YYYY-MM-DD",
  "date_end": "YYYY-MM-DD或null",
  "registration_deadline": "YYYY-MM-DD或null(报名截止日)",
  "location": "港岛|九龙|新界|线上|不限",
  "venue": "场地或null",
  "fee_type": "免费|付费|有奖金",
  "fee_amount": "费用或null",
  "prize": "奖金描述或null",
  "organizer": "主办方或null",
  "registration_link": "报名链接或null",
  "age_group": "儿童|青少年|成人公开|不限",
  "team_size": "个人赛|2-3人|4-6人|7人以上|不限"
}
如果不是比赛页面或无法提取，返回 {"error":"not_a_competition"}。`

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

const COMPETITIONS = [
  { url: 'https://www.hkcaea.org/post/outstandingaug2026', source: '香港教育工作者聯會', category: '其他' },
  { url: 'https://csu.hkfyg.org.hk/apymf2026/', source: '香港青年協會', category: '音乐表演' },
  { url: 'https://hongkongliterary.com.hk/msgdetail.jsp?id=ZH2026040121392&nav=3', source: '香港文學網', category: '其他' },
]

async function main() {
  console.log(`🔍 处理 ${COMPETITIONS.length} 个新比赛URL\n`)
  let added = 0, skipped = 0, failed = 0

  for (const comp of COMPETITIONS) {
    const { data: existing } = await supabase.from('competitions').select('id').eq('source_url', comp.url).maybeSingle()
    if (existing) { console.log(`⏭ 已存在: ${comp.url.slice(0, 60)}`); skipped++; continue }

    console.log(`📄 ${comp.url.slice(0, 80)}`)
    const html = await fetchPage(comp.url)
    if (!html) { console.log(`  ❌ 无法访问`); failed++; continue }

    const data = await extractWithAI(html, comp.url)
    if (!data || data.error) { console.log(`  ❌ 提取失败: ${data?.error || 'no data'}`); failed++; continue }

    // 日期校验：报名截止或比赛日必须在未来
    const now = new Date()
    const dl = data.registration_deadline ? new Date(data.registration_deadline) : null
    const ds = data.date_start ? new Date(data.date_start) : null
    if ((!dl || dl < now) && (!ds || ds < now)) {
      console.log(`  ⏰ 已过期: ${data.title} (截止${data.registration_deadline || '—'})`)
      skipped++; continue
    }

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
      fee_type: nFee(data.fee_type),
      fee_amount: String(data.fee_amount || '').slice(0, 50) || null,
      prize: data.prize?.slice(0, 200) || null,
      organizer: data.organizer?.slice(0, 200) || null,
      registration_link: data.registration_link?.slice(0, 500) || null,
      age_group: nAge(data.age_group),
      team_size: nTeamSize(data.team_size),
      eligibility: '不限',
      status: '报名中',
      source: comp.source,
      source_url: comp.url,
      review_status: 'pending',
    })

    if (error) { console.log(`  ❌ 入库失败: ${error.message}`); failed++ }
    else { console.log(`  ✅ [${data.type}] ${data.title?.slice(0, 60)}`); added++ }

    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n======= 结果 =======`)
  console.log(`✅ 新增: ${added} | ⏭ 跳过: ${skipped} | ❌ 失败: ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count}`)
}

main().catch(console.error)

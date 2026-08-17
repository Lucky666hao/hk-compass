/**
 * 回源补全 — 对缺字段的比赛，重新访问 source_url 用 DeepSeek 提取缺失字段补上
 * 只补空的、不覆盖已有的；source_url 失效的跳过
 * 运行: node scripts/backfill-fields.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
const DEEPSEEK = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const FIELDS = ['description', 'prize', 'venue', 'organizer', 'fee_amount', 'title_en']

function clean(v) {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null
  if (/^(null|undefined|n\/a|na|none|无|暂无|不详|待定|待确认|tbc|tbd|不適用|不适用|未知|—|-|×|暂无信息|待公布)$/i.test(s)) return null
  return s
}
function cleanEn(v) {
  const s = clean(v)
  if (!s) return null
  if (!/[a-zA-Z]/.test(s)) return null
  return s
}
function cleanFee(v) {
  const s = clean(v)
  if (!s) return null
  if (!/\d/.test(s)) return null
  return s
}

async function fetchPage(url) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HK-Compass/1.0)', 'Accept': 'text/html' } })
    clearTimeout(t)
    if (!r.ok) return null
    const txt = await r.text()
    return txt
  } catch { return null }
}

async function extractWithAI(html, url) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500)
  const prompt = `这是香港一个比赛的页面。请提取以下信息，页面没有提到的字段一律返回 null，不要编造：
URL: ${url}
内容: ${text}

只返回JSON（字段值用中文，title_en用英文）:
{
  "description": "比赛简介(80字内，概括是什么比赛、谁参加、形式)或null",
  "prize": "奖项/奖金描述或null",
  "venue": "比赛场地或null",
  "organizer": "主办方名称或null",
  "fee_amount": "报名费用(如 HKD100、免费则填'免费')或null",
  "title_en": "英文名称或null"
}
注意：网页里找不到的信息填 null，绝不要凭空猜测。`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 800 }),
    })
    if (!res.ok) return null
    const j = await res.json()
    const content = j.choices?.[0]?.message?.content
    if (!content) return null
    const m = content.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  } catch { return null }
}

async function main() {
  const { data } = await supabase.from('competitions')
    .select('id,title,source_url,description,prize,venue,organizer,fee_amount,title_en')

  const targets = data.filter(c => c.source_url && FIELDS.some(f => !c[f]))
  console.log(`📋 总 ${data.length} 条，需回源补全 ${targets.length} 条\n`)

  let filled = 0, noGain = 0, inaccessible = 0, extractFail = 0
  const fieldCount = {}

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i]
    const missing = FIELDS.filter(f => !c[f])
    console.log(`[${i + 1}/${targets.length}] ${c.title.slice(0, 40)}  缺[${missing.join(',')}]`)

    const html = await fetchPage(c.source_url)
    if (!html) { console.log(`   ⛔ 无法访问 ${c.source_url.slice(0, 70)}`); inaccessible++; await new Promise(r => setTimeout(r, 300)); continue }

    const d = await extractWithAI(html, c.source_url)
    if (!d) { console.log(`   ⚠️ AI提取失败`); extractFail++; await new Promise(r => setTimeout(r, 300)); continue }

    const upd = {}
    if (!c.description) { const v = clean(d.description); if (v) upd.description = v.slice(0, 1000) }
    if (!c.prize) { const v = clean(d.prize); if (v) upd.prize = v.slice(0, 200) }
    if (!c.venue) { const v = clean(d.venue); if (v) upd.venue = v.slice(0, 200) }
    if (!c.organizer) { const v = clean(d.organizer); if (v) upd.organizer = v.slice(0, 200) }
    if (!c.fee_amount) { const v = cleanFee(d.fee_amount); if (v) upd.fee_amount = v.slice(0, 50) }
    if (!c.title_en) { const v = cleanEn(d.title_en); if (v) upd.title_en = v.slice(0, 200) }

    const keys = Object.keys(upd)
    if (keys.length === 0) { console.log(`   ➖ 页面无新信息可补`); noGain++; await new Promise(r => setTimeout(r, 300)); continue }

    const { error } = await supabase.from('competitions').update(upd).eq('id', c.id)
    if (error) { console.log(`   ❌ 更新失败: ${error.message}`); extractFail++ }
    else {
      filled++
      for (const k of keys) fieldCount[k] = (fieldCount[k] || 0) + 1
      console.log(`   ✅ 补全 ${keys.length} 字段: ${keys.map(k => `${k}="${String(upd[k]).slice(0, 20)}"`).join(' ')}`)
    }
    await new Promise(r => setTimeout(r, 400))
  }

  console.log(`\n======= 回源补全结果 =======`)
  console.log(`✅ 成功补全: ${filled} 条`)
  console.log(`➖ 页面无新信息: ${noGain}`)
  console.log(`⛔ 无法访问: ${inaccessible}`)
  console.log(`⚠️ 提取/更新失败: ${extractFail}`)
  console.log(`字段补全数: ${JSON.stringify(fieldCount)}`)

  const { data: remain } = await supabase.from('competitions').select('id')
  const stillMissing = await supabase.from('competitions')
    .select('id,description,prize,venue,organizer,fee_amount,title_en').neq('review_status', 'approved')
  // 统计剩余缺字段（不含 title_en 已可空）
  const rem = stillMissing.data || []
  const remCount = { description: 0, prize: 0, venue: 0, organizer: 0, fee_amount: 0, title_en: 0 }
  for (const r of rem) for (const f of FIELDS) if (!r[f]) remCount[f]++
  console.log(`剩余缺字段(approved外全量): ${JSON.stringify(remCount)}`)
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })

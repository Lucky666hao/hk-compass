/**
 * 赛氪(saikr) + 其他全国比赛批量采集
 * 单独URL集合，通过 DeepSeek 提取后入库
 * 运行: npx tsx scripts/scrape-saikr.ts
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
  if (/成人|公开|公開|adult|大众|大眾|公眾|大專|大學|大学生/.test(s)) return '成人公开'
  return '不限'
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

async function extractAI(html: string, url: string): Promise<any | null> {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
  const prompt = `从以下比赛页面提取信息。只返回JSON：
URL: ${url}
内容: ${text}
返回JSON:
{
  "title": "比赛名称(中文优先)",
  "title_en": "英文名称(如有)",
  "type": "运动|电竞|创意摄影设计|AI创作|创业路演|音乐表演|其他",
  "date_start": "YYYY-MM-DD或null",
  "date_end": "YYYY-MM-DD或null",
  "registration_deadline": "YYYY-MM-DD或null(报名截止日)",
  "location": "线上|港岛|九龙|新界",
  "venue": "场地或null",
  "fee_type": "免费|付费|有奖金",
  "fee_amount": "费用或null",
  "prize": "奖金或null",
  "organizer": "主办方或null",
  "registration_link": "报名链接或null",
  "age_group": "儿童|青少年|成人公开|不限",
  "team_size": "个人赛|2-3人|4-6人|7人以上|不限",
  "is_future_event": true或false(报名截止日/比赛日在2026年8月10日后)
}
如果不是比赛或已过期，返回 {"is_future_event": false}。`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 1000 }),
    })
    const j: any = await res.json()
    const c = j.choices?.[0]?.message?.content
    if (!c) return null
    const m = c.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  } catch { return null }
}

const URLS = [
  // === 赛氪 学术/科技 ===
  { url: 'https://m.saikr.com/vse/XMTDX2026', source: '赛氪', category: '其他' },
  { url: 'https://new.saikr.com/vse/HTB2026FY5', source: '赛氪', category: '其他' },
  { url: 'https://new.saikr.com/vse/HZRGZN', source: '赛氪', category: 'AI创作' },
  { url: 'https://new.saikr.com/vse/CXJYZqj2026', source: '赛氪', category: '创业路演' },
  { url: 'https://m.saikr.com/vse/CRH260803', source: '赛氪', category: 'AI创作' },
  { url: 'https://m.saikr.com/vse/IPCESC/2026', source: '赛氪', category: '其他' },
  { url: 'https://m.saikr.com/vse/2026MATH', source: '赛氪', category: '其他' },

  // === 我爱竞赛网 ===
  { url: 'https://www.52jingsai.com/article-23927-1.html', source: '52jingsai', category: '创业路演' },
  { url: 'https://www.52jingsai.com/portal.php/games/archiver/archiver/games/archiver/article-21734-1.html', source: '52jingsai', category: '其他' },

  // === 其他全国比赛 ===
  { url: 'https://www.cnchuangsai.com/58422.html', source: '创赛网', category: '创业路演' },
  { url: 'https://www.saikr.com/vse/chinamcm/2026', source: '赛氪', category: 'AI创作' },

  // === 香港更多比赛 ===
  { url: 'https://www.hkage.edu.hk/zh-cn/article/imoprelim2026', source: 'HKAGE', category: '其他' },
  { url: 'https://www.hkyaf.com/zh/events/', source: 'HKYAF', category: '音乐表演' },
  { url: 'https://www.youth.gov.hk/en/activity-calendar/', source: 'YouthGovHK', category: '其他' },

  // === 摄影/创意 ===
  { url: 'https://www.wacachk.org/41', source: 'WACAC', category: '创意摄影设计' },
  { url: 'https://www.hkycaa.org/voyage-de-reve-2026', source: 'HKYCAA', category: '创意摄影设计' },
  { url: 'https://www.hkycaa.org/summer-of-music-2026', source: 'HKYCAA', category: '音乐表演' },
  { url: 'https://www.hkycaa.org/hall-of-fame-2026', source: 'HKYCAA', category: '音乐表演' },

  // === 运动更多 ===
  { url: 'https://www.paobaodao.com/hong-kong/race/hong-kong-aquathlon-championships-2026/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/trail-race-hk-2026/', source: 'PaoBaoDao', category: '运动' },
  { url: 'https://www.paobaodao.com/hong-kong/race/hk-run-2026/', source: 'PaoBaoDao', category: '运动' },
]

async function main() {
  console.log(`🔍 处理 ${URLS.length} 个比赛URL\n`)
  let added = 0, skipped = 0, failed = 0

  for (const comp of URLS) {
    const { data: existing } = await supabase.from('competitions').select('id').eq('source_url', comp.url).maybeSingle()
    if (existing) { console.log(`⏭ 已存在: ${comp.url.slice(0, 50)}`); skipped++; continue }

    console.log(`📄 ${comp.url.slice(0, 70)}`)
    const html = await fetchPage(comp.url)
    if (!html) { console.log(`  ❌ 无法访问`); failed++; continue }

    const data = await extractAI(html, comp.url)
    if (!data || !data.is_future_event) {
      console.log(`  ${!data ? '❌ 提取失败' : '⏰ 已过期/非比赛'}`)
      failed++
      continue
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
      fee_type: data.fee_type || '付费',
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

    if (error) { console.log(`  ❌ ${error.message}`); failed++ }
    else { console.log(`  ✅ [${data.type}] ${data.title?.slice(0, 60)}`); added++ }
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n======= 结果 =======`)
  console.log(`✅ 新增: ${added} | ⏭ 跳过: ${skipped} | ❌ 失败: ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count} / 1000`)
}

main().catch(console.error)

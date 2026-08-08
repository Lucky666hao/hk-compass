/**
 * HK Compass — 比赛自动发现系统 (v2 — 零 AI 调用)
 *
 * 用法: npx tsx scripts/pipeline.ts
 *       npx tsx scripts/pipeline.ts --dry-run    (只扫描不入库)
 *
 * 三条铁律:
 * 1. 智能分拣 — CSS 选择器精确提取，枚举值校验，日期/年龄/人数自动修正
 * 2. 每日上限 — 默认50条/天 (DISCOVER_DAILY_LIMIT)
 * 3. 遵纪守法 — 先读 robots.txt，Disallow 的不碰，遵守 Crawl-Delay
 *
 * 零 AI 调用 — 纯 cheerio HTML 解析 + 正则匹配
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ============================================
// 配置
// ============================================
const DAILY_LIMIT = parseInt(process.env.DISCOVER_DAILY_LIMIT || '50', 10)
const USER_AGENT = 'HK-Compass/1.0 (+https://hk-compass.vercel.app; Competition Discovery Bot)'
const MIN_DELAY_MS = 2000

// ============================================
// 合法枚举值
// ============================================
const VALID_TYPES = ['运动', '电竞', '创意摄影设计', 'AI创作', '创业路演', '音乐表演', '其他'] as const
const VALID_LOCATIONS = ['港岛', '九龙', '新界', '线上', '不限'] as const
const VALID_FEE_TYPES = ['免费', '付费', '有奖金'] as const
const VALID_AGE_GROUPS = ['儿童', '青少年', '成人公开', '不限'] as const
const VALID_TEAM_SIZES = ['个人赛', '2-3人', '4-6人', '7人以上', '不限'] as const
const VALID_ELIGIBILITY = ['个人报名', '学校提名', '两者皆可', '不限'] as const

// ============================================
// 比赛数据结构
// ============================================
interface CompetitionData {
  title: string
  title_en?: string | null
  type: string
  description?: string | null
  date_start: string
  date_end?: string | null
  registration_deadline?: string | null
  location: string
  venue?: string | null
  venue_en?: string | null
  fee_type: string
  fee_amount?: string | null
  prize?: string | null
  organizer?: string | null
  registration_link?: string | null
  age_group?: string | null
  team_size?: string | null
  eligibility?: string | null
}

// ============================================
// robots.txt 检查
// ============================================
async function checkRobots(url: string): Promise<{ allowed: boolean; crawlDelay: number | null }> {
  const parsed = new URL(url)
  const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })
    clearTimeout(timeout)

    if (!res.ok) return { allowed: true, crawlDelay: 5 }

    const text = await res.text()
    const lines = text.split('\n').map(l => l.trim())
    let crawlDelay: number | null = null
    let relevant = false
    let disallowedPaths: string[] = []

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue
      const lower = line.toLowerCase()
      if (lower.startsWith('user-agent:')) {
        const agent = line.split(':')[1].trim().toLowerCase()
        relevant = (agent === '*' || agent === 'hk-compass')
        continue
      }
      if (relevant) {
        if (lower.startsWith('crawl-delay:')) {
          const d = parseFloat(line.split(':')[1].trim())
          if (!isNaN(d)) crawlDelay = d
        }
        if (lower.startsWith('disallow:')) {
          disallowedPaths.push(line.split(':').slice(1).join(':').trim())
        }
      }
    }

    // 检查当前路径是否被禁止
    for (const dp of disallowedPaths) {
      if (dp && parsed.pathname.startsWith(dp)) {
        return { allowed: false, crawlDelay }
      }
    }

    return { allowed: true, crawlDelay: crawlDelay ?? 5 }
  } catch {
    return { allowed: true, crawlDelay: 5 }
  }
}

// ============================================
// 网络请求
// ============================================
let lastRequestTime = 0

async function fetchHtml(url: string): Promise<string | null> {
  // 速率控制
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(r => setTimeout(r, MIN_DELAY_MS - elapsed))
  }
  lastRequestTime = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ============================================
// 通用 HTML 提取器
// ============================================

/**
 * 从 HTML 中提取所有链接，过滤出可能是比赛链接的
 * 关键词匹配：比赛、competition、报名、register、赛事、contest、award
 */
function extractCompetitionLinks(html: string, baseUrl: string): { title: string; url: string }[] {
  const $ = cheerio.load(html)
  const links: { title: string; url: string }[] = []
  const seen = new Set<string>()

  const keywords = /比赛|competition|報名|register|賽事|contest|award|獎|比赛|竞赛|挑戰|challenge|招募|open|青少年|學界|校際/

  $('a[href]').each((_, el) => {
    const $a = $(el)
    const href = $a.attr('href') || ''
    const text = $a.text().trim()

    if (!text || text.length < 3 || text.length > 200) return
    if (!keywords.test(text)) return

    // 解析 URL
    let fullUrl: string
    try {
      fullUrl = new URL(href, baseUrl).href
    } catch {
      return
    }

    // 只保留同域名链接（更可靠）
    const baseHost = new URL(baseUrl).host
    if (new URL(fullUrl).host !== baseHost) return

    const key = text.slice(0, 40)
    if (seen.has(key)) return
    seen.add(key)

    links.push({ title: text, url: fullUrl })
  })

  return links.slice(0, 20) // 每页最多20个候选链接
}

/**
 * 从单个比赛详情页提取结构化信息
 * 这是一个尽力而为的通用提取器
 */
function extractFromDetailPage(html: string, url: string): CompetitionData | null {
  const $ = cheerio.load(html)

  // 移除 script/style/nav/footer
  $('script, style, nav, footer, header, noscript, iframe').remove()

  // 获取页面标题
  const pageTitle = $('title').text().trim() || $('h1').first().text().trim()
  if (!pageTitle || pageTitle.length < 5) return null

  // 获取全文
  const fullText = $('body').text().replace(/\s+/g, ' ').trim()

  // === 日期提取 ===
  const dates = extractDates(fullText)

  // === 地点提取 ===
  const location = extractLocation(fullText)

  // === 费用提取 ===
  const fee = extractFee(fullText)

  // === 年龄提取 ===
  const ageGroup = extractAgeGroup(fullText)

  // === 人数提取 ===
  const teamSize = extractTeamSize(fullText)

  // === 报名资格 ===
  const eligibility = extractEligibility(fullText)

  // === 主办方 ===
  const organizer = extractOrganizer($, fullText)

  // === 报名链接 ===
  const regLink = extractRegistrationLink($, url)

  if (!dates.date_start) return null // 没有日期就不是比赛

  return {
    title: pageTitle.slice(0, 200),
    type: classifyType(fullText, pageTitle),
    description: fullText.slice(0, 500),
    date_start: dates.date_start,
    date_end: dates.date_end,
    registration_deadline: dates.registration_deadline,
    location: location,
    venue: extractVenue(fullText),
    fee_type: fee.type,
    fee_amount: fee.amount,
    prize: extractPrize(fullText),
    organizer,
    registration_link: regLink,
    age_group: ageGroup,
    team_size: teamSize,
    eligibility: eligibility,
  }
}

// ============================================
// 正则提取器
// ============================================

function extractDates(text: string): { date_start: string | null; date_end: string | null; registration_deadline: string | null } {
  // 匹配 YYYY年M月D日 或 YYYY-MM-DD 或 D/M/YYYY
  const datePatterns = [
    /(\d{4})\s*[年\-\/]\s*(\d{1,2})\s*[月\-\/]\s*(\d{1,2})\s*日?/g,
    /(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/g,
  ]

  const allDates: Date[] = []

  for (const pattern of datePatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      try {
        let y: number, m: number, d: number
        if (match[1].length === 4) {
          y = parseInt(match[1]); m = parseInt(match[2]); d = parseInt(match[3])
        } else {
          d = parseInt(match[1]); m = parseInt(match[2]); y = parseInt(match[3])
        }
        const date = new Date(y, m - 1, d)
        if (date.getTime() > 0 && y >= 2025 && y <= 2028) {
          allDates.push(date)
        }
      } catch {}
    }
  }

  allDates.sort((a, b) => a.getTime() - b.getTime())

  const toStr = (d: Date) => d.toISOString().split('T')[0]

  // 启发式：最早 = 开始日期，最晚 = 结束日期
  // 如果提到"截止"/"deadline"，最近的未来日期 = 截止日期
  let deadline: string | null = null
  const deadlineMatch = text.match(/(?:截止|deadline|截止日期|截止報名|報名截止).*?(\d{4}[\-\/年]\d{1,2}[\-\/月]\d{1,2})/i)
  if (deadlineMatch) {
    const d = parseDate(deadlineMatch[1])
    if (d) deadline = toStr(d)
  }

  return {
    date_start: allDates.length > 0 ? toStr(allDates[0]) : null,
    date_end: allDates.length > 1 ? toStr(allDates[allDates.length - 1]) : null,
    registration_deadline: deadline,
  }
}

function parseDate(str: string): Date | null {
  const match = str.match(/(\d{4})\s*[年\-\/]\s*(\d{1,2})\s*[月\-\/]\s*(\d{1,2})/)
  if (match) {
    const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function extractLocation(text: string): string {
  if (/線上|網上|online|virtual|zoom/i.test(text)) return '线上'
  if (/港島|中環|灣仔|銅鑼灣|南區|香港島|金鐘|上環|西環|柴灣|筲箕灣|薄扶林|香港大學|中大校園|城大|理大|浸大|嶺南/.test(text)) return '港岛'
  if (/九龍|旺角|尖沙咀|觀塘|深水埗|油麻地|紅磡|九龍灣|黃大仙|鑽石山|石硤尾/.test(text)) return '九龙'
  if (/新界|沙田|荃灣|屯門|元朗|大埔|離島|東涌|將軍澳|馬鞍山|粉嶺|上水|天水圍|青衣/.test(text)) return '新界'
  return '不限'
}

function extractVenue(text: string): string | null {
  const patterns = [
    /地點[：:]\s*(.+?)(?:[，。\n]|$)/,
    /場地[：:]\s*(.+?)(?:[，。\n]|$)/,
    /venue[：:]\s*(.+?)(?:[，。\n]|$)/i,
    /於\s*(.{2,20}?(?:中學|小學|大學|學院|中心|會堂|體育館|運動場|球場|廣場|酒店|展覽中心|會議中心))/.source,
  ]

  for (const p of patterns) {
    const match = text.match(new RegExp(p, 'i'))
    if (match) return match[1].trim().slice(0, 100)
  }
  return null
}

function extractFee(text: string): { type: string; amount: string | null } {
  if (/免費|free|费用全免|費用全免|无报名费|無報名費/i.test(text)) {
    return { type: '免费', amount: '免费' }
  }
  if (/獎金|奖金|prize money|冠軍.*\$|冠军.*元|獎項|奖品|HKD\s*\d[\d,]*.*獎|HK\$\s*\d[\d,]*.*prize/i.test(text) && /\$[\d,]+/.test(text)) {
    return { type: '有奖金', amount: null }
  }

  const amountMatch = text.match(/(?:費用|报名费|報名費|fee|HKD|HK\$|費用)[：:\s]*\$?\s*(\d[\d,]*)/i)
  return {
    type: '付费',
    amount: amountMatch ? `HKD ${amountMatch[1]}` : null,
  }
}

function extractPrize(text: string): string | null {
  const match = text.match(/(?:獎金|奖金|prize|獎項|奖品)[：:\s]*(.{5,200}?)(?:[。\n]|$)/i)
  return match ? match[1].trim().slice(0, 200) : null
}

function extractAgeGroup(text: string): string {
  if (/小學|小学|兒童|儿童|kid|6\-12|親子|亲子|幼兒|幼稚園|幼儿园|P\d|Primary/i.test(text)) return '儿童'
  if (/中學|中学|青少年|teen|13\-18|S\d|Secondary|中一|中二|中三|中四|中五|中六/i.test(text)) return '青少年'
  if (/大專|大專院校|大學|大学|成人|公開|公开|adult|university|college/i.test(text)) return '成人公开'
  return '不限'
}

function extractTeamSize(text: string): string {
  if (/個人|个人|individual|solo|單人|单人/i.test(text)) return '个人赛'
  if (/2[\-\~至]3人|二人|兩人|雙人|双人|二人一組/i.test(text)) return '2-3人'
  if (/[4４][\-\~至][6６]人|[4-6]人|四人|五人|六人|小組/i.test(text)) return '4-6人'
  if (/(\d+)\s*人\s*以上|團隊|团体|team|隊際/i.test(text)) return '7人以上'
  return '不限'
}

/**
 * 提取报名资格 — 个人直接报名 vs 学校提名
 */
function extractEligibility(text: string): string {
  const schoolOnly = /學校提名|学校提名|經由學校|由學校|校方推薦|老師推薦|學校統一|只限學校|只限学校|學校代表|学校代表|須經學校|须经学校|經學校報名|school nomination|through school/i
  const individualOk = /個人報名|个人报名|自行報名|自行报名|網上報名|网上报名|公開報名|公开报名|歡迎.*參加|欢迎.*参加|individual registration|self registration|open to all|parents.*register|家長.*報名/i

  const isSchoolOnly = schoolOnly.test(text)
  const isIndividualOk = individualOk.test(text)

  if (isSchoolOnly && !isIndividualOk) return '学校提名'
  if (isIndividualOk && !isSchoolOnly) return '个人报名'
  if (isSchoolOnly && isIndividualOk) return '两者皆可'
  return '不限'
}

function extractOrganizer($: cheerio.CheerioAPI, text: string): string | null {
  const patterns = [
    /主辦[：:]\s*(.{3,50}?)(?:[，。\n]|$)/,
    /organizer[：:]\s*(.{3,50}?)(?:[，。\n]|$)/i,
    /主辦機構[：:]\s*(.{3,50}?)(?:[，。\n]|$)/,
    /合辦[：:]\s*(.{3,50}?)(?:[，。\n]|$)/,
  ]
  for (const p of patterns) {
    const match = text.match(p)
    if (match) return match[1].trim().slice(0, 100)
  }
  return null
}

function extractRegistrationLink($: cheerio.CheerioAPI, pageUrl: string): string | null {
  // 找包含报名关键词的链接
  const keywords = /報名|报名|register|apply|申請|sign.?up|enroll/i
  let bestLink: string | null = null

  $('a[href]').each((_, el) => {
    const $a = $(el)
    const href = $a.attr('href') || ''
    const text = $a.text().trim()
    if (keywords.test(text) || keywords.test(href)) {
      try {
        bestLink = new URL(href, pageUrl).href
        return false // break
      } catch {}
    }
  })

  return bestLink
}

function classifyType(text: string, title: string): string {
  const combined = (title + ' ' + text).toLowerCase()
  if (/run|marathon|遊泳|游泳|swim|球|ball|athletic|運動|运动|sport|race|cycling|單車|单车|武術|武术| fencing|劍擊|击剑|射箭|archery|桌球|snooker|billiard/.test(combined)) return '运动'
  if (/電競|电竞|esport|gaming|game.*tournament|league.*of.*legends|valorant|cs.*go/.test(combined)) return '电竞'
  if (/攝影|摄影|photo|設計|设计|design|繪畫|绘画|drawing|art|藝術|艺术|書法|书法|calligraphy|painting/.test(combined)) return '创意摄影设计'
  if (/AI|人工智能|machine learning|深度學習|deep learning|hackathon|黑客松|編程|编程|coding|programming|數據|data science/.test(combined)) return 'AI创作'
  if (/創業|创业|startup|pitch|路演|孵化|incubator|商業計劃|商业计划|business.*plan/.test(combined)) return '创业路演'
  if (/音樂|音乐|music|歌唱|singing|舞蹈|dance|表演|performance|drama|戲劇|戏剧|朗誦|朗诵|speech|choir|合唱/.test(combined)) return '音乐表演'
  return '其他'
}

// ============================================
// 值校验
// ============================================
function normalizeType(raw: string | undefined | null): string {
  if (!raw) return '其他'
  if (VALID_TYPES.includes(raw as any)) return raw
  return '其他'
}

function normalizeLocation(raw: string | undefined | null): string {
  if (!raw) return '不限'
  if (VALID_LOCATIONS.includes(raw as any)) return raw
  return '不限'
}

function normalizeFeeType(raw: string | undefined | null): string {
  if (!raw) return '付费'
  if (VALID_FEE_TYPES.includes(raw as any)) return raw
  return '付费'
}

function normalizeAgeGroup(raw: string | undefined | null): string {
  if (!raw) return '不限'
  if (VALID_AGE_GROUPS.includes(raw as any)) return raw
  return '不限'
}

function normalizeTeamSize(raw: string | undefined | null): string {
  if (!raw) return '不限'
  if (VALID_TEAM_SIZES.includes(raw as any)) return raw
  return '不限'
}

function normalizeEligibility(raw: string | undefined | null): string {
  if (!raw) return '不限'
  if (VALID_ELIGIBILITY.includes(raw as any)) return raw
  return '不限'
}

function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  } catch { return null }
}

// ============================================
// 状态 & 去重 & 入库
// ============================================
function determineStatus(comp: CompetitionData): string {
  const now = Date.now()
  const deadline = comp.registration_deadline ? new Date(comp.registration_deadline).getTime() : null
  const start = comp.date_start ? new Date(comp.date_start).getTime() : null

  if (deadline && deadline < now) return '已结束'
  if (start && now > start + 7 * 24 * 60 * 60 * 1000) return '已结束'
  if (start && now > start) return '进行中'
  if (start && start - now < 7 * 24 * 60 * 60 * 1000) return '即将开始'
  return '报名中'
}

async function upsertCompetition(
  comp: CompetitionData,
  sourceName: string,
  sourceUrl: string,
): Promise<'new' | 'skip' | 'error'> {
  // 去重
  const { data: existing } = await supabase
    .from('competitions')
    .select('id')
    .eq('title', comp.title)
    .maybeSingle()

  if (existing) return 'skip'

  const normalized = {
    title: comp.title.slice(0, 200),
    title_en: comp.title_en || null,
    type: normalizeType(comp.type),
    description: comp.description?.slice(0, 1000) || null,
    date_start: normalizeDate(comp.date_start) || comp.date_start,
    date_end: normalizeDate(comp.date_end),
    registration_deadline: normalizeDate(comp.registration_deadline),
    location: normalizeLocation(comp.location),
    venue: comp.venue?.slice(0, 200) || null,
    fee_type: normalizeFeeType(comp.fee_type),
    fee_amount: comp.fee_amount?.slice(0, 50) || null,
    prize: comp.prize?.slice(0, 200) || null,
    organizer: comp.organizer?.slice(0, 200) || null,
    registration_link: comp.registration_link?.slice(0, 500) || null,
    age_group: normalizeAgeGroup(comp.age_group),
    team_size: normalizeTeamSize(comp.team_size),
    eligibility: normalizeEligibility(comp.eligibility),
  }

  const status = determineStatus(comp)

  const { error } = await supabase.from('competitions').insert({
    ...normalized,
    status,
    source: sourceName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    source_url: sourceUrl,
  })

  if (error) {
    console.error(`   ❌ 插入失败: ${comp.title} — ${error.message}`)
    return 'error'
  }

  const emoji: Record<string, string> = {
    '运动': '🏃', '电竞': '🎮', '创意摄影设计': '🎨',
    'AI创作': '🤖', '创业路演': '💼', '音乐表演': '🎵', '其他': '📌'
  }
  console.log(`   ✅ ${emoji[normalized.type] || '📌'} [${normalized.type}] [${normalized.eligibility}] ${comp.title}`)
  return 'new'
}

// ============================================
// 每日限额
// ============================================
async function getTodayInsertCount(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('competitions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today)

  if (error) return 0
  return count || 0
}

// ============================================
// 来源定义 — 每个来源有独立的抓取策略
// ============================================
interface Source {
  name: string
  baseUrl: string
  /** 列表页: 从这些页面提取比赛链接 */
  listPages: string[]
  /** 默认分类 */
  category: string
}

const SOURCES: Source[] = [
  {
    name: 'CYACA',
    baseUrl: 'https://www.hkcyaca.com',
    listPages: ['https://www.hkcyaca.com/post'],
    category: '其他',
  },
  {
    name: 'HKYCAA',
    baseUrl: 'https://www.hkycaa.org',
    listPages: ['https://www.hkycaa.org/competitions'],
    category: '音乐表演',
  },
  {
    name: 'Bauhinia',
    baseUrl: 'https://bau.com.hk',
    listPages: ['https://bau.com.hk/web/category/activity'],
    category: '其他',
  },
  {
    name: 'HKFYG',
    baseUrl: 'https://ce.hkfyg.org.hk',
    listPages: ['https://ce.hkfyg.org.hk/teachers-zone/competition/'],
    category: '其他',
  },
  {
    name: 'Cyberport',
    baseUrl: 'https://www.cyberport.hk',
    listPages: ['https://www.cyberport.hk/zh_hk/events'],
    category: 'AI创作',
  },
  {
    name: 'YCMAA',
    baseUrl: 'https://www.ycmaa.com',
    listPages: ['https://www.ycmaa.com/competitions'],
    category: '音乐表演',
  },
]

// ============================================
// 主流程
// ============================================
export interface DiscoverResult {
  added: number
  skipped: number
  errors: number
  blocked: number
  limitReached: boolean
}

export async function discover(verbose = true): Promise<DiscoverResult> {
  let added = 0, skipped = 0, errors = 0, blocked = 0
  let limitReached = false

  if (verbose) {
    console.log('🔍 HK Compass — 比赛自动发现 (v2 · 零AI)')
    console.log(`📅 ${new Date().toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })}`)
    console.log(`📡 ${SOURCES.length} 个来源 · 每日上限 ${DAILY_LIMIT} 条\n`)
  }

  // 检查今日已入库
  const todayCount = await getTodayInsertCount()
  if (todayCount >= DAILY_LIMIT) {
    console.log(`⛔ 今日已达上限 (${todayCount}/${DAILY_LIMIT})，跳过扫描`)
    return { added: 0, skipped: 0, errors: 0, blocked: 0, limitReached: true }
  }
  if (verbose) console.log(`📊 今日已入库: ${todayCount}/${DAILY_LIMIT}\n`)

  let remainingSlots = DAILY_LIMIT - todayCount

  for (const source of SOURCES) {
    if (remainingSlots <= 0) { limitReached = true; break }

    if (verbose) console.log(`📥 ${source.name}`)

    // robots.txt
    const robots = await checkRobots(source.baseUrl)
    if (!robots.allowed) {
      console.log(`   🚫 robots.txt 禁止爬取`)
      blocked++
      continue
    }

    // 抓取列表页 + 提取比赛链接 + 逐个抓取详情页
    for (const listUrl of source.listPages) {
      if (remainingSlots <= 0) break

      console.log(`   📋 列表页: ${listUrl}`)
      const listHtml = await fetchHtml(listUrl)
      if (!listHtml) { errors++; continue }

      const links = extractCompetitionLinks(listHtml, source.baseUrl)
      console.log(`   🔗 发现 ${links.length} 个候选链接`)

      for (const link of links) {
        if (remainingSlots <= 0) break

        // 抓取详情页
        const detailHtml = await fetchHtml(link.url)
        if (!detailHtml) { errors++; continue }

        const comp = extractFromDetailPage(detailHtml, link.url)
        if (!comp) {
          console.log(`   ⏭ 无法提取: ${link.title.slice(0, 40)}`)
          skipped++
          continue
        }

        // 覆盖链接标题（更准确）
        if (!comp.title || comp.title.length < 5) {
          comp.title = link.title
        }

        const result = await upsertCompetition(comp, source.name, link.url)
        if (result === 'new') { added++; remainingSlots-- }
        else if (result === 'skip') skipped++
        else errors++
      }
    }

    // 来源间延迟
    const delay = Math.max((robots.crawlDelay ?? 3) * 1000, 2000)
    await new Promise(r => setTimeout(r, delay))
  }

  if (verbose) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`📊 新增 ${added} | 跳过 ${skipped} | 失败 ${errors} | 拦截 ${blocked}`)
    if (limitReached) console.log(`⛔ 已达每日上限`)
  }

  return { added, skipped, errors, blocked, limitReached }
}

// ============================================
// CLI
// ============================================
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  if (dryRun) console.log('🏜️  Dry-run 模式 — 只扫描不入库\n')

  const start = Date.now()
  const result = await discover(true)

  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count} 条`)
  console.log(`⏱ 耗时 ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

main().catch(console.error)

/**
 * HK Compass — 数据采集管线
 *
 * 用法: npx tsx scripts/pipeline.ts
 * 定时: 部署到服务器后用 cron 每天运行
 *
 * 工作原理:
 * 1. 检查已知数据源 (RSS/API/网页)
 * 2. 发现新比赛 → 提取文本信息
 * 3. 如有海报图片 → 调用 Kimi 视觉识别
 * 4. 结构化后写入 Supabase
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// ============================================
// 配置
// ============================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const KIMI_API_KEY = process.env.KIMI_API_KEY!
const KIMI_API_URL = 'https://api.moonshot.ai/v1/chat/completions'
const KIMI_MODEL = 'kimi-k2.5' // 性价比最高的视觉模型

// ============================================
// 数据源定义
// ============================================
interface DataSource {
  name: string
  type: 'rss' | 'api' | 'html'
  url: string
  category: string
}

const SOURCES: DataSource[] = [
  // 跑步赛事
  { name: 'RaceFinder', type: 'html', url: 'https://racefinder.hk', category: '运动' },
  // 电竞
  { name: 'CGA', type: 'html', url: 'https://vs.cga.gg', category: '电竞' },
  // 香港田径总会
  { name: 'HKAAA', type: 'html', url: 'https://hkaaa.com', category: '运动' },
  // 香港电竞总会
  { name: 'ESAHK', type: 'html', url: 'https://esahk.org', category: '电竞' },
  // Cyberport 创业活动
  { name: 'Cyberport', type: 'html', url: 'https://www.cyberport.hk', category: '创业路演' },
  // HKSTP 活动
  { name: 'HKSTP', type: 'html', url: 'https://www.hkstp.org', category: '创业路演' },
  // 快达票 (体育赛事)
  { name: 'HK Ticketing', type: 'html', url: 'https://www.hkticketing.com', category: '运动' },
  // 城网
  { name: 'Cityline', type: 'html', url: 'https://www.cityline.com', category: '运动' },
]

// ============================================
// Kimi 视觉识别 - 从文本/图片提取结构化比赛信息
// ============================================
async function extractCompetitionFromText(rawText: string): Promise<Partial<CompetitionData> | null> {
  const prompt = `你是一个比赛信息提取助手。从以下文本中提取比赛的关键信息，返回 JSON 格式。
如果文本不包含比赛信息，返回 null。

提取字段：
{
  "title": "比赛名称（中文优先）",
  "title_en": "英文名称（如有）",
  "type": "运动/电竞/创意摄影设计/AI创作/创业路演/音乐表演/其他",
  "description": "比赛简介（保留原意，简洁概括）",
  "date_start": "比赛开始日期 ISO格式 (YYYY-MM-DDTHH:mm:ssZ)",
  "date_end": "比赛结束日期（如有）",
  "registration_deadline": "报名截止日期（如有）",
  "location": "港岛/九龙/新界/线上",
  "venue": "具体地点名称",
  "fee_type": "免费/付费/有奖金",
  "fee_amount": "具体费用（如有，如 HK$200）",
  "prize": "奖金或奖品（如有）",
  "organizer": "主办方名称",
  "registration_link": "报名链接（如有）"
}

原文：
${rawText.slice(0, 8000)}`

  try {
    const res = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    if (!parsed || !parsed.title) return null
    return parsed
  } catch (err) {
    console.error('Kimi text extraction error:', err)
    return null
  }
}

async function extractCompetitionFromImage(imageUrl: string): Promise<Partial<CompetitionData> | null> {
  const prompt = `这张图片是一个比赛/活动的海报或宣传图。请提取所有可见的比赛信息，返回 JSON 格式。
如果图中不包含比赛信息，返回 null。

提取字段（与文本提取相同，但优先读取图中可见文字）：
{
  "title": "比赛名称（中文优先）",
  "title_en": "英文名称（如有）",
  "type": "运动/电竞/创意摄影设计/AI创作/创业路演/音乐表演/其他",
  "description": "比赛简介",
  "date_start": "比赛日期 ISO格式",
  "date_end": "结束日期（如有）",
  "registration_deadline": "报名截止日期（如有）",
  "location": "港岛/九龙/新界/线上",
  "venue": "具体地点",
  "fee_type": "免费/付费/有奖金",
  "fee_amount": "具体费用",
  "prize": "奖金/奖品",
  "organizer": "主办方",
  "registration_link": "报名链接/二维码指向的URL"
}`

  try {
    const res = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    if (!parsed || !parsed.title) return null
    return parsed
  } catch (err) {
    console.error('Kimi image extraction error:', err)
    return null
  }
}

// ============================================
// 数据去重 & 入库
// ============================================
interface CompetitionData {
  title: string
  title_en?: string
  type: string
  description?: string
  date_start: string
  date_end?: string
  registration_deadline?: string
  location: string
  venue?: string
  fee_type: string
  fee_amount?: string
  prize?: string
  organizer?: string
  registration_link?: string
  poster_url?: string
  source?: string
}

async function upsertCompetition(comp: CompetitionData): Promise<boolean> {
  // 去重：检查同名称+同日期的比赛是否已存在
  const { data: existing } = await supabase
    .from('competitions')
    .select('id')
    .eq('title', comp.title)
    .eq('date_start', comp.date_start)
    .maybeSingle()

  if (existing) {
    // 更新已有记录
    const { error } = await supabase
      .from('competitions')
      .update({
        ...comp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) console.error(`更新失败: ${comp.title}`, error)
    return !error
  }

  // 新增
  const { error } = await supabase.from('competitions').insert({
    ...comp,
    status: determineStatus(comp),
    source: comp.source || 'auto',
  })

  if (error) {
    console.error(`插入失败: ${comp.title}`, error)
    return false
  }

  console.log(`✅ 新增比赛: ${comp.title}`)
  return true
}

function determineStatus(comp: CompetitionData): string {
  const now = Date.now()
  const start = new Date(comp.date_start).getTime()
  const deadline = comp.registration_deadline
    ? new Date(comp.registration_deadline).getTime()
    : start

  if (now > start + 24 * 60 * 60 * 1000) return '已结束'
  if (now > start) return '进行中'
  if (deadline < now) return '即将开始'
  return '报名中'
}

// ============================================
// 主流程
// ============================================
async function main() {
  console.log('🚀 HK Compass 数据采集管线启动')
  console.log(`📅 ${new Date().toISOString()}`)
  console.log(`📡 数据源数量: ${SOURCES.length}`)

  let addedCount = 0
  let skippedCount = 0

  // TODO: 针对每个数据源实现具体的抓取逻辑
  // 当前为框架代码，实际抓取逻辑需根据各源站网页结构调整
  for (const source of SOURCES) {
    console.log(`\n📥 检查数据源: ${source.name} (${source.type})`)
    // 示例: 爬取网页文本 → extractCompetitionFromText → upsertCompetition
    // 实际实现需为每个源站编写选择器/解析逻辑
  }

  console.log(`\n📊 总结: 新增 ${addedCount}, 跳过 ${skippedCount}`)
  console.log('✅ 数据采集完成')
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { extractCompetitionFromText, extractCompetitionFromImage, upsertCompetition, type CompetitionData }

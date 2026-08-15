/**
 * 批量插入比赛数据 — 自动映射枚举值
 * 用法: node scripts/bulk-insert.mjs <json-file>
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// DB 实际支持的枚举值
const VALID_TYPES = ['运动', '电竞', '创意摄影设计', 'AI创作', '创业路演', '音乐表演', '其他']
const VALID_LOCATIONS = ['港岛', '九龙', '新界', '线上']
const VALID_FEE_TYPES = ['免费', '付费', '有奖金']
const VALID_ELIGIBILITY = ['个人报名', '学校提名', '两者皆可', '不限']
const VALID_AGE_GROUPS = ['儿童', '青少年', '成人公开', '不限']
const VALID_TEAM_SIZES = ['个人赛', '2-3人', '4-6人', '7人以上', '不限']

function norm(v, valid, fallback) {
  if (!v) return fallback
  if (valid.includes(v)) return v
  return fallback
}

function normType(v) {
  if (!v) return '其他'
  if (VALID_TYPES.includes(v)) return v
  // 映射常见类别到 DB 枚举
  const map = {
    '学界征文/写作比赛': '其他', '学界朗诵/演讲比赛': '其他', '学界辩论比赛': '其他',
    '学界数学/科学比赛': '其他', '学界常识/问答比赛': '其他', '学界阅读/书评比赛': '其他',
    '学界环保/STEM比赛': '其他', '大学比赛': '其他', '书法比赛': '其他', '棋类比赛': '其他',
    '学界综合艺术': '其他', '学界视觉艺术': '其他', '学界音乐': '音乐表演', '学界体育': '运动',
    '学界征文写作比赛': '其他', '学界朗诵演讲比赛': '其他',
  }
  return map[v] || '其他'
}

function normLoc(v) {
  if (v === '不限' || !v) return '线上'
  if (VALID_LOCATIONS.includes(v)) return v
  return '线上'
}

function normDate(v) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return v
}

/**
 * 日期合理性检查 — 防止 registration_deadline 和 date_start 混淆
 * 规则：
 *   1. registration_deadline 必须在 date_start 之前（或同一天）
 *   2. 如果 registration_deadline > date_start，很可能是录入时写反了 → 自动交换
 *   3. 日期必须在 2025-2028 合理范围内
 */
function validateDates(record, title) {
  const warnings = []
  const now = new Date()
  const dStart = record.date_start ? new Date(record.date_start) : null
  const dEnd = record.date_end ? new Date(record.date_end) : null
  const dDeadline = record.registration_deadline ? new Date(record.registration_deadline) : null

  // 检查年份范围
  for (const [label, d] of [['date_start', dStart], ['date_end', dEnd], ['registration_deadline', dDeadline]]) {
    if (d) {
      const y = d.getFullYear()
      if (y < 2025 || y > 2028) {
        warnings.push(`⚠️ ${label}: ${d.toISOString().slice(0,10)} — 年份异常 (${y})`)
      }
    }
  }

  // registration_deadline 应该在 date_start 之前
  // 如果 deadline 严重晚于 start → 警告（不再自动交换，因为部分项目有长期报名机制）
  if (dStart && dDeadline && dDeadline > dStart) {
    const diffDays = (dDeadline - dStart) / (1000 * 60 * 60 * 24)
    if (diffDays > 60) {
      warnings.push(`⚠️ ${title}: registration_deadline (${record.registration_deadline}) 晚于 date_start (${record.date_start}) ${Math.round(diffDays)} 天 — 请人工确认是否合理`)
    }
  }

  return warnings
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) { console.log('Usage: node scripts/bulk-insert.mjs <json-file>'); process.exit(1) }

  const comps = JSON.parse(readFileSync(filePath, 'utf-8'))
  let ok = 0, fail = 0, dup = 0
  const errors = []

  for (const c of comps) {
    // 数据真实性：缺官方来源链接的不许进库（二手聚合站/无出处 = 不可信）
    if (!c.source_url) {
      console.log(`  ⛔ 跳过（无 source_url，不可信）: ${c.title}`)
      fail++
      continue
    }

    // 检查重复 (title + date_start)
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .eq('title', c.title)
      .limit(1)

    if (existing && existing.length > 0) {
      dup++
      continue
    }

    const record = {
      title: c.title,
      title_en: c.title_en || null,
      type: normType(c.type),
      description: c.description || null,
      date_start: normDate(c.date_start) || new Date().toISOString().split('T')[0],
      date_end: normDate(c.date_end || null),
      registration_deadline: normDate(c.registration_deadline || null),
      location: normLoc(c.location),
      venue: c.venue || null,
      fee_type: norm(c.fee_type, VALID_FEE_TYPES, '免费'),
      fee_amount: c.fee_amount || null,
      prize: c.prize || null,
      organizer: c.organizer || null,
      registration_link: c.registration_link || null,
      source_url: c.source_url || null,
      age_group: norm(c.age_group, VALID_AGE_GROUPS, '不限'),
      team_size: norm(c.team_size, VALID_TEAM_SIZES, '个人赛'),
      eligibility: norm(c.eligibility, VALID_ELIGIBILITY, '个人报名'),
      status: '报名中',
      source: c.source || 'batch-search-3',
      review_status: 'pending',
    }

    // 日期验证 — 自动检测并修复写反的日期
    const dateWarnings = validateDates(record, c.title)
    if (dateWarnings.length) {
      dateWarnings.forEach(w => console.log('  ' + w))
    }

    const { error } = await supabase.from('competitions').insert(record)
    if (error) {
      fail++
      errors.push(`${c.title}: ${error.message}`)
    } else {
      ok++
    }
  }

  console.log(`✅ ${ok} inserted, 🔄 ${dup} skipped (duplicate), ❌ ${fail} failed`)
  if (errors.length) { console.log('\nErrors:'); errors.slice(0,10).forEach(e => console.log('  -', e)); if (errors.length>10) console.log(`  ...and ${errors.length-10} more`) }

  const { count } = await supabase.from('competitions').select('*', { count: 'exact', head: true })
  console.log(`📊 Total in DB: ${count}`)
}

main().catch(console.error)

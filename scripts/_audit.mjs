import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: false })
if (error) { console.error('ERR', error.message); process.exit(1) }
console.log('TOTAL', data.length, '\n')

// 1. 枚举完整性
const valid = {
  type: ['运动','电竞','创意摄影设计','AI创作','创业路演','音乐表演','其他'],
  location: ['港岛','九龙','新界','线上'],
  fee_type: ['免费','付费','有奖金'],
  eligibility: ['个人报名','学校提名','两者皆可','不限'],
  age_group: ['儿童','青少年','成人公开','成人/公开','不限'],
  team_size: ['个人赛','2-3人','4-6人','7人以上','不限'],
  status: ['报名中','即将开始','进行中','已结束'],
  review_status: ['pending','approved','rejected','needs_changes'],
}
for (const [k, v] of Object.entries(valid)) {
  const vals = {}
  for (const c of data) { const x = c[k] ?? '(null)'; vals[x] = (vals[x]||0)+1 }
  const bad = Object.keys(vals).filter(x => !v.includes(x) && x !== '(null)')
  console.log(`[${k}]`, JSON.stringify(vals))
  if (bad.length) console.log(`   ⚠️ 非法值: ${bad.join(', ')}`)
}

// 2. 日期检查
const now = new Date('2026-08-17')
const issues = []
for (const c of data) {
  const ds = c.date_start ? new Date(c.date_start) : null
  const de = c.date_end ? new Date(c.date_end) : null
  const dl = c.registration_deadline ? new Date(c.registration_deadline) : null
  // 截止晚于开始
  if (ds && dl && dl > ds && (dl - ds) / 86400000 > 30) issues.push({ id: c.id, title: c.title, issue: `报名截止(${c.registration_deadline})晚于比赛开始(${c.date_start}) ${Math.round((dl-ds)/86400000)}天` })
  // 已过期但状态仍"报名中"
  if (c.status === '报名中' && ((dl && dl < now) || (de && de < now))) issues.push({ id: c.id, title: c.title, issue: `已过期(截止${c.registration_deadline||'—'}/结束${c.date_end||'—'})但状态=报名中` })
  // 缺关键日期
  if (!c.date_end && !c.registration_deadline) issues.push({ id: c.id, title: c.title, issue: '无结束日期且无报名截止日' })
  // 年份异常
  for (const [lbl, d] of [['start',ds],['end',de],['dl',dl]]) if (d && (d.getFullYear() < 2025 || d.getFullYear() > 2028)) issues.push({ id: c.id, title: c.title, issue: `${lbl} 年份异常 ${d.getFullYear()}` })
}
console.log(`\n=== 日期问题 ${issues.length} 条 ===`)
issues.slice(0, 80).forEach(i => console.log(`  • ${i.title.slice(0,45)} | ${i.issue}`))

// 3. 香港人能否参加（大陆限制）
const MAINLAND_KW = ['大陆','内地','国内','中国公民','中国籍','全国高校','全国大学生','中國內地','中國公民','境內','境内高校','僅限中國']
const mainland = data.filter(c => {
  const t = ((c.title||'') + ' ' + (c.description||'') + ' ' + (c.eligibility||''))
  return MAINLAND_KW.some(k => t.includes(k)) && !(t.includes('香港') || t.includes('Hong Kong') || t.includes('HK'))
})
console.log(`\n=== 疑似仅限内地/大陆 ${mainland.length} 条 ===`)
mainland.forEach(c => console.log(`  • [${c.eligibility}] ${c.title.slice(0,50)} | ${(c.description||'').slice(0,50)}`))

// 4. 缺关键字段
const noUrl = data.filter(c => !c.source_url)
const noOrg = data.filter(c => !c.organizer)
const noDesc = data.filter(c => !c.description)
const noRegLink = data.filter(c => !c.registration_link)
const noTeamSize = data.filter(c => !c.team_size)
const noAge = data.filter(c => !c.age_group)
const noElig = data.filter(c => !c.eligibility)
console.log(`\n=== 缺失字段 ===`)
console.log(`  无 source_url: ${noUrl.length}`, noUrl.slice(0,10).map(c=>c.title.slice(0,30)).join(' | '))
console.log(`  无 organizer: ${noOrg.length}`, noOrg.slice(0,10).map(c=>c.title.slice(0,30)).join(' | '))
console.log(`  无 description: ${noDesc.length}`)
console.log(`  无 registration_link: ${noRegLink.length}`)
console.log(`  无 team_size: ${noTeamSize.length}`)
console.log(`  无 age_group: ${noAge.length}`)
console.log(`  无 eligibility: ${noElig.length}`)

// 5. title/description 重复或标题异常
const titles = {}
data.forEach(c => { const t = (c.title||'').trim(); titles[t] = (titles[t]||0)+1 })
const dups = Object.entries(titles).filter(([t,n]) => n>1)
console.log(`\n=== 重复标题 ${dups.length} 组 ===`)
dups.forEach(([t,n]) => console.log(`  • x${n}: ${t.slice(0,50)}`))

/**
 * 修正 5 条过期比赛的日期/状态 + 补 9 条英文名
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const FIXES = [
  { kw: 'SYSBS', status: '即将开始', date_start: '2026-09-14', date_end: '2026-11-30', registration_deadline: '2026-07-15' },
  { kw: '平等機會盃', status: '已结束', date_start: '2026-01-10', registration_deadline: '2026-01-09' },
  { kw: '數學挑戰賽', status: '已结束', date_start: '2026-06-20', registration_deadline: '2026-05-17' },
  { kw: '田宮迷你四驅車', status: '即将开始', date_start: '2026-08-29', date_end: '2026-08-30', registration_deadline: '2026-08-16' },
  { kw: '玩PO競', status: '已结束', date_start: '2026-07-21', registration_deadline: '2026-03-29' },
]

const ENS = [
  { kw: 'KACA', title_en: 'KACA Kids Arts & Culture Association Competitions' },
  { kw: '大自然小守護者', title_en: '2nd All HK 18 Districts Children Nature Guardian Art Competition' },
  { kw: '閱讀報告比賽', title_en: '1st All HK 18 Districts Children Book Report Competition' },
  { kw: '第二季網上傑出青少年歌唱', title_en: '2026 2nd Season Online Outstanding Youth Singing Competition' },
  { kw: '平等機會盃', title_en: 'Equal Opportunities Cup Inter-school Debate Competition' },
  { kw: 'COPA DE HK Junior', title_en: 'COPA DE HK Junior' },
  { kw: '學界籃球馬拉松', title_en: 'All Hong Kong Schools Basketball Marathon' },
  { kw: '學界游泳錦標賽', title_en: 'Hong Kong Inter-school Swimming Championships' },
  { kw: '學界足球精英賽', title_en: 'Hong Kong Inter-school Football Elite Competition' },
]

async function run(list, label) {
  let ok = 0
  for (const item of list) {
    const { kw, ...fields } = item
    const { data } = await supabase.from('competitions').select('id,title').like('title', `%${kw}%`).limit(1)
    if (!data || data.length === 0) { console.log(`⛔ 未找到: ${kw}`); continue }
    const c = data[0]
    const { error } = await supabase.from('competitions').update(fields).eq('id', c.id)
    if (error) { console.log(`❌ ${c.title.slice(0,30)}: ${error.message}`); continue }
    ok++
    console.log(`✅ [${label}] ${c.title.slice(0,40)} → ${JSON.stringify(fields)}`)
  }
  return ok
}

const n1 = await run(FIXES, '日期/状态')
const n2 = await run(ENS, '英文名')
console.log(`\n======= 结果 =======\n日期/状态修正 ${n1} 条 | 英文名补 ${n2} 条`)

/**
 * 修复「无日期」比赛：给有真实 date_start 的单日赛补 date_end = date_start
 * 运行（预览）: npx tsx scripts/fix-no-dates.ts
 * 运行（执行）: npx tsx scripts/fix-no-dates.ts --apply
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CRAWL_DEFAULT = '2026-08-09' // 爬虫抓取默认日期，非真实比赛日期

async function main() {
  const apply = process.argv.includes('--apply')

  const { data } = await s.from('competitions')
    .select('id, title, date_start, date_end, registration_deadline')
    .is('registration_deadline', null)
    .is('date_end', null)

  const fixable: any[] = []
  const needReview: any[] = []

  for (const c of data || []) {
    const ds = c.date_start
    if (ds && String(ds).startsWith(CRAWL_DEFAULT)) {
      needReview.push(c)
    } else if (ds) {
      fixable.push(c)
    } else {
      needReview.push(c) // date_start 也是空，彻底无日期
    }
  }

  console.log(`\n=== 可自动补 date_end（单日赛，date_start 真实）: ${fixable.length} 条 ===`)
  for (const c of fixable) {
    console.log(`  ✅ ${c.title?.slice(0, 45)} | date_start=${String(c.date_start).slice(0, 10)} → date_end 同天`)
  }

  console.log(`\n=== 需回源（date_start 是爬虫默认值或空）: ${needReview.length} 条 ===`)
  for (const c of needReview) {
    console.log(`  ⚠️ ${c.title?.slice(0, 45)} | date_start=${c.date_start ? String(c.date_start).slice(0, 10) : 'NULL'}`)
  }

  if (apply && fixable.length > 0) {
    console.log('\n正在补 date_end...')
    let done = 0
    for (const c of fixable) {
      const { error } = await s.from('competitions').update({ date_end: c.date_start }).eq('id', c.id)
      if (error) {
        console.log(`  ❌ ${c.title?.slice(0, 40)}: ${error.message}`)
      } else {
        done++
      }
    }
    console.log(`✅ 已补 ${done} 条 date_end`)
  } else if (!apply) {
    console.log('\n（预览模式，加 --apply 才会真正写入）')
  }
}

main().catch(console.error)

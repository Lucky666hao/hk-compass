/**
 * 迁移脚本：把现有「大学专区」帖子按关键词归类到对应学校
 * 用法：npx tsx scripts/migrate-campus.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { HK_UNIVERSITIES, matchUniversity } from '../src/lib/university-data'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  // 只处理 category='大学专区' 且尚未归类的帖子
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, content')
    .eq('category', '大学专区')
    .is('university_slug', null)

  if (error) throw error

  let updated = 0
  const skipped: string[] = []

  for (const post of posts ?? []) {
    let matched = false
    for (const uni of HK_UNIVERSITIES) {
      if (matchUniversity(post.title + ' ' + post.content, null, uni)) {
        const { error: upErr } = await supabase
          .from('posts')
          .update({ university_slug: uni.slug })
          .eq('id', post.id)
        if (upErr) {
          console.error(`更新失败 ${post.id}: ${upErr.message}`)
          continue
        }
        updated++
        matched = true
        break
      }
    }
    if (!matched) skipped.push(post.title.slice(0, 30))
  }

  console.log(`✅ 已归类 ${updated} 条帖子到对应学校`)
  if (skipped.length > 0) {
    console.log(`⚠️  ${skipped.length} 条未匹配到学校（保留在全港讨论）：`)
    skipped.forEach((t) => console.log(`   - ${t}`))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

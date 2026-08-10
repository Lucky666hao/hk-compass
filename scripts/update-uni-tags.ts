/**
 * 更新已有大学比赛的 target_universities
 * 运行: npx tsx scripts/update-uni-tags.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const updates: { title_pattern: string; unis: string[] }[] = [
    { title_pattern: 'HSUHK Innovation', unis: ['HSUHK'] },
    { title_pattern: '香港國際AIGC', unis: ['EdUHK', 'ChuHai'] },
    { title_pattern: 'PolyU國際未來', unis: ['PolyU'] },
    { title_pattern: '創意共享產品設計', unis: ['EdUHK'] },
    { title_pattern: '碳中和：我們的理想家園', unis: ['CUHK'] },
    { title_pattern: 'Hong Kong Joint Collegiate Programming', unis: ['CityU', 'HKUST', 'PolyU'] },
  ]

  for (const u of updates) {
    const { data: comp } = await s.from('competitions')
      .select('id,title,target_universities')
      .ilike('title', `%${u.title_pattern}%`)
      .maybeSingle()

    if (comp) {
      const current = comp.target_universities || []
      const merged = [...new Set([...current, ...u.unis])]
      const { error } = await s.from('competitions')
        .update({ target_universities: merged })
        .eq('id', comp.id)
      if (error) {
        console.log(`❌ ${comp.title?.substring(0, 50)}: ${error.message}`)
      } else {
        console.log(`✅ ${comp.title?.substring(0, 50)} → [${merged.join(',')}]`)
      }
    } else {
      console.log(`⚠️ Not found: ${u.title_pattern}`)
    }
  }

  console.log('\n✅ target_universities 更新完成')
}

main().catch(console.error)

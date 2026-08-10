import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // All uni-related: target_universities set, or organizer/title mentions university
  const { data } = await s.from('competitions')
    .select('title,type,organizer,source_url,target_universities')
    .or('target_universities.not.is.null,organizer.ilike.%university%,organizer.ilike.%大學%,organizer.ilike.%學院%,title.ilike.%case competition%,title.ilike.%hackathon%,title.ilike.%hack%,title.ilike.%moot%,title.ilike.%MUN%,title.ilike.%模擬%')
    .order('type')

  console.log('Total uni-related:', data?.length)
  if (data) {
    // Group by type
    const types: Record<string, number> = {}
    for (const c of data) types[c.type] = (types[c.type] || 0) + 1
    console.log('\nBy type:')
    for (const [k, v] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`)
    }

    // Group by uni
    const unis: Record<string, number> = {}
    for (const c of data) {
      if (c.target_universities?.length) {
        for (const u of c.target_universities) unis[u] = (unis[u] || 0) + 1
      }
    }
    console.log('\nBy university (target_universities):')
    for (const [k, v] of Object.entries(unis).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`)
    }

    // List all
    console.log('\n--- All uni-related competitions ---')
    for (const c of data) {
      console.log(`${c.type} | ${c.title?.substring(0, 80)} | ${c.organizer?.substring(0, 60) || '-'} | ${c.target_universities?.join(',') || 'none'}`)
    }
  }
}

main().catch(console.error)

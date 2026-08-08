// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data } = await supabase
    .from('competitions')
    .select('id,title,venue,venue_en,prize,prize_en,description,description_en')

  if (!data) { console.log('No data'); return }

  const needVenue = data.filter((c: any) => c.venue && !c.venue_en)
  const needPrize = data.filter((c: any) => c.prize && !c.prize_en)
  const needDesc  = data.filter((c: any) => c.description && !c.description_en)

  console.log('Total:', data.length)
  console.log('Missing venue_en:', needVenue.length)
  console.log('Missing prize_en:', needPrize.length)
  console.log('Missing description_en:', needDesc.length)

  if (needVenue.length) {
    console.log('\n--- missing venue_en ---')
    needVenue.forEach((r: any) => console.log(r.id, '|', r.title?.substring(0,50), '| venue:', r.venue?.substring(0,80)))
  }
  if (needPrize.length) {
    console.log('\n--- missing prize_en ---')
    needPrize.forEach((r: any) => console.log(r.id, '|', r.title?.substring(0,50), '| prize:', r.prize?.substring(0,80)))
  }
  if (needDesc.length) {
    console.log('\n--- missing description_en ---')
    needDesc.forEach((r: any) => console.log(r.id, '|', r.title?.substring(0,50), '| desc:', r.description?.substring(0,80)))
  }
}
main()

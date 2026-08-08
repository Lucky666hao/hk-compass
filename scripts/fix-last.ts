// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { error } = await s.from('competitions').update({
    venue_en: 'Video preliminary → Group rounds → Grand final',
    prize_en: 'Grand Champion HK$6,000; Special Prize $5,000; 1st/2nd/3rd prizes ($3,000/$2,000/$1,000); Merit awards $500'
  }).eq('id', '4a126607-7f84-4aed-94f4-fd00b98f2ba9')
  if (error) console.log('Error:', error.message)
  else console.log('Done! Updated remaining venue_en + prize_en')
}
main()

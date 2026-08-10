import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

const sql = readFileSync('supabase/migrations/20260811_add_post_comments.sql', 'utf-8')

// Try via Supabase REST API — use the SQL API endpoint
const PROJECT = 'kjqcnxrebdrnmhtwyyhw'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// https://supabase.com/docs/guides/database/api — try the REST API
const BASE = `https://${PROJECT}.supabase.co`

// Try using the REST API to check if table exists
const checkRes = await fetch(`${BASE}/rest/v1/post_comments?limit=1`, {
  headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
})

if (checkRes.ok) {
  console.log('✅ post_comments table already exists')
  process.exit(0)
}

console.log('Table does not exist yet. Migration SQL ready at:')
console.log('  supabase/migrations/20260811_add_post_comments.sql')
console.log('')
console.log('Apply via Supabase Dashboard → SQL Editor:')
console.log('  https://supabase.com/dashboard/project/kjqcnxrebdrnmhtwyyhw/sql/new')
console.log('')
console.log('SQL to run:')
console.log(sql)

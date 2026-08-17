/** 补 7 条缺 organizer（WebSearch 核实） */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ORGS = [
  { kw: '維多利亞港渡海泳', organizer: '中國香港游泳總會' },
  { kw: '香港運動節', organizer: '運動版圖 Sportsoho' },
  { kw: 'Run with Miffy', organizer: 'Joymiles' },
  { kw: '寶礦力水特跑步祭', organizer: '香港大塚製藥有限公司' },
  { kw: 'RunAround', organizer: 'Play Around HK' },
  { kw: 'Merry-Run-Round', organizer: 'noracenogoal' },
  { kw: 'KACA 比賽活動', organizer: '香港兒童藝術文化協會' },
]

let ok = 0
for (const { kw, organizer } of ORGS) {
  const { data } = await supabase.from('competitions').select('id,title').like('title', `%${kw}%`).is('organizer', null).limit(1)
  if (!data || data.length === 0) { console.log(`⛔ 未找到(或缺organizer已填): ${kw}`); continue }
  const c = data[0]
  const { error } = await supabase.from('competitions').update({ organizer }).eq('id', c.id)
  if (error) { console.log(`❌ ${c.title.slice(0,30)}: ${error.message}`); continue }
  ok++
  console.log(`✅ ${c.title.slice(0,40)} → ${organizer}`)
}
console.log(`\n补 organizer ${ok} 条`)

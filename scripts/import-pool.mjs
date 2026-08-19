/**
 * 从 URL 池批量入库（2026-08-20）
 * 数据源：scripts/_pending-insert.json（此前 batch-search 收集、URL 检查 OK、日期仍在未来、且尚未入库的比赛）
 * 字段基础（title/type/location/date_start/source_url/registration_link），来源名按域名映射为真实机构名。
 * 运行: node scripts/import-pool.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const list = JSON.parse(readFileSync(resolve('scripts/_pending-insert.json'), 'utf8'))

// 域名 → 真实机构名
const SOURCE_BY_DOMAIN = {
  'usfhk.org': '香港大專體育協會',
  'hkco.org': '香港中樂團',
  'hkstp.org': '香港科技園',
  'hksmsa.org.hk': '香港學校音樂及朗誦協會',
  'hkbilliardsports.org.hk': '香港桌球總會',
  'hkbaseball.org': '香港棒球總會',
  'archery.org.hk': '香港射箭總會',
  'cityu.edu.hk': '香港城市大學',
  'hkumusicfestival.hku.hk': '香港大學',
  'ln.edu.hk': '嶺南大學',
  'ec.hkust.edu.hk': '香港科技大學',
  'info.gov.hk': '香港政府',
  'ugc.edu.hk': '大學教育資助委員會',
  'hangseng.com': '恒生銀行',
  'ey.com': '安永',
  'accaglobal.com': 'ACCA',
  'cfasociety.org': 'CFA協會',
  'redbull.com': 'Red Bull',
  'startmeup.hk': 'StartmeupHK',
  'cuhk-greenstem.com': '香港中文大學',
  'bau.com.hk': '香港浸會大學',
  'jsma.org.hk': '香港聯校音樂協會',
  'hkyca.com.hk': '香港青少年棋藝協會',
  'hkccaa.org': '香港青少年及兒童藝術協會',
  'ycmaa.org': '香港青少年音樂及藝術協會',
  'apacca.org': '亞太卓越文化藝術協會',
  'hkkaca.org': '香港青年及青少年藝術協會',
  'hkcapc.com': '香港少兒藝術盃',
  'hkmaths.org': '香港數學奧林匹克學校',
  'asia-ace.org': '亞洲創意教育協會',
  'actplus.org.hk': '明愛青少年及社區服務',
  'hkiec.hk': '香港投資者教育中心',
  'ylth.org.hk': '元朗大會堂',
  'asiakidstalent.com': 'Asia Kids Talent',
  'competehub.dev': 'CompeteHub',
  'art-mate.net': 'Art-mate',
  'greeners-action.org': '環保促進會',
  'zijing.com.cn': '紫荊雜誌',
  'cryptobriefing.com': 'Crypto Briefing',
}

function sourceName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return SOURCE_BY_DOMAIN[host] || host
  } catch { return '网络搜索' }
}

const normDate = (s) => (s ? String(s).slice(0, 10) : null)

async function main() {
  console.log(`🔍 待入库 ${list.length} 条\n`)
  let added = 0, skipped = 0, failed = 0

  for (const it of list) {
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .eq('source_url', it.source_url)
      .maybeSingle()
    if (existing) { console.log(`⏭ 已存在: ${it.title?.slice(0, 40)}`); skipped++; continue }

    const { error } = await supabase.from('competitions').insert({
      title: it.title?.slice(0, 200) || 'Unknown',
      type: it.type || '其他',
      description: null,
      date_start: normDate(it.date_start),
      registration_deadline: null,
      location: ['港岛', '九龙', '新界', '线上'].includes(it.location) ? it.location : '线上',
      fee_type: '付费',
      organizer: sourceName(it.source_url),
      registration_link: it.registration_link || it.source_url,
      age_group: '不限',
      team_size: '不限',
      eligibility: '不限',
      status: '报名中',
      source: sourceName(it.source_url),
      source_url: it.source_url,
      review_status: 'pending',
    })

    if (error) { console.log(`  ❌ ${it.title?.slice(0, 40)}: ${error.message}`); failed++ }
    else { console.log(`  ✅ [${it.type}] ${it.title?.slice(0, 50)}`); added++ }
  }

  console.log(`\n✅ 新增 ${added} | ⏭ 跳过 ${skipped} | ❌ 失败 ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count}`)
}

main().catch(console.error)

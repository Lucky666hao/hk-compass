import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// 明确的大陆赛事源（赛事平台/主办方）— 已剔除香港机构（艺创展赛/PostToCompete/ASTKCE/CEANT/中评社 等）
const MAINLAND_SOURCE = new Set([
  '赛氪','52jingsai','52shejisai','外研社','高教社','中国数学会','数维杯','工行杯','正大杯','华为ICT','百度之星',
  'MathorCup','西湖论剑','iCAN','光电设计竞赛','金相大赛','成图大赛','地质技能','中国创新创业大赛',
  '颠覆性技术大赛','上海设计周','湖南师大','泉州师范','BIFT','Nippon Paint','米兰设计周','华夏奖','华韵奖',
  '计算机能力挑战赛','译达人杯','九斗杯','普译奖','C4-AI','中金所','高校图工委','创赛网','商业精英挑战赛',
  '教育部','NCIECC','创研杯',
])

// title 大陆特征词
const MAINLAND_TITLE = ['全国大学生','全国高校','中国','内地','大陆','国才杯','外研社','高教社杯','数维杯','正大杯',
  '工行杯','中金所杯','蓝桥杯','华为ICT','百度之星','西湖论剑','光电设计','金相','成图','地质技能','颠覆性','创新创业大赛',
  '中国国际','中国大学生','理解当代中国','全国数学','全国英语','全国物理','全国化学','全国生物','节能减排','化工设计','集成电路',
  '生命科学','语言文字','广告艺术','市场调查','金融知识','教育教学','汉语','翻译','词汇','阅读','写作','听力','口语','大学生']

// 港澳台相关（标题里出现这些 → 不是"纯大陆"，保留）
const HK_TW_MACAU = ['香港','全港','港澳','澳門','澳门','台灣','台湾','港台','學界','HKVAA','場域','场域','立邦未來之星']

async function main() {
  const { data: all } = await s.from('competitions').select('id, title, source, source_url, status').order('source')
  const mainland: any[] = []
  const kept: any[] = []   // 源命中/标题命中但其实是港澳台比赛 → 保留
  for (const c of all || []) {
    const srcHit = MAINLAND_SOURCE.has(c.source || '')
    const titleHit = MAINLAND_TITLE.some(k => (c.title || '').includes(k))
    if (!srcHit && !titleHit) continue
    const hk = HK_TW_MACAU.some(k => (c.title || '').includes(k))
    if (hk) { kept.push(c); continue }
    mainland.push(c)
  }
  console.log('总:', all?.length, '| 确认为大陆(建议删):', mainland.length, '| 港澳台误判已保留:', kept.length)
  console.log('\n=== 建议删除的大陆比赛（请确认）===')
  for (const c of mainland) {
    console.log(`${c.id} | [${c.source}] ${c.title?.slice(0, 40)}`)
  }
  console.log('\n=== 已自动保留（含港澳台关键词，非纯大陆）===')
  for (const c of kept) {
    console.log(`[${c.source}] ${c.title?.slice(0, 40)}`)
  }
}
main().catch(console.error)

/**
 * 删除大陆比赛（与 audit-mainland.ts 判定逻辑完全一致）
 * 运行（预览，不删）: npx tsx scripts/delete-mainland.ts
 * 运行（执行删除）: npx tsx scripts/delete-mainland.ts --apply
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MAINLAND_SOURCE = new Set([
  '赛氪','52jingsai','52shejisai','外研社','高教社','中国数学会','数维杯','工行杯','正大杯','华为ICT','百度之星',
  'MathorCup','西湖论剑','iCAN','光电设计竞赛','金相大赛','成图大赛','地质技能','中国创新创业大赛',
  '颠覆性技术大赛','上海设计周','湖南师大','泉州师范','BIFT','Nippon Paint','米兰设计周','华夏奖','华韵奖',
  '计算机能力挑战赛','译达人杯','九斗杯','普译奖','C4-AI','中金所','高校图工委','创赛网','商业精英挑战赛',
  '教育部','NCIECC','创研杯',
])

const MAINLAND_TITLE = ['全国大学生','全国高校','中国','内地','大陆','国才杯','外研社','高教社杯','数维杯','正大杯',
  '工行杯','中金所杯','蓝桥杯','华为ICT','百度之星','西湖论剑','光电设计','金相','成图','地质技能','颠覆性','创新创业大赛',
  '中国国际','中国大学生','理解当代中国','全国数学','全国英语','全国物理','全国化学','全国生物','节能减排','化工设计','集成电路',
  '生命科学','语言文字','广告艺术','市场调查','金融知识','教育教学','汉语','翻译','词汇','阅读','写作','听力','口语','大学生']

const HK_TW_MACAU = ['香港','全港','港澳','澳門','澳门','台灣','台湾','港台','學界','HKVAA','場域','场域','立邦未來之星']

async function main() {
  const apply = process.argv.includes('--apply')
  const { data: all } = await s.from('competitions').select('id, title, source')

  const targets: string[] = []
  for (const c of all || []) {
    const srcHit = MAINLAND_SOURCE.has(c.source || '')
    const titleHit = MAINLAND_TITLE.some(k => (c.title || '').includes(k))
    if (!srcHit && !titleHit) continue
    if (HK_TW_MACAU.some(k => (c.title || '').includes(k))) continue
    targets.push(c.id)
  }

  console.log(`待删除大陆比赛: ${targets.length} 条`)
  if (!apply) {
    console.log('（预览模式，加 --apply 才会真正删除）')
    return
  }

  if (targets.length === 0) return
  const { error } = await s.from('competitions').delete().in('id', targets)
  if (error) {
    console.error('删除失败:', error.message)
    return
  }
  console.log(`✅ 已删除 ${targets.length} 条大陆比赛`)
}

main().catch(console.error)

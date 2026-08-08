// @ts-nocheck
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const items = [
  {
    title: '第十五屆「文協盃」書法比賽 2026',
    title_en: '15th CCA Cup Calligraphy Competition 2026',
    type: '其他',
    description: '中國文化協會主辦。公開組(大專生或18歲以上香港市民)。主題為樂府詩。初賽郵寄或親臨遞交作品，10月決賽即席揮毫。一等獎HK$1,500、二等HK$1,300、三等HK$1,100、優異HK$900，均獲獎狀。',
    date_start: '2026-07-01T00:00:00+08:00',
    date_end: '2026-10-31T18:00:00+08:00',
    registration_deadline: '2026-09-18T23:59:00+08:00',
    location: '九龙',
    venue: '初賽郵寄作品 / 決賽現場即席揮毫',
    fee_type: '免费',
    prize: '一等獎HK$1,500、二等HK$1,300、三等HK$1,100、優異HK$900',
    organizer: '中國文化協會',
    registration_link: 'https://chineseca.org.hk',
    source_url: 'https://chineseca.org.hk/culture_show.php?id=411',
    source: '中國文化協會',
    status: '报名中',
  },
  {
    title: '第三屆「光彩香江」全港中文硬筆書法大賽 2026',
    title_en: '3rd Brilliant Hong Kong — Chinese Hard Pen Calligraphy Competition 2026',
    type: '其他',
    description: '光大駐港企業主辦。公開組(18歲以上)，主題為蘇軾《念奴嬌·赤壁懷古》。冠軍獎盃+證書+書券HK$1,500、亞軍書券HK$800、季軍書券HK$500、優異獎書券HK$300。郵寄或速遞遞交作品。',
    date_start: '2026-04-01T00:00:00+08:00',
    date_end: '2026-07-01T12:00:00+08:00',
    registration_deadline: '2026-06-01T12:00:00+08:00',
    location: '线上',
    venue: '郵寄或速遞遞交作品',
    fee_type: '免费',
    prize: '冠軍書券HK$1,500、亞軍HK$800、季軍HK$500',
    organizer: '光大駐港企業',
    source_url: 'https://www.stheadline.com/ad-art/3573606/',
    source: '星島頭條',
    status: '已结束',
  },
  {
    title: '全港青年中國古典詩詞朗誦比賽 2026',
    title_en: 'Hong Kong Youth Classical Chinese Poetry Recitation Competition 2026',
    type: '音乐表演',
    description: '全港青年學藝比賽大會及港島獅子會主辦。現場比賽形式，設粵語及普通話組別，公開組18-45歲可參加。誦材為指定古典詩詞篇章(如王維、孟郊、李白等)。名額有限，先到先得。於銅鑼灣孔聖堂禮仁書院舉行。',
    date_start: '2026-04-18T09:00:00+08:00',
    date_end: '2026-04-18T17:00:00+08:00',
    registration_deadline: '2026-03-20T18:30:00+08:00',
    location: '港岛',
    venue: '孔聖堂禮仁書院 (銅鑼灣)',
    fee_type: '免费',
    organizer: '全港青年學藝比賽大會 × 港島獅子會',
    registration_link: 'https://www.hkycac.org/news?aid=837',
    source_url: 'https://www.hkycac.org/news?aid=837',
    source: '全港青年學藝比賽大會',
    status: '已结束',
  },
]

async function main() {
  for (const item of items) {
    const { error } = await supabase.from('competitions').insert({ ...item, view_count: 0 })
    console.log(error ? `❌ ${item.title}: ${error.message}` : `✅ ${item.title}`)
  }
  const { count } = await supabase.from('competitions').select('*', { count: 'exact', head: true })
  console.log(`\n总计: ${count}`)
}

main()

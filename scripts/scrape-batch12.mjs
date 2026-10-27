/**
 * 新比赛批量入库（2026-10 批次12）—— 音乐/舞蹈/书画/全能/学术（2026年11月-2027年1月截止，仍可报名）
 * 数据来源：WebSearch 发现 → curl+cheerio 逐条核实页面（全部 source_url 返回 200、页面含比赛详情、截止日从原文提取）。
 * 主办方均为香港本地文艺/教育协会官方站点，不接受大陆征稿平台。
 * 字段严格对齐 competitions 表枚举；review_status 一律 pending，由人工在会话中甄别。
 * 运行: node scripts/scrape-batch12.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const normDate = (s) => (s ? String(s).slice(0, 10) : null)

const COMPETITIONS = [
  {
    url: 'https://www.hkocaca.com/post/cartoon11',
    title: '第十一屆香港拔萃兒童卡通人物填色/繪畫/手工勞作比賽',
    title_en: '11th HK Elite Children Cartoon Colouring/Drawing/Craft Competition 2026',
    type: '创意摄影设计',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，以卡通人物／超級英雄／公主等為主題，填色、繪畫或手工勞作，WhatsApp 提交作品，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/cartoon11',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/oceananimals5',
    title: '第五屆香港拔萃兒童海洋生物填色/繪畫/手工勞作比賽',
    title_en: '5th HK Elite Children Ocean Animals Colouring/Drawing/Craft Competition 2026',
    type: '创意摄影设计',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，以鯨魚／海豚／水母／鯊魚／海龜／珊瑚／魚類等海洋生物為主題，填色、繪畫或手工勞作，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/oceananimals5',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/wildanimal5',
    title: '第五屆香港拔萃兒童野生動物填色/繪畫/手工勞作比賽',
    title_en: '5th HK Elite Children Wild Animals Colouring/Drawing/Craft Competition 2026',
    type: '创意摄影设计',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，以熊貓／大象／長頸鹿／獅子等野生動物為主題，填色、繪畫或手工勞作，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/wildanimal5',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/xmas2026',
    title: '香港拔萃兒童聖誕節填色/繪畫/手工勞作比賽2026',
    title_en: 'HK Elite Children Christmas Colouring/Drawing/Craft Competition 2026',
    type: '创意摄影设计',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，以聖誕節為主題，填色、繪畫或手工勞作，WhatsApp 提交作品，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/xmas2026',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/phonics5',
    title: '香港拔萃兒童 Phonics／認字比賽',
    title_en: 'Phonics / Word Recognition Competition',
    type: '其他',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，Phonics／認字比賽（面試必備），設幼稚園至中學組別，免費參賽。截止報名及提交12月3日、12月8日公佈結果。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/phonics5',
    age_group: '青少年',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/penmenship16',
    title: '第十六屆香港拔萃兒童中英文書法比賽',
    title_en: '16th HK Elite Children Chinese & English Calligraphy Competition',
    type: '其他',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，中英文書法比賽，WhatsApp 提交作品，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/penmenship16',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/singing16',
    title: '第十六屆香港拔萃兒童歌唱比賽2026',
    title_en: '16th HK Elite Children Singing Competition 2026',
    type: '音乐表演',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，個人／團體歌唱比賽，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/singing16',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/dance16',
    title: '第十六屆香港拔萃兒童跳舞比賽2026',
    title_en: '16th HK Elite Children Dance Competition 2026',
    type: '其他',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，個人／團體跳舞比賽，免費參賽。截止報名及提交12月3日、12月8日公佈結果，設幼稚園至中學及公開組。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/dance16',
    age_group: '不限',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkocaca.com/post/beststudent14',
    title: '香港拔萃兒童出類拔萃學生大賽',
    title_en: 'HK Elite Children Outstanding Student Competition',
    type: '其他',
    description: '香港拔萃兒童文化藝術協會（HKOCACA）主辦，以個人經歷評選（為升學履歷加分），初賽階段只需填寫個人經歷，設幼稚園K1至中學組別，全免報名。截止報名及提交12月3日、12月8日公佈結果。',
    deadline: '2026-12-03',
    fee_type: '免费',
    organizer: '香港拔萃兒童文化藝術協會（HKOCACA）',
    registration_link: 'https://www.hkocaca.com/post/beststudent14',
    age_group: '青少年',
    source: '香港拔萃兒童文化藝術協會',
  },
  {
    url: 'https://www.hkcyaa.com/post/5thpiano2026',
    title: '第五屆全港學界鋼琴錦標賽2026',
    title_en: '5th Hong Kong Schools Piano Championship 2026',
    type: '音乐表演',
    description: '香港青年兒童文藝協會（HKCYAA）主辦，設自選曲目組及級數組（體驗組至公開組16歲或以上），實體賽於SKY MUSIC STUDIO舉行（12月20日），現場提供Steinway三角鋼琴。實體賽截止報名12月10日、線上賽截止12月31日，12月30日網頁正式公佈。報名費HK$500–680。',
    deadline: '2026-12-10',
    fee_type: '付费',
    organizer: '香港青年兒童文藝協會（HKCYAA）',
    registration_link: 'https://www.hkcyaa.com/post/5thpiano2026',
    age_group: '不限',
    source: '香港青年兒童文藝協會',
  },
  {
    url: 'https://www.hkcyaa.com/post/hktcwritedancepoe2026',
    title: '全港青少年及兒童文、舞、藝全能大賽2026（第二季）',
    title_en: 'HK Youth & Children Writing, Dance & Arts All-round Competition 2026 (Season 2)',
    type: '其他',
    description: '香港青年兒童文藝協會（HKCYAA）主辦，涵蓋寫作、舞蹈及藝術等範疇，設幼兒組至公開組（18歲或以上），語言粵語／英語／普通話。第二季截止12月1日、2027年1月5日公佈。單項報名費港幣$280、團體$400。',
    deadline: '2026-12-01',
    fee_type: '付费',
    organizer: '香港青年兒童文藝協會（HKCYAA）',
    registration_link: 'https://www.hkcyaa.com/post/hktcwritedancepoe2026',
    age_group: '不限',
    source: '香港青年兒童文藝協會',
  },
  {
    url: 'https://www.hkcyaa.com/post/calligraphy2027',
    title: '第七屆全港書法大賽2027',
    title_en: '7th Hong Kong Calligraphy Competition 2027',
    type: '其他',
    description: '香港青年兒童文藝協會（HKCYAA）主辦，設中文硬筆、英文硬筆及毛筆組（體驗組至公開組），按2026-2027學年就讀年級分組，免費參加。截止報名及遞交作品2027年1月11日、2月5日公佈，獎項由得獎者自費訂購。',
    deadline: '2027-01-11',
    fee_type: '免费',
    organizer: '香港青年兒童文藝協會（HKCYAA）',
    registration_link: 'https://www.hkcyaa.com/post/calligraphy2027',
    age_group: '不限',
    source: '香港青年兒童文藝協會',
  },
  {
    url: 'https://www.hkpaoa.com/post/%E7%AC%AC%E5%8D%81%E4%B8%89%E5%B1%86%E9%9D%92%E5%B9%B4%E5%85%92%E7%AB%A5%E5%9C%98%E9%AB%94%E5%90%88%E5%A5%8F%E5%A4%A7%E8%B3%BD-%E9%A6%99%E6%B8%AF%E5%90%88%E5%A5%8F%E5%9C%98%E6%AF%94%E8%B3%BD-%E9%A6%99%E6%B8%AF%E7%AE%A1%E5%BC%A6%E6%A8%82%E5%9C%98%E6%AF%94%E8%B3%BD-hkpaoa-%E5%85%8D%E8%B2%BB%E5%A0%B1%E5%90%8D',
    title: '第十三屆青年兒童團體合奏大賽',
    title_en: '13th Youth & Children Ensemble Competition',
    type: '音乐表演',
    description: '香港鋼琴及管弦樂協會（HKPAOA）主辦，團體合奏比賽，設樂器級別組（Grade 1–8）及學年度級別組（幼稚園至中學／公開），免費報名。2026年11月30日或之前以影片提交，設冠亞季軍及卓越音樂指導獎。',
    deadline: '2026-11-30',
    fee_type: '免费',
    organizer: '香港鋼琴及管弦樂協會（HKPAOA）',
    registration_link: 'https://www.hkpaoa.com/post/%E7%AC%AC%E5%8D%81%E4%B8%89%E5%B1%86%E9%9D%92%E5%B9%B4%E5%85%92%E7%AB%A5%E5%9C%98%E9%AB%94%E5%90%88%E5%A5%8F%E5%A4%A7%E8%B3%BD-%E9%A6%99%E6%B8%AF%E5%90%88%E5%A5%8F%E5%9C%98%E6%AF%94%E8%B3%BD-%E9%A6%99%E6%B8%AF%E7%AE%A1%E5%BC%A6%E6%A8%82%E5%9C%98%E6%AF%94%E8%B3%BD-hkpaoa-%E5%85%8D%E8%B2%BB%E5%A0%B1%E5%90%8D',
    age_group: '不限',
    source: '香港鋼琴及管弦樂協會',
  },
  {
    url: 'https://www.apmaas.org/post/%E7%AC%AC%E5%85%AB%E5%B1%86%E4%BA%9E%E5%A4%AA%E5%8D%80%E9%9F%B3%E6%A8%82%E6%BC%94%E5%A5%8F%E5%A4%A7%E8%B3%BD',
    title: '第八屆亞太區音樂演奏大賽',
    title_en: '8th Asia-Pacific Music Performance Competition',
    type: '音乐表演',
    description: '亞太區音樂藝術協會（APMAAS）主辦，鋼琴／小提琴／大提琴／管樂／弦樂／敲擊樂／中樂演奏，拍攝演奏影片參賽（可使用ABRSM或校際音樂節曲目），免費參加。截止及遞交12月14日、12月17日公佈，設PN至中學及公開組（歡迎亞洲地區人士）。',
    deadline: '2026-12-14',
    fee_type: '免费',
    organizer: '亞太區音樂藝術協會（APMAAS）',
    registration_link: 'https://www.apmaas.org/post/%E7%AC%AC%E5%85%AB%E5%B1%86%E4%BA%9E%E5%A4%AA%E5%8D%80%E9%9F%B3%E6%A8%82%E6%BC%94%E5%A5%8F%E5%A4%A7%E8%B3%BD',
    age_group: '不限',
    source: '亞太區音樂藝術協會',
  },
  {
    url: 'https://www.apmaas.org/post/%E7%AC%AC%E5%85%AB%E5%B1%86%E4%BA%9E%E5%A4%AA%E5%8D%80%E8%97%9D%E8%A1%93%E5%89%B5%E4%BD%9C%E7%B9%AA%E7%95%AB%E5%A4%A7%E8%B3%BD',
    title: '第八屆亞太區藝術創作繪畫大賽',
    title_en: '8th Asia-Pacific Art Creation & Drawing Competition',
    type: '创意摄影设计',
    description: '亞太區音樂藝術協會（APMAAS）主辦，設繪畫組／電繪組／手工勞作組，主題自由創作、喵喵汪汪寵物或卡通，WhatsApp 提交作品，免費參加。截止及遞交12月14日、12月17日公佈，設PN至中學及公開組（歡迎亞洲地區人士）。',
    deadline: '2026-12-14',
    fee_type: '免费',
    organizer: '亞太區音樂藝術協會（APMAAS）',
    registration_link: 'https://www.apmaas.org/post/%E7%AC%AC%E5%85%AB%E5%B1%86%E4%BA%9E%E5%A4%AA%E5%8D%80%E8%97%9D%E8%A1%93%E5%89%B5%E4%BD%9C%E7%B9%AA%E7%95%AB%E5%A4%A7%E8%B3%BD',
    age_group: '不限',
    source: '亞太區音樂藝術協會',
  },
  {
    url: 'https://www.hkkaca.org/post/%E7%AC%AC%E4%B8%89%E5%B1%86%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80%E6%AD%8C%E5%94%B1%E6%AF%94%E8%B3%BD',
    title: '第三屆全港十八區歌唱比賽2026',
    title_en: '3rd 18 Districts Singing Competition 2026',
    type: '音乐表演',
    description: 'KACA兒童藝術文化協會主辦，全港十八區歌唱比賽，設十八區分組及公開組，免費參賽。截止報名及交作品11月13日、11月19日公佈結果。',
    deadline: '2026-11-13',
    fee_type: '免费',
    organizer: 'KACA兒童藝術文化協會',
    registration_link: 'https://www.hkkaca.org/post/%E7%AC%AC%E4%B8%89%E5%B1%86%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80%E6%AD%8C%E5%94%B1%E6%AF%94%E8%B3%BD',
    age_group: '不限',
    source: 'KACA兒童藝術文化協會',
  },
]

async function main() {
  console.log(`🔍 待入库 ${COMPETITIONS.length} 条已核实比赛\n`)
  let added = 0, skipped = 0, failed = 0

  for (const c of COMPETITIONS) {
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .eq('source_url', c.url)
      .maybeSingle()
    if (existing) { console.log(`⏭ 已存在: ${c.title.slice(0, 40)}`); skipped++; continue }

    const dateStart = normDate(c.deadline)

    const { error } = await supabase.from('competitions').insert({
      title: c.title.slice(0, 200),
      title_en: c.title_en?.slice(0, 200) || null,
      type: c.type,
      description: c.description?.slice(0, 1000) || null,
      date_start: dateStart,
      date_end: null,
      registration_deadline: normDate(c.deadline),
      location: '线上',
      venue: null,
      fee_type: c.fee_type || '免费',
      fee_amount: null,
      prize: c.prize?.slice(0, 200) || null,
      organizer: c.organizer?.slice(0, 200) || null,
      registration_link: (c.registration_link || c.url).slice(0, 500),
      age_group: c.age_group || '不限',
      team_size: '个人赛',
      eligibility: '个人报名',
      status: '报名中',
      source: c.source,
      source_url: c.url,
      target_universities: null,
      review_status: 'pending',
    })

    if (error) { console.log(`  ❌ ${c.title.slice(0, 40)}: ${error.message}`); failed++ }
    else { console.log(`  ✅ [${c.type}] ${c.title.slice(0, 50)}`); added++ }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ 新增 ${added} | ⏭ 跳过 ${skipped} | ❌ 失败 ${failed}`)
  const { count } = await supabase.from('competitions').select('id', { count: 'exact', head: true })
  console.log(`📦 数据库总计: ${count}`)
}

main().catch(console.error)

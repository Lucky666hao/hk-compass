/**
 * 新比赛批量入库（2026-10 批次11）—— 写作/绘画/摄影/歌唱（2026年11-12月截止，仍可报名）
 * 数据来源：WebSearch + curl 逐条核实页面（全部 source_url 返回 200、页面含比赛详情、截止日从原文提取）。
 * 主办方均为香港本地文艺/艺术协会，不接受大陆征稿平台。
 * 字段严格对齐 competitions 表枚举；review_status 一律 pending，由人工在会话中甄别。
 * 运行: node scripts/scrape-batch11.mjs
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
    url: 'https://www.hkycta.com/post/%E7%AC%AC%E4%B8%83%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E5%BE%B5%E6%96%87%E5%A4%A7%E8%B3%BD-%E5%BE%B5%E6%96%87%E6%AF%94%E8%B3%BD',
    title: '第七屆香港青少年及兒童徵文大賽',
    title_en: '7th Hong Kong Youth & Children Essay Writing Competition',
    type: '其他',
    description: '香港青少年及兒童才藝表演協會（HKYCTA）主辦，設幼稚園／小學／中學／公開組（公開組600字以上），中英文皆可，免費報名。報名截止12月4日、遞交截止12月6日、12月11日公佈結果，優秀作品可申請於饒宗頤文化館及網上3D展覽館展出。',
    deadline: '2026-12-04',
    fee_type: '免费',
    organizer: '香港青少年及兒童才藝表演協會（HKYCTA）',
    registration_link: 'https://www.hkycta.com/post/%E7%AC%AC%E4%B8%83%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E5%BE%B5%E6%96%87%E5%A4%A7%E8%B3%BD-%E5%BE%B5%E6%96%87%E6%AF%94%E8%B3%BD',
    age_group: '不限',
    source: '香港青少年及兒童才藝表演協會',
  },
  {
    url: 'https://www.gbaaca.com/post/%E7%AC%AC%E4%B8%83%E5%B1%86%E7%B2%B5%E6%B8%AF%E6%BE%B3%E5%A4%A7%E7%81%A3%E5%8D%80%E5%BE%B5%E6%96%87%E6%AF%94%E8%B3%BD',
    title: '第七屆粵港澳大灣區徵文比賽',
    title_en: '7th Greater Bay Area Essay Writing Competition',
    type: '其他',
    description: '粵港澳大灣區文藝協會（GBAACA）主辦，設幼稚園至中學及公開組（公開組500字以上），繁體／簡體均可，免費報名。截止報名及遞交11月26日、12月3日公佈結果。',
    deadline: '2026-11-26',
    fee_type: '免费',
    organizer: '粵港澳大灣區文藝協會（GBAACA）',
    registration_link: 'https://www.gbaaca.com/post/%E7%AC%AC%E4%B8%83%E5%B1%86%E7%B2%B5%E6%B8%AF%E6%BE%B3%E5%A4%A7%E7%81%A3%E5%8D%80%E5%BE%B5%E6%96%87%E6%AF%94%E8%B3%BD',
    age_group: '不限',
    source: '粵港澳大灣區文藝協會',
  },
  {
    url: 'https://www.apmaas.org/post/%e7%ac%ac%e5%85%ab%e5%b1%86%e4%ba%9e%e5%a4%aa%e5%8d%80%e5%be%b5%e6%96%87%e5%89%b5%e4%bd%9c%e5%a4%a7%e8%b3%bd',
    title: '第八屆亞太區徵文創作大賽',
    title_en: '8th Asia-Pacific Creative Writing Competition',
    type: '其他',
    description: '亞太區音樂藝術協會（APMAAS）主辦，設小學／中學／公開組（公開組500字以上），主題不限或「科技發展」，免費參加。截止及遞交12月14日、12月17日公佈結果。',
    deadline: '2026-12-14',
    fee_type: '免费',
    organizer: '亞太區音樂藝術協會（APMAAS）',
    registration_link: 'https://www.apmaas.org/post/%e7%ac%ac%e5%85%ab%e5%b1%86%e4%ba%9e%e5%a4%aa%e5%8d%80%e5%be%b5%e6%96%87%e5%89%b5%e4%bd%9c%e5%a4%a7%e8%b3%bd',
    age_group: '不限',
    source: '亞太區音樂藝術協會',
  },
  {
    url: 'https://www.hkcyaa.com/post/3rdwriter2026',
    title: '第三屆粵港澳傑出作家大賽2026',
    title_en: '3rd Guangdong-Hong Kong-Macao Outstanding Writer Competition 2026',
    type: '其他',
    description: '香港青年兒童文藝協會（HKCYAA）主辦，設幼稚園至公開組（公開組18歲或以上，中文800-1500字／英文500-1000字）。每份作品報名費港幣$280。截止報名及提交12月14日，2027年1月15日公佈賽果。',
    deadline: '2026-12-14',
    fee_type: '付费',
    prize: null,
    organizer: '香港青年兒童文藝協會（HKCYAA）',
    registration_link: 'https://www.hkcyaa.com/post/3rdwriter2026',
    age_group: '不限',
    source: '香港青年兒童文藝協會',
  },
  {
    url: 'https://www.hkycta.com/post/%E7%AC%AC%E5%8D%81%E4%B8%89%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E7%B9%AA%E7%95%AB%E5%A4%A7%E8%B3%BD-%E8%87%AA%E9%81%B8%E4%B8%BB%E9%A1%8C%E7%B9%AA%E7%95%AB%E6%AF%94%E8%B3%BD',
    title: '第十三屆香港青少年及兒童繪畫大賽（自選主題）',
    title_en: '13th Hong Kong Youth & Children Drawing Competition (Free Theme)',
    type: '创意摄影设计',
    description: '香港青少年及兒童才藝表演協會（HKYCTA）主辦，自選主題，不限媒介（不接受電腦繪圖），免費報名。報名截止12月4日、遞交截止12月6日、12月11日公佈結果，優秀作品於饒宗頤文化館及網上3D展覽館展出。',
    deadline: '2026-12-04',
    fee_type: '免费',
    organizer: '香港青少年及兒童才藝表演協會（HKYCTA）',
    registration_link: 'https://www.hkycta.com/post/%E7%AC%AC%E5%8D%81%E4%B8%89%E5%B1%86%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E7%B9%AA%E7%95%AB%E5%A4%A7%E8%B3%BD-%E8%87%AA%E9%81%B8%E4%B8%BB%E9%A1%8C%E7%B9%AA%E7%95%AB%E6%AF%94%E8%B3%BD',
    age_group: '不限',
    source: '香港青少年及兒童才藝表演協會',
  },
  {
    url: 'https://www.hkycta.com/post/%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E8%81%96%E8%AA%95%E7%AF%80%E7%B9%AA%E7%95%AB%E5%A4%A7%E8%B3%BD-%E7%B9%AA%E7%95%AB%E6%AF%94%E8%B3%BD-%E7%B9%AA%E5%87%BA%E7%AF%80%E6%97%A5%E7%9A%84%E5%9C%93%E6%BB%BF',
    title: '香港青少年及兒童聖誕節繪畫大賽',
    title_en: 'Hong Kong Youth & Children Christmas Drawing Competition',
    type: '创意摄影设计',
    description: '香港青少年及兒童才藝表演協會（HKYCTA）主辦，以聖誕節為主題繪畫，免費報名。報名截止12月4日、遞交截止12月6日、12月11日公佈結果。',
    deadline: '2026-12-04',
    fee_type: '免费',
    organizer: '香港青少年及兒童才藝表演協會（HKYCTA）',
    registration_link: 'https://www.hkycta.com/post/%E9%A6%99%E6%B8%AF%E9%9D%92%E5%B0%91%E5%B9%B4%E5%8F%8A%E5%85%92%E7%AB%A5%E8%81%96%E8%AA%95%E7%AF%80%E7%B9%AA%E7%95%AB%E5%A4%A7%E8%B3%BD-%E7%B9%AA%E7%95%AB%E6%AF%94%E8%B3%BD-%E7%B9%AA%E5%87%BA%E7%AF%80%E6%97%A5%E7%9A%84%E5%9C%93%E6%BB%BF',
    age_group: '不限',
    source: '香港青少年及兒童才藝表演協會',
  },
  {
    url: 'https://www.hkaoac.com/post/%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80-%E8%A6%96%E8%97%9D%E6%AF%94%E8%B3%BD-%E7%AC%AC%E5%8D%81%E5%B1%86',
    title: '全港十八區視藝比賽（第十屆）',
    title_en: '10th 18 Districts Visual Arts Competition',
    type: '创意摄影设计',
    description: '香港文藝協會主辦，填色／繪畫／勞作，設各年齡組別及公開組（以香港十八區分組），免費參賽。截止及遞交12月2日、12月9日公佈結果。',
    deadline: '2026-12-02',
    fee_type: '免费',
    organizer: '香港文藝協會',
    registration_link: 'https://www.hkaoac.com/post/%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80-%E8%A6%96%E8%97%9D%E6%AF%94%E8%B3%BD-%E7%AC%AC%E5%8D%81%E5%B1%86',
    age_group: '不限',
    source: '香港文藝協會',
  },
  {
    url: 'https://www.asiakidstalent.com/event/%E5%85%92%E7%AB%A5%E5%8F%8A%E9%9D%92%E5%B0%91%E5%B9%B4%E9%99%B8%E7%94%9F%E5%8B%95%E7%89%A9%E7%B9%AA%E7%95%AB%E6%AF%94%E8%B3%BD-%E7%AC%AC25%E5%B1%86',
    title: '兒童及青少年陸生動物繪畫比賽（第25屆）',
    title_en: '25th Youth Land Animal Drawing Competition',
    type: '创意摄影设计',
    description: 'Asia Kids Talent 主辦，以陸生動物為主題繪畫／手工勞作，設公開組（歡迎亞洲地區人士），免費參加（慶祝Facebook 3萬讚好）。截止及遞交12月8日、12月15日公佈結果。',
    deadline: '2026-12-08',
    fee_type: '免费',
    organizer: 'Asia Kids Talent',
    registration_link: 'https://www.asiakidstalent.com/event/%E5%85%92%E7%AB%A5%E5%8F%8A%E9%9D%92%E5%B0%91%E5%B9%B4%E9%99%B8%E7%94%9F%E5%8B%95%E7%89%A9%E7%B9%AA%E7%95%AB%E6%AF%94%E8%B3%BD-%E7%AC%AC25%E5%B1%86',
    age_group: '不限',
    source: 'Asia Kids Talent',
  },
  {
    url: 'https://zh-cn.gasca.org/blogs/news/oup-under-the-sea-art-competition-guide-2026',
    title: 'GASCA 海底世界填色及繪畫比賽',
    title_en: 'GASCA Under the Sea Colouring & Drawing Competition',
    type: '创意摄影设计',
    description: 'GASCA 主辦、牛津大學出版社獎品贊助，主題「海底世界」，設青年及公開組。報名費早鳥港幣$480（至10月30日）／正價$580。上載作品截止12月12日、12月21日公佈得獎，冠亞季軍可獲牛津《Oxford Reading Tree - Green Sparks》故事書。',
    deadline: '2026-12-12',
    fee_type: '付费',
    prize: '冠亞季軍獲牛津大學出版社故事書一套',
    organizer: 'GASCA（牛津大學出版社獎品贊助）',
    registration_link: 'https://zh-cn.gasca.org/blogs/news/oup-under-the-sea-art-competition-guide-2026',
    age_group: '不限',
    source: 'GASCA',
  },
  {
    url: 'https://www.hkaoac.com/post/%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80-%E4%B8%AD%E5%B9%B4%E5%A5%BD%E6%AD%8C%E8%81%B2-2026',
    title: '全港十八區中年好歌聲歌唱比賽2026',
    title_en: '18 Districts Middle-Aged Singing Competition 2026',
    type: '音乐表演',
    description: '香港文藝協會主辦，35歲或以上成人公開組（另設十八區地區組別），獨唱／合唱，影片參賽，免費參加。截止及遞交12月2日、12月9日公佈結果，得獎者獲邀出席2027年度現場總決賽。',
    deadline: '2026-12-02',
    fee_type: '免费',
    organizer: '香港文藝協會',
    registration_link: 'https://www.hkaoac.com/post/%E5%85%A8%E6%B8%AF%E5%8D%81%E5%85%AB%E5%8D%80-%E4%B8%AD%E5%B9%B4%E5%A5%BD%E6%AD%8C%E8%81%B2-2026',
    age_group: '成人公开',
    source: '香港文藝協會',
  },
  {
    url: 'https://www.hkycta.com/post/%E7%AC%AC%E5%8D%81%E5%B1%86%E9%A6%99%E6%B8%AF%E6%94%9D%E5%BD%B1%E5%A4%A7%E8%B3%BD-%E6%94%9D%E5%BD%B1%E6%AF%94%E8%B3%BD',
    title: '第十屆香港攝影大賽',
    title_en: '10th Hong Kong Photography Competition',
    type: '创意摄影设计',
    description: '香港青少年及兒童才藝表演協會（HKYCTA）主辦，設小學／中學／公開組，免費報名。報名截止12月4日、遞交截止12月6日、12月11日公佈結果。',
    deadline: '2026-12-04',
    fee_type: '免费',
    organizer: '香港青少年及兒童才藝表演協會（HKYCTA）',
    registration_link: 'https://www.hkycta.com/post/%E7%AC%AC%E5%8D%81%E5%B1%86%E9%A6%99%E6%B8%AF%E6%94%9D%E5%BD%B1%E5%A4%A7%E8%B3%BD-%E6%94%9D%E5%BD%B1%E6%AF%94%E8%B3%BD',
    age_group: '不限',
    source: '香港青少年及兒童才藝表演協會',
  },
  {
    url: 'https://www.apmaas.org/post/%e7%ac%ac%e5%85%ab%e5%b1%86%e4%ba%9e%e5%a4%aa%e5%8d%80%e6%94%9d%e5%bd%b1%e5%89%b5%e6%84%8f%e5%a4%a7%e8%b3%bd',
    title: '第八屆亞太區攝影創意大賽',
    title_en: '8th Asia-Pacific Creative Photography Competition',
    type: '创意摄影设计',
    description: '亞太區音樂藝術協會（APMAAS）主辦，設小學／中學／公開組（歡迎亞洲地區人士），免費參加。截止及遞交12月14日、12月17日公佈結果。',
    deadline: '2026-12-14',
    fee_type: '免费',
    organizer: '亞太區音樂藝術協會（APMAAS）',
    registration_link: 'https://www.apmaas.org/post/%e7%ac%ac%e5%85%ab%e5%b1%86%e4%ba%9e%e5%a4%aa%e5%8d%80%e6%94%9d%e5%bd%b1%e5%89%b5%e6%84%8f%e5%a4%a7%e8%b3%bd',
    age_group: '不限',
    source: '亞太區音樂藝術協會',
  },
  {
    url: 'https://www.gbaaca.com/post/%E7%AC%AC%E4%B8%83%E5%B1%86%E7%B2%B5%E6%B8%AF%E6%BE%B3%E5%A4%A7%E7%81%A3%E5%8D%80%E6%94%9D%E5%BD%B1%E5%B8%AB%E5%A4%A7%E8%B3%BD',
    title: '第七屆粵港澳大灣區攝影師大賽',
    title_en: '7th Greater Bay Area Photographer Competition',
    type: '创意摄影设计',
    description: '粵港澳大灣區文藝協會（GBAACA）主辦，設各年齡組別及公開組，免費報名。截止報名及遞交11月26日、12月3日公佈結果。',
    deadline: '2026-11-26',
    fee_type: '免费',
    organizer: '粵港澳大灣區文藝協會（GBAACA）',
    registration_link: 'https://www.gbaaca.com/post/%E7%AC%AC%E4%B8%83%E5%B1%86%E7%B2%B5%E6%B8%AF%E6%BE%B3%E5%A4%A7%E7%81%A3%E5%8D%80%E6%94%9D%E5%BD%B1%E5%B8%AB%E5%A4%A7%E8%B3%BD',
    age_group: '不限',
    source: '粵港澳大灣區文藝協會',
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

/**
 * 回源补全 v2 — 针对 12 条失效链接 + 12 条缺简介的比赛，用 WebSearch 核实的官方信息硬编码补全
 * 只补空字段 + 换失效 source_url + 修正 Post to Compete 错误标题
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// url = 定位键(原 source_url)；其余字段：source_url 覆盖、title 覆盖，description/venue/prize/fee_amount 仅当前为空时补
const UPDATES = [
  // ===== 12 条失效链接 =====
  { url: 'https://smoothcomp.com/zh/event/33235', source_url: 'https://smoothcomp.com/en/event/33235',
    description: 'COPA DE HK 香港國際格鬥錦標賽，設 GI（道服）及 NOGI（無道服）公開賽，於伊利沙伯體育館舉行。',
    venue: '伊利沙伯體育館 Queen Elizabeth Stadium', fee_amount: 'HK$480–880' },
  { url: 'https://www.eoc.org.hk/eodebate2025-26/application.html', source_url: 'https://www.eoc.org.hk/eodebate2025-26/about.html',
    description: '平等機會委員會主辦的校際辯論比賽，推廣平等機會及四條反歧視條例。每校一隊（4–10人），上限48隊，以廣東話單淘汰制進行。' },
  { url: 'https://smoothcomp.com/jp/event/33352', source_url: 'https://smoothcomp.com/en/event/33352',
    description: 'COPA DE HK Junior 青少年及兒童格鬥錦標賽，於伊利沙伯體育館舉行。',
    venue: '伊利沙伯體育館' },
  { url: 'https://makerinchina.hk/', source_url: 'https://www.info.gov.hk/gia/general/202607/09/P2026070800627.htm',
    description: '第八屆「創客中國」國際中小企業創新創業大賽香港分站賽，由數碼港承辦，聚焦金融科技、人工智能、低空經濟等十大前沿科技，三甲代表香港出戰全球總決賽。',
    prize: '三甲代表香港出戰全球總決賽，並獲 HKTech300 種子基金面試機會' },
  { url: 'https://www.archery.org.hk/content/2026-2027%E5%B9%B4%E5%BA%A6%E9%A6%99%E6%B8%AF%E7%9B%BE%E5%B0%84%E7%AE%AD%E6%AF%94%E8%B3%BD',
    description: '中國香港射箭總會主辦的盾射箭比賽，兼為集訓隊及海外賽事資格計分賽，設複合弓、反曲弓等組別。' },
  { url: 'https://www.hkvaa.org/', source_url: 'https://www.cnchuangsai.com/58310.html',
    description: '香港視覺藝術中心主辦的視覺藝術競賽，面向在校大學生及青年設計師，涵蓋視覺設計、空間設計、產品設計、AIGC 等賽道。' },
  { url: 'https://www.hkcyaca.com/post/cartoon-art-contest-2026-09',
    description: 'CYACA 香港青年創藝協會主辦的免費卡通人物填色／繪畫／手工勞作比賽，設中學組及公開組。' },
  { url: 'https://www.cycling.org.hk/events/list/',
    description: '中國香港單車總會主辦的全港公路單車賽第三回合，大埔新娘潭路個人計時賽。',
    venue: '大埔新娘潭路 Brides Pool Road' },
  { url: 'https://www.hkssf.org.hk/',
    description: '香港學界體育聯會主辦的全港學界籃球馬拉松，以學校為單位參賽。' },
  { url: 'https://hkymc.hk/Apply.html',
    description: 'HKYMC 全港青少年數學挑戰賽，設個人組及學校組，於民生書院小學舉行，設冠亞季軍及金銀銅獎。',
    venue: '民生書院小學（九龍城東寶庭道8號）' },
  { url: 'https://www.discoverhongkong.com/eng/what-s-new/events/cyclothon/', source_url: 'https://www.discoverhongkong.com/tc/events/cyclothon.html',
    description: '香港旅遊發展局主辦的年度單車盛事，10月11日舉行，設多條路線供單車愛好者參與。' },
  { url: 'https://tamiya.hk/product/hkc-2026-s3/',
    description: '田宮迷你四驅車世界賽港澳選拔賽，於荃灣廣場舉行，公開組冠軍獲世界賽選手權，代表香港出戰日本世界賽。',
    prize: '公開組冠軍獲世界賽選手權及 HKD3,000 旅費贊助；兩組冠亞季軍獲獎杯獎狀' },

  // ===== 12 条缺简介 =====
  { url: 'https://www.hkkaca.org/kaca-%E6%AF%94%E8%B3%BD%E6%B4%BB%E5%8B%95',
    description: '香港兒童藝術文化協會（KACA）主辦的各類兒童藝術比賽，涵蓋視藝、音樂、歌唱、朗誦等，免費參加。' },
  { url: 'https://www.paobaodao.com/hong-kong/race/pegasus-shek-mun-10k/',
    description: '第十七屆 PEGASUS 石門10公里賽，由香港馬拉松推廣社主辦，沙田石門路跑，約97%平路賽道。',
    venue: '沙田石門' },
  { url: 'https://www.e-services-web2.landsd.gov.hk/e-services/sc/photoTakingVideoShootingContest-webform.php',
    description: '地政總署慶祝成立45周年舉辦的攝影及短片創作比賽，主題「我地的過去、現在、未來」，捕捉地景蛻變與城郊共融。',
    prize: '各組冠軍 HK$5,000 購物禮券、亞軍 $3,000、季軍 $2,000、優異獎 $500' },
  { url: 'https://www.polyu.edu.hk/mm/about-mm/news-and-events/news/2026/2026-the-2nd-sysbs/',
    description: '中山大學管理學院、哈佛商學院出版與香港理工大學工商管理學院聯合主辦的數字商業模擬及案例分析大賽，聚焦粵港澳大灣區，總決賽於理大舉行。' },
  { url: 'https://www.paobaodao.com/hong-kong/race/ttr-charity-run/',
    description: '毅行教室慈善基金主辦的越野慈善賽，設5K／10K／25K 等多個距離，收益扣除成本後全數撥捐慈善用途。',
    venue: '鶴藪漁護署燒烤場區（新界東北）', fee_amount: 'HK$300–550' },
  { url: 'https://www.hkssf-nt.org.hk/',
    description: '香港學界體育聯會主辦的全港學界游泳錦標賽，以學校為單位參賽。' },
  { url: 'https://hkia.net/en/whats-on/1/events/detail/1312',
    description: '香港建築師學會主辦的第36屆青年建築師獎，本屆主題「旅遊無處不在」，邀請青年建築師構思促進大嶼山生態旅遊的建築方案。' },
  { url: 'https://betterfutureawards.com/hkg26/quickstart.asp',
    description: 'Better Future 主辦的香港設計大獎，面向全球設計師與公司，涵蓋10大類別，設金獎、銀獎、最佳工作室獎等。',
    fee_amount: '€432.5 起' },
  { url: 'https://zijing.com.cn/web/article/1524086405849341952/web/content_1524086405849341952.html',
    description: '紫荊雜誌社與香港教育工作者聯會合辦的全港中小學生中國歷史文化知識競賽，分網上初賽及現場總決賽。',
    prize: '校際冠亞季軍獎金 HK$10,000／$5,000／$4,000' },
  { url: 'https://www.hkssf-hk.org.hk/',
    description: '中國香港學界體育聯會主辦的全港學界精英足球比賽，以學校為單位，24隊單淘汰制，被譽為「學界歐聯」。' },
  { url: 'https://www.paobaodao.com/hong-kong/en/race/merry-run-round/',
    description: 'Merry-Run-Round 越野賽，於大棠舉行，設10公里及21公里越野跑。',
    venue: '大棠燒烤區7號場地' },
  { url: 'https://posttocompete.hk/%e6%a2%9d%e6%ac%be%e5%8f%8a%e7%b4%b0%e5%89%87/',
    title: '玩PO競 漫畫創作宣傳挑戰賽2026',
    description: '競爭事務委員會與青年成就香港部合辦的漫畫創作宣傳挑戰賽，推廣《競爭條例》，中學生2–4人組隊參賽，歡迎 AI 創作。' },
]

const PATCH_ONLY_IF_EMPTY = ['description', 'venue', 'prize', 'fee_amount']

async function main() {
  let ok = 0, notFound = 0
  for (const u of UPDATES) {
    const { url, ...fields } = u
    const { data } = await supabase.from('competitions').select('id,title,description,venue,prize,fee_amount,organizer').eq('source_url', url).maybeSingle()
    if (!data) { console.log(`⛔ 未找到: ${url.slice(0, 60)}`); notFound++; continue }

    const upd = {}
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'source_url' || k === 'title') { upd[k] = v; continue }
      if (PATCH_ONLY_IF_EMPTY.includes(k) && data[k]) continue  // 不覆盖已有
      if (v) upd[k] = v
    }
    if (Object.keys(upd).length === 0) { console.log(`➖ 无需更新: ${data.title.slice(0, 40)}`); continue }

    const { error } = await supabase.from('competitions').update(upd).eq('id', data.id)
    if (error) { console.log(`❌ ${data.title.slice(0, 30)}: ${error.message}`); continue }
    ok++
    const desc = upd.description ? ' desc' : ''
    const src = upd.source_url ? ' 换URL' : ''
    const tt = upd.title ? ` 改标题→${upd.title.slice(0,30)}` : ''
    console.log(`✅ ${data.title.slice(0, 36)}${desc}${src}${tt}`)
  }
  console.log(`\n======= 结果 =======\n✅ 更新 ${ok} 条 | ⛔ 未找到 ${notFound}`)
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })

// @ts-nocheck
// 批量写入英文翻译到 Supabase
// 用法: npx tsx scripts/apply-translations.ts
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

// ============ 翻译映射表 ============
const translations: Record<string, { venue_en?: string; prize_en?: string }> = {
  // ---- 运动类 ----
  'd7c1cf04-99b4-4e12-8ce2-0cb7087dbf06': { venue_en: 'Chai Wan / Kwun Tong / Tsim Sha Tsui Billiard Centres' },
  '29856fb6-a42c-436d-8234-9cb30ab0c9f6': { venue_en: 'Starts from West Kowloon Cultural District' },
  'c7e9bc24-6228-49a8-8773-065ac56b397a': { venue_en: 'Hong Kong Archery Range' },
  '4a7dc47c-8726-486e-917d-43a92c6aa370': { venue_en: 'Tuen Mun Gold Coast' },
  '3e13bf32-5d18-4867-8afb-cee7eac0be5e': { venue_en: 'Hong Kong Country Parks' },
  '6516d12d-4d37-4db2-aa67-c96999521c67': { venue_en: 'AsiaWorld-Expo Arena (Hall 1)' },
  'e1dc2f33-e1bb-4287-923a-fb0b0755bf73': { venue_en: 'Central Harbourfront' },
  '488d5c77-fec5-4b8e-9ae5-a8c3b6474355': { venue_en: 'Starts from Nathan Road, Tsim Sha Tsui; finishes at Victoria Park' },
  '3e055bc6-ddf4-42b4-b4e6-5cae5472613f': { venue_en: 'Starts from Nathan Road, Tsim Sha Tsui (TBC)' },
  '149f790e-74b3-48dc-a137-4caffd1ed711': { venue_en: 'Shing Mun Reservoir Catchwater' },
  'db6d39c9-8903-4977-807a-61f8ccf8e3f1': { venue_en: 'HKUST Campus (and other participating universities concurrently)' },
  'cd7fc9d8-d75b-4eca-917f-7304852c9fa3': { venue_en: 'Participating schools' },
  'ff12c475-1d09-491c-86d5-dd5d825fc719': { venue_en: 'University of Hong Kong Campus' },
  '7f7ab4db-7b7f-46dc-b386-b92efc02a44c': { venue_en: 'China Hong Kong Chess Academy' },
  '6414c8a6-ccd5-4fa9-b267-813bc946f65a': { venue_en: 'Queen Elizabeth Stadium (18 Oi Kwan Road, Wan Chai)' },
  'e153e632-f888-4fcb-9c46-0dbc71716e01': { venue_en: 'Hong Kong Pooi To Primary School 7/F Dance Hall (3 Fuk Cheung Street, Kowloon City)' },
  '0e768398-0d46-480f-bd2c-f20385929130': { venue_en: 'Kwai Tsing Theatre Black Box Theatre' },
  '3d0ead29-cd32-4963-ac76-1521d59c5055': { venue_en: 'TBA' },
  '7a4cc025-5a59-4df8-8f47-8c5cec148287': { venue_en: 'Online submission' },

  // ---- 电竞 ----
  '56bf90a6-f8b7-44c4-a35a-28b9decde1ca': { venue_en: 'Whampoa World Fashion Court, MTR Level', prize_en: 'Total prize HK$30,000; cash prizes from Top 8 onwards' },
  '76446bc3-4ad7-4869-bd8a-2a4af9066828': { venue_en: 'Online tournament (Server: Hong Kong)' },
  'eed3f5c5-3e43-4691-9a8a-e32e9ba2ca9b': { venue_en: 'Kwun Tong Sau Mau Ping Community Hall (100 Sau Ming Road)' },
  '269b0400-ee38-4e4a-8c4c-bd89bb74c77e': { venue_en: 'Qualifiers online; finals venue TBA', prize_en: 'Total prize HK$12,000 (Champion HK$7,000)' },

  // ---- 创意/摄影/设计 ----
  '28155bce-1abc-4c0f-85b3-22afce508039': { venue_en: 'Online registration via official website', prize_en: 'Champion HK$5,000 shopping vouchers; 1st runner-up $3,000; 2nd runner-up $2,000; Merit award $500' },
  'd49133be-14b6-4348-8778-552d754ffd1a': { venue_en: 'Submit via email to capturehk@hotmail.com', prize_en: 'Champion, 1st & 2nd runners-up, and Merit awards for each category' },
  '8f79a26c-8529-4f9c-b1bf-8fdbffb1863d': { venue_en: 'Hong Kong Central Library (Causeway Bay)' },
  '81c2c86d-2455-4ff1-8a7d-38eb9edd8fb5': { venue_en: 'Submit via YouTube/Vimeo' },
  '8e3155d8-b95e-4239-9cfb-82b9dec3cf01': { venue_en: 'Online submission; results announced 1 November', prize_en: 'Awards for each category' },
  'ea23f3a4-6afa-4732-b0dd-26422465bf2f': { venue_en: 'Online submission; selected works screened at ifva Festival', prize_en: 'Awards for each category and screening opportunities' },
  '38f1e4b6-103b-4c20-97a0-24f1d04f5a81': { venue_en: 'Online application', prize_en: 'Up to USD $35,000 production grant + mentorship + HKIFF premiere' },
  '7a75496a-85b4-49d5-b319-1b857853c790': { venue_en: 'Submit via email to ekeo@devb.gov.hk', prize_en: 'Champion HK$3,000; 1st runner-up $2,500; 2nd runner-up $2,000; 5 Merit awards $1,000 each (per group)' },
  '5b6a5d39-94e0-4879-bdc9-39983618b9a0': { venue_en: 'Online submission', prize_en: '1st Prize: CCD camera + certificate' },
  '3be46949-a542-43d5-b5ff-32b0bff18d44': { venue_en: 'Submit via PSA China proxy' },
  'e2603d26-264c-4ab1-af12-8068acfc583b': { venue_en: 'Online submission' },
  'b4b71116-664f-49a1-9273-fb4c882e796b': { venue_en: 'Online submission', prize_en: 'Gold, Silver, Bronze and Special Mention awards for each category' },
  '62864686-c1f4-4362-9e05-7aa4702ee23d': { venue_en: 'Online submission', prize_en: 'Themed categories: Gold HK$5,000, Silver HK$3,000 / Open categories: Gold HK$1,000' },
  'da92e55f-b91c-4681-b3a6-398aad859c51': { venue_en: 'Online submission', prize_en: 'Theme category Gold award ¥1,250 (pre-tax)' },
  '2887b4bf-dcdd-45a4-891f-402fbae7b689': { venue_en: 'Online submission', prize_en: 'Winner certificate and trophy' },

  // ---- AI创作 ----
  '35a90803-d50e-44ec-8759-e6525964e430': { venue_en: 'Online submission; results in September; awards ceremony in October', prize_en: 'Awards for each category and exhibition opportunities' },

  // ---- 创业/路演 ----
  'f5056f5a-34d9-44a0-9082-026f44773a42': { venue_en: 'Cyberport + LSE London', prize_en: 'Top 10 teams each receive HK$100,000 CCMF seed fund' },
  '70e74e8c-608f-4a00-8aa4-51d91f879704': { venue_en: 'Online application', prize_en: 'Investor matching + Hong Kong landing support + regulatory sandbox opportunities' },
  '774c69a9-af92-4447-acb1-82affa70dfd2': { venue_en: 'Finals 22 Sep: Hong Kong Science Park', prize_en: 'Up to approx. HK$6.4M in prizes and rewards' },
  'eb9815d2-02b5-4867-96c5-cb9f0c60306e': { venue_en: 'Hong Kong Science Park', prize_en: 'Over HK$1.4M seed funding' },
  '6d8e3cea-7f49-4afc-bb46-0266f59f658d': { venue_en: 'TBA', prize_en: 'Champion HK$20,000 cash prize' },
  '2ebf6ff5-036e-411b-9c26-60a2aa733fd1': { venue_en: 'TBA', prize_en: 'Prizes valued at over HK$100,000' },
  '77d76a1a-a78f-4c97-90e7-6aef21d0fbaf': { venue_en: 'HKUST', prize_en: 'International student track total prize HK$205,000 + HKSTP seed fund' },
  '81ee2d11-241d-40d7-977f-b915c69ff557': { venue_en: 'Qualifiers online; finals in Hong Kong (onsite)' },
  '9081192a-8f79-4213-818b-7bb20e92e3ec': { venue_en: 'HKPC Building (78 Tat Chee Avenue, Kowloon)', prize_en: 'Winning team prizes valued at over HK$4,000' },
  'a53517b4-5ce9-4b0a-9d11-6f37b4de5440': { venue_en: 'Cyberport 3, Function Room 1-3', prize_en: 'Total prize HK$148,000' },
  '67d85636-b98c-4287-bf80-79a0f3e0757f': { venue_en: 'Fully online', prize_en: 'Prize pool US$10,000' },
  'de42b41b-dda1-43f5-b4cf-4f8f47a5ced5': { venue_en: 'Online submission (GitHub + demo video)', prize_en: 'Prize pool USD $10,000' },
  'c3807d2a-24ac-4ca3-80fd-145531b5ad64': { venue_en: 'HKUST' },

  // ---- 音乐/表演 ----
  '9e4edf05-21d9-4aa5-b059-e9d1a02d9c3b': { venue_en: 'Online video submission', prize_en: 'Awards for each category' },
  '6d377944-fd91-4f51-a76c-e34428eb529b': { venue_en: 'Online video submission' },
  '1597956d-8f07-4846-9c8f-ac27c5692557': { venue_en: 'Online video submission', prize_en: 'Champion, 1st & 2nd runners-up and Merit awards for each category' },
  '8a6cceed-2af4-4ea3-ae3c-03eadf174fed': { venue_en: 'Online video submission', prize_en: 'Champion, 1st & 2nd runners-up and Gold/Silver/Bronze awards for each category' },
  'a3486536-ccbf-49d7-a3d5-6a6370707fd6': { venue_en: 'Preliminary: Gala Zone, Kwun Tong / Final: Play It Loud, Cheung Sha Wan', prize_en: 'Champion HK$1,000; 1st runner-up HK$500; 2nd runner-up HK$200 + MVP Popularity Award' },
  'e67495f7-3f37-402b-a4b6-4f1745d565dc': { venue_en: 'Chai Wan Youth Square', prize_en: 'Cash prize up to HK$3,000' },
  '1a80727d-dd23-4e04-b36d-102f43890f98': { venue_en: 'AMI Music Centre (detailed address TBA)', prize_en: 'Total prizes valued at over HK$40,000' },
  '37e8efac-dfa2-4314-93bd-fdc060d3ec8a': { venue_en: 'Online video submission' },
  'd690c5fe-54b5-490b-987e-6ba9328d41e2': { venue_en: 'Preliminary online / Finals: Tsuen Wan Town Hall Auditorium', prize_en: 'Champion HK$5,000 + trophy; 1st runner-up HK$3,000; 2nd runner-up HK$2,000' },
  '1676054e-4517-4748-bae6-7ee3431e4a76': { venue_en: 'Chai Wan Youth Square 4/F, HYAB JC Y Cube' },

  // ---- 绘画/艺术 ----
  'aae7517e-5032-4ce1-9e15-623dbb1b7d9d': { venue_en: 'Online submission', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards, Merit award, Best Creativity Award' },
  '48fd0857-2055-486c-bf5f-bc9d68e63fb2': { venue_en: 'Online submission', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards (90/80/70+ points)' },
  '9606d37b-9bd3-4b80-b457-bad6f39d7826': { venue_en: 'Online submission', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards, Merit award' },
  '88706e3b-3178-4f05-b37d-cf4bc4070b34': { venue_en: 'Online / postal / in-person submission' },
  '35446ded-a067-433b-a7f6-1c39bb98e412': { venue_en: 'Submit by mail or email', prize_en: 'Champion, 1st & 2nd runners-up trophies + Gold/Silver/Bronze medals' },
  'c26e3f47-b4fe-4e38-bc81-e9020c242896': { venue_en: 'Exhibition & awards ceremony: Wan Chai, Hong Kong' },
  '711791bb-af2e-487e-8fe5-543252561af9': { venue_en: 'Online submission', prize_en: 'Winning artwork printed on actual shipping containers sailing globally' },
  '348d5a92-06c3-488d-a78d-9c16a6741b1b': { venue_en: 'Submit recipes via email to kfood@kcchk.kr', prize_en: 'Champion HK$5,000 + Korean wine + priority access to Korean cooking workshops' },

  // ---- 编程/黑客松 ----

  // ---- 跳舞 ----
  '65bb27ea-6821-4634-a5d3-6539547f413e': { venue_en: 'Online video submission', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards, Merit award' },
  '01588b71-3af9-4984-811a-07e5f490c71a': { venue_en: 'Online video submission', prize_en: 'Champion, 1st & 2nd runners-up and Merit award' },
  '0ae8cc96-3f77-4d38-b03c-31d20aaea596': { venue_en: 'Online video submission (YouTube/WhatsApp)', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards' },

  // ---- 征文/写作 ----
  '497b656d-cddf-4ec1-a3a9-ad2c2cdc7baf': { venue_en: 'Online submission', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards, Best Creativity Award, Best Literary Talent Award' },
  '5dcbc391-f4cc-458d-8eaf-27a13a60bd83': { venue_en: 'Online submission for Hong Kong & Macau regions', prize_en: 'Special Prize, 1st, 2nd & 3rd prizes and Merit awards for each category; plus Most Active School Award and Best Instructor Award' },
  '6fbd8dfd-86c5-4f90-869d-4f342f1f5e26': { venue_en: 'Online submission; awards ceremony 25 October', prize_en: 'Awards and certificates for each category' },
  '4a126607-7f84-4aed-94f4-fd00f98f2ba9': { venue_en: 'Video preliminary → group rounds → grand final', prize_en: 'Grand Champion HK$6,000; Special Prize $5,000; 1st/2nd/3rd prizes ($3,000/$2,000/$1,000); Merit awards $500' },
  '2abd85d9-ff39-4738-9f05-2eafefd1e30f': { venue_en: 'Submit via postal mail or email', prize_en: '1st Prize HK$1,400; 2nd HK$1,300; 3rd HK$1,200; Merit HK$900' },
  '3e658711-2bfe-4e38-abc9-64a81a9c3179': { venue_en: 'Online submission', prize_en: '1st Prize HK$5,000; 2nd HK$3,000; 3rd HK$2,000' },

  // ---- 书法 ----
  '79ada300-ba71-44f2-a79d-c50be74a9cb7': { venue_en: 'Online submission', prize_en: 'Champion, 1st & 2nd runners-up, Gold/Silver/Bronze awards, Merit award' },
  'c7ccade8-4ac1-4384-8245-6a9429dbdcac': { venue_en: 'Submit via WhatsApp', prize_en: 'Champion, 1st & 2nd runners-up and Merit awards' },
  'b8d86f9c-1467-4e79-b8e5-ac3fe0b07731': { venue_en: 'TBA' },
  '63779a42-beaa-4446-9ad5-c53858eca4f4': { venue_en: 'Online submission', prize_en: 'Awards for each category' },
  'd35067e5-81cf-4bbe-8d21-10cdcf55535b': { venue_en: 'Preliminary: mail submission / Final: live calligraphy', prize_en: '1st Prize HK$1,500; 2nd HK$1,300; 3rd HK$1,100; Merit HK$900' },
  '9993f36f-83c1-4288-8f06-a30ef73294ee': { venue_en: 'Submit via postal mail or courier', prize_en: 'Champion book vouchers HK$1,500; 1st runner-up HK$800; 2nd runner-up HK$500' },

  // ---- 朗读/朗诵 ----
  '1a6a499a-1f93-40fd-a8d7-10d4991923a7': { venue_en: 'Confucian Hall Li Sang College (Causeway Bay)' },

  // ---- 厨艺 ----
  'e5ae7b7e-146d-48ab-b423-20a282edf675': { venue_en: 'Chinese Culinary Institute', prize_en: 'Total prize value HK$100,000; Open category Gold HK$10,000 cash' },

  // ---- 话剧/剧本 ----
  'dc2d52c0-60ae-4afc-a484-c4baf00a66b5': { venue_en: 'Submit via email to projectkite@hkrep.com', prize_en: 'Shortlisted for Stage 3 receives HK$40,000 creative honorarium + official production opportunity' },

  // ---- 其他 ----
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log(`准备更新 ${Object.keys(translations).length} 条记录的英文字段...\n`)

  let updated = 0
  let skipped = 0

  for (const [id, fields] of Object.entries(translations)) {
    const { error } = await supabase.from('competitions').update(fields).eq('id', id)
    if (error) {
      console.log(`  ❌ ${id}: ${error.message}`)
    } else {
      console.log(`  ✅ ${id}: ${Object.keys(fields).join(', ')}`)
      updated++
    }
  }

  console.log(`\n===== 完成 =====`)
  console.log(`✅ 已更新: ${updated}`)
  console.log(`📝 共 ${Object.keys(translations).length} 条`)
}

main().catch(console.error)

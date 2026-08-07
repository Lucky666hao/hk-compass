// @ts-nocheck
/**
 * HK Compass — 种子数据脚本
 * 用法: npx tsx scripts/seed.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// 显式加载 .env.local
config({ path: resolve(process.cwd(), '.env.local') })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ 缺少环境变量。请检查 .env.local 中的 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const SEED_COMPETITIONS = [
  {
    title: '渣打香港马拉松 2027',
    title_en: 'Standard Chartered Hong Kong Marathon 2027',
    type: '运动',
    description: '香港年度最大型马拉松赛事，设有全马、半马、十公里及轮椅赛。赛道途经昂船洲大桥、青马大桥、西隧等香港地标。',
    date_start: '2027-01-17T06:00:00+08:00',
    date_end: '2027-01-17T13:00:00+08:00',
    registration_deadline: '2026-10-31T23:59:00+08:00',
    location: '九龙',
    venue: '尖沙咀弥敦道起步，维多利亚公园终点',
    fee_type: '付费',
    fee_amount: 'HK$450-550',
    prize: '各组别前三名获奖杯及奖金',
    organizer: '香港田径总会',
    registration_link: 'https://www.hkmarathon.com',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'BLAST Premier 香港电竞大赛 2026',
    title_en: 'BLAST Premier Hong Kong Rivals 2026',
    type: '电竞',
    description: '国际顶级CS2赛事登陆香港，世界顶尖战队云集亚洲国际博览馆。',
    date_start: '2026-11-14T12:00:00+08:00',
    date_end: '2026-11-16T22:00:00+08:00',
    registration_deadline: '2026-11-13T23:59:00+08:00',
    location: '新界',
    venue: '亚洲国际博览馆Arena (Hall 1)',
    fee_type: '付费',
    fee_amount: 'HK$399-1,299',
    prize: '总奖金池 $500,000 USD',
    organizer: 'BLAST & 香港电竞总会',
    registration_link: 'https://blast.tv',
    source: 'manual',
    status: '报名中',
  },
  {
    title: '香港国际摄影大赛 2026',
    title_en: 'Hong Kong International Photography Contest 2026',
    type: '创意摄影设计',
    description: '公开组摄影比赛，题材不限。设风景、人像、街拍、手机摄影四个组别。',
    date_start: '2026-09-01T00:00:00+08:00',
    date_end: '2026-12-01T23:59:00+08:00',
    registration_deadline: '2026-11-15T23:59:00+08:00',
    location: '线上',
    venue: '线上提交作品',
    fee_type: '免费',
    prize: '冠军 HK$10,000 + 展览机会',
    organizer: '香港摄影学会',
    registration_link: 'https://www.hkpc.org.hk',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'Cyberport 创业家擂台 2026',
    title_en: 'Cyberport Entrepreneurship Pitch 2026',
    type: '创业路演',
    description: '数码港年度创业路演大赛，面向全港及大湾区初创企业。优胜者可获数码港培育计划名额及投资对接机会。',
    date_start: '2026-10-15T09:00:00+08:00',
    date_end: '2026-10-16T18:00:00+08:00',
    registration_deadline: '2026-09-20T23:59:00+08:00',
    location: '港岛',
    venue: '数码港商场中庭',
    fee_type: '免费',
    prize: '培育名额 + 最高 HK$50万种子基金 + 投资对接',
    organizer: '香港数码港管理有限公司',
    registration_link: 'https://www.cyberport.hk',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'HKSTP AI 创新应用大赛',
    title_en: 'HKSTP AI Innovation Challenge',
    type: 'AI创作',
    description: '香港科技园主办的AI应用创新大赛，参赛者可提交任何以AI技术为核心的创新方案。',
    date_start: '2026-09-15T00:00:00+08:00',
    date_end: '2026-12-15T23:59:00+08:00',
    registration_deadline: '2026-10-31T23:59:00+08:00',
    location: '新界',
    venue: '香港科学园',
    fee_type: '免费',
    prize: '冠军 HK$100,000 + 科学园培育名额',
    organizer: '香港科技园公司 (HKSTP)',
    registration_link: 'https://www.hkstp.org',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'Clockenflap 音乐节 2026 乐队大赛',
    title_en: 'Clockenflap Band Competition 2026',
    type: '音乐表演',
    description: '香港最大户外音乐节Clockenflap举办的乐队大赛，优胜者将获得音乐节演出机会。',
    date_start: '2026-11-01T00:00:00+08:00',
    date_end: '2026-12-01T23:59:00+08:00',
    registration_deadline: '2026-10-15T23:59:00+08:00',
    location: '港岛',
    venue: '中环海滨活动空间',
    fee_type: '付费',
    fee_amount: 'HK$200 报名费',
    prize: '音乐节主舞台演出 + HK$20,000奖金',
    organizer: 'Clockenflap',
    registration_link: 'https://www.clockenflap.com',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'Google AI 黑客松 香港站',
    title_en: 'Google AI Hackathon Hong Kong',
    type: 'AI创作',
    description: 'Google主办的两日AI黑客松，使用Gemini API构建创新应用。',
    date_start: '2026-09-20T09:00:00+08:00',
    date_end: '2026-09-21T18:00:00+08:00',
    registration_deadline: '2026-09-10T23:59:00+08:00',
    location: '港岛',
    venue: 'Google 香港办公室',
    fee_type: '免费',
    prize: '冠军团队获 Google Cloud 信用额度 $5,000 + 技术指导',
    organizer: 'Google Hong Kong',
    registration_link: 'https://developers.google.com',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'Prada 时尚设计新星大赛 2026',
    title_en: 'Prada Emerging Fashion Designer Award 2026',
    type: '创意摄影设计',
    description: 'Prada与香港设计中心合办的时尚设计比赛，征集服装及配饰设计作品。',
    date_start: '2026-10-01T00:00:00+08:00',
    date_end: '2027-01-15T23:59:00+08:00',
    registration_deadline: '2026-11-30T23:59:00+08:00',
    location: '九龙',
    venue: '西九文化区 M+ 博物馆',
    fee_type: '免费',
    prize: '冠军获Prada实习机会 + 作品在米兰展出',
    organizer: 'Prada x 香港设计中心',
    source: 'manual',
    status: '报名中',
  },
  {
    title: '香港电竞超级联赛 S3',
    title_en: 'Hong Kong Esports Super League Season 3',
    type: '电竞',
    description: 'CGA主办的季度电竞联赛，项目包括英雄联盟、Valorant、Apex Legends。',
    date_start: '2026-09-05T14:00:00+08:00',
    date_end: '2026-12-20T22:00:00+08:00',
    registration_deadline: '2026-09-01T23:59:00+08:00',
    location: '九龙',
    venue: 'CGA电竞馆（观塘）',
    fee_type: '付费',
    fee_amount: 'HK$300/队',
    prize: '总奖金池 HK$100,000 + 职业队试训机会',
    organizer: 'Cyber Games Arena',
    registration_link: 'https://cga.gg',
    source: 'manual',
    status: '报名中',
  },
  {
    title: '香港科技大学 黑客松 2026',
    title_en: 'HKUST Hackathon 2026',
    type: '创业路演',
    description: '科大年度黑客松，面向全港大学生。48小时组队开发，主题涵盖AI、Web3、可持续发展。',
    date_start: '2026-11-08T08:00:00+08:00',
    date_end: '2026-11-10T18:00:00+08:00',
    registration_deadline: '2026-10-25T23:59:00+08:00',
    location: '新界',
    venue: '香港科技大学校园',
    fee_type: '免费',
    prize: '总奖金 HK$30,000 + 投资者对接 + 孵化机会',
    organizer: '香港科技大学创业中心',
    registration_link: 'https://ec.hkust.edu.hk',
    source: 'manual',
    status: '报名中',
  },
  {
    title: '香港龙舟嘉年华 国际龙舟赛',
    title_en: 'Hong Kong Dragon Boat Carnival International Races',
    type: '运动',
    description: '年度国际龙舟大赛，数百支队伍在维多利亚港竞渡。设有公开组、混合组、企业组。',
    date_start: '2027-06-15T08:00:00+08:00',
    date_end: '2027-06-17T18:00:00+08:00',
    registration_deadline: '2027-05-01T23:59:00+08:00',
    location: '九龙',
    venue: '尖沙咀东海滨至中环',
    fee_type: '付费',
    fee_amount: 'HK$2,000-5,000/队',
    prize: '各组别奖杯+奖金 HK$50,000-200,000',
    organizer: '香港旅游发展局 & 香港龙舟协会',
    registration_link: 'https://www.discoverhongkong.com',
    source: 'manual',
    status: '即将开始',
  },
  {
    title: '大湾区青年创业大赛 2026',
    title_en: 'Greater Bay Area Youth Entrepreneurship Competition 2026',
    type: '创业路演',
    description: '面向大湾区9+2城市青年的创业大赛，覆盖人工智能、生物科技、文化创意、金融科技四个赛道。',
    date_start: '2026-10-20T09:00:00+08:00',
    date_end: '2026-10-22T18:00:00+08:00',
    registration_deadline: '2026-09-30T23:59:00+08:00',
    location: '港岛',
    venue: '香港会议展览中心',
    fee_type: '免费',
    prize: '冠军 HK$200,000 + 天使投资对接 + 深圳前海免费办公空间一年',
    organizer: '香港青年联会 & 前海管理局',
    registration_link: 'https://www.gbayouth.org.hk',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'Hong Kong Open 羽毛球锦标赛 2026',
    title_en: 'Hong Kong Open Badminton Championships 2026',
    type: '运动',
    description: 'BWF世界巡回赛超级500赛事，全球顶尖羽毛球选手齐聚香港体育馆。设有男单、女单、男双、女双、混双。',
    date_start: '2026-11-11T09:00:00+08:00',
    date_end: '2026-11-16T22:00:00+08:00',
    registration_deadline: '2026-10-20T23:59:00+08:00',
    location: '九龙',
    venue: '香港体育馆（红馆）',
    fee_type: '付费',
    fee_amount: '业余组报名 HK$150',
    prize: '超级500赛事积分+奖金',
    organizer: '香港羽毛球总会',
    registration_link: 'https://www.hkbadmintonassn.org.hk',
    source: 'manual',
    status: '报名中',
  },
  {
    title: 'TEDx Hong Kong 演讲者选拔 2027',
    title_en: 'TEDx Hong Kong Speaker Audition 2027',
    type: '其他',
    description: 'TEDx Hong Kong年度演讲者选拔，征集有独特想法的讲者。主题不限，需要你有值得传播的思想。',
    date_start: '2027-03-01T00:00:00+08:00',
    date_end: '2027-05-01T23:59:00+08:00',
    registration_deadline: '2027-02-01T23:59:00+08:00',
    location: '线上',
    venue: '线上提交3分钟讲稿视频',
    fee_type: '免费',
    prize: 'TEDx舞台演讲机会 + 专业演讲培训',
    organizer: 'TEDx Hong Kong',
    registration_link: 'https://tedxhongkong.org',
    source: 'manual',
    status: '即将开始',
  },
  {
    title: '香港动漫节 Cosplay 大赛 2027',
    title_en: 'Ani-Com Hong Kong Cosplay Competition 2027',
    type: '创意摄影设计',
    description: '香港动漫电玩节年度Cosplay大赛，分个人组和团体组，评审标准包括服装制作、角色还原、舞台表现。',
    date_start: '2027-07-25T12:00:00+08:00',
    date_end: '2027-07-27T20:00:00+08:00',
    registration_deadline: '2027-07-01T23:59:00+08:00',
    location: '港岛',
    venue: '香港会议展览中心',
    fee_type: '免费',
    prize: '冠军 HK$15,000 + 日本动漫节表演机会',
    organizer: '香港动漫电玩节',
    registration_link: 'https://www.ani-com.hk',
    source: 'manual',
    status: '即将开始',
  },
]

async function seed() {
  console.log(`🌱 开始导入种子数据: ${SEED_COMPETITIONS.length} 条\n`)

  let inserted = 0
  let skipped = 0

  for (const comp of SEED_COMPETITIONS) {
    const { data: existing } = await supabase
      .from('competitions')
      .select('id')
      .eq('title', comp.title)
      .maybeSingle()

    if (existing) {
      console.log(`⏭️  跳过: ${comp.title}`)
      skipped++
      continue
    }

    const { error } = await supabase.from('competitions').insert(comp)
    if (error) {
      console.error(`❌ 失败: ${comp.title} — ${error.message}`)
    } else {
      console.log(`✅ ${comp.title}`)
      inserted++
    }
  }

  console.log(`\n📊 新增 ${inserted} 条, 跳过 ${skipped} 条, 共 ${SEED_COMPETITIONS.length} 条`)
}

seed().catch(console.error)

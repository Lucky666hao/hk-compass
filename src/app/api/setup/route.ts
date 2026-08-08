import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 7 个香港团体比赛数据
const TEAM_COMPETITIONS = [
  {
    title: '全港中學辯論錦標賽 2026',
    title_en: 'Hong Kong Secondary Schools Debate Championship 2026',
    type: '其他',
    description: '全港最大規模的中學辯論賽事，以隊伍形式參賽，每隊4-6人。比賽分為初賽、複賽、準決賽及決賽四個階段，設有最佳辯論員獎項。',
    description_en: 'Largest inter-school debate competition in Hong Kong. Teams of 4-6 compete across preliminary, quarter-final, semi-final and final rounds. Best Debater awards available.',
    date_start: '2026-09-15',
    date_end: '2026-12-20',
    registration_deadline: '2026-09-01',
    location: '港岛',
    venue: '香港大學',
    venue_en: 'University of Hong Kong',
    fee_type: '免费',
    fee_amount: null,
    prize: '冠軍HKD 10,000 + 獎盃',
    prize_en: 'Champion HKD 10,000 + Trophy',
    organizer: 'HKU Debate Society',
    registration_link: 'https://example.com/hk-debate-2026',
    age_group: '青少年',
    team_size: '4-6人',
    status: '报名中',
    source: 'hku-debate',
  },
  {
    title: '香港校際籃球聯賽 2026-27',
    title_en: 'Hong Kong Inter-school Basketball League 2026-27',
    type: '运动',
    description: '一年一度的全港中學籃球聯賽，分為男子組及女子組，每隊5-12人。賽季橫跨整個學年，分區比賽後進行全港總決賽。',
    description_en: 'Annual Hong Kong inter-school basketball league, divided into boys and girls divisions. Teams of 5-12 players compete across the full academic year, with district playoffs leading to territory-wide finals.',
    date_start: '2026-10-01',
    date_end: '2027-03-31',
    registration_deadline: '2026-09-20',
    location: '九龙',
    venue: '各區體育館',
    venue_en: 'Various District Sports Centres',
    fee_type: '免费',
    fee_amount: null,
    prize: '冠軍獎盃 + 獎牌',
    prize_en: 'Champion Trophy + Medals',
    organizer: 'HKSSF',
    registration_link: 'https://example.com/hk-bball-2026',
    age_group: '青少年',
    team_size: '7人以上',
    status: '报名中',
    source: 'hkssf-basketball',
  },
  {
    title: 'CyberPort 創科黑客松 2026',
    title_en: 'CyberPort Tech Hackathon 2026',
    type: 'AI创作',
    description: '48小時黑客松挑戰！圍繞智慧城市、金融科技及綠色科技三大主題進行開發。每隊2-3人，需提交可運行的原型及路演簡報。',
    description_en: '48-hour hackathon challenge! Build solutions around Smart City, FinTech, and GreenTech themes. Teams of 2-3 must deliver a working prototype and pitch presentation.',
    date_start: '2026-11-08',
    date_end: '2026-11-10',
    registration_deadline: '2026-10-25',
    location: '港岛',
    venue: '數碼港 CyberPort',
    venue_en: 'CyberPort, Pok Fu Lam',
    fee_type: '免费',
    fee_amount: null,
    prize: '冠軍HKD 50,000 + 孵化機會',
    prize_en: 'Champion HKD 50,000 + Incubation Opportunity',
    organizer: 'CyberPort',
    registration_link: 'https://example.com/cyberport-hack-2026',
    age_group: '成人/公开',
    team_size: '2-3人',
    status: '报名中',
    source: 'cyberport-hackathon',
  },
  {
    title: '香港校際音樂節 2026 — 樂隊比賽',
    title_en: 'Hong Kong Schools Music Festival 2026 — Band Competition',
    type: '音乐表演',
    description: '第75屆校際音樂節增設樂隊比賽項目，接受各類型樂隊參賽（流行、搖滾、爵士、古典室樂等）。每隊4-6人，需提交5-8分鐘演出曲目。',
    description_en: 'The 75th Schools Music Festival introduces a band competition category. Open to all band types (pop, rock, jazz, classical chamber). Teams of 4-6 perform a 5-8 minute piece.',
    date_start: '2026-11-01',
    date_end: '2026-11-30',
    registration_deadline: '2026-10-15',
    location: '九龙',
    venue: '香港文化中心',
    venue_en: 'Hong Kong Cultural Centre',
    fee_type: '付费',
    fee_amount: 'HKD 200/隊',
    prize: '冠軍HKD 8,000 + 錄音合約',
    prize_en: 'Champion HKD 8,000 + Recording Contract',
    organizer: 'Hong Kong Schools Music and Speech Association',
    registration_link: 'https://example.com/hk-music-fest-2026',
    age_group: '不限',
    team_size: '4-6人',
    status: '报名中',
    source: 'hksmsa-band',
  },
  {
    title: 'PolyU 電競挑戰賽 2026 — Valorant 5v5',
    title_en: 'PolyU Esports Challenge 2026 — Valorant 5v5',
    type: '电竞',
    description: '理工大學電競學會主辦的Valorant 5v5團隊賽。每隊5名正選 + 最多1名替補。初賽線上進行，四強及決賽在PolyU現場舉行。',
    description_en: 'PolyU Esports Society presents a Valorant 5v5 team tournament. 5 starters + 1 substitute per team. Preliminary rounds online, semi-finals and finals live at PolyU.',
    date_start: '2026-10-20',
    date_end: '2026-11-15',
    registration_deadline: '2026-10-10',
    location: '九龙',
    venue: 'PolyU 賽馬會創新樓 / 線上',
    venue_en: 'PolyU Jockey Club Innovation Tower / Online',
    fee_type: '付费',
    fee_amount: 'HKD 150/隊',
    prize: '冠軍HKD 15,000 + 電競裝備',
    prize_en: 'Champion HKD 15,000 + Gaming Gear',
    organizer: 'PolyU Esports Society',
    registration_link: 'https://example.com/polyu-esports-2026',
    age_group: '青少年',
    team_size: '4-6人',
    status: '报名中',
    source: 'polyu-esports',
  },
  {
    title: '香港青年創業計劃 2026 — 團隊路演賽',
    title_en: 'Hong Kong Youth Entrepreneurship Program 2026 — Team Pitch',
    type: '创业路演',
    description: '為期三個月的創業培訓計劃，最後以團隊路演比賽作結。每隊2-3人提出創業方案，接受評判即場點評。優秀項目有機會獲天使投資。',
    description_en: '3-month entrepreneurship training program culminating in a team pitch competition. Teams of 2-3 present startup proposals with live judging. Top projects may receive angel investment.',
    date_start: '2026-09-01',
    date_end: '2026-11-30',
    registration_deadline: '2026-08-20',
    location: '港岛',
    venue: '會展中心 HKCEC',
    venue_en: 'HKCEC, Wan Chai',
    fee_type: '免费',
    fee_amount: null,
    prize: '種子基金HKD 100,000 + 導師指導',
    prize_en: 'Seed Fund HKD 100,000 + Mentorship',
    organizer: 'HKYEA',
    registration_link: 'https://example.com/hk-yep-2026',
    age_group: '成人/公开',
    team_size: '2-3人',
    status: '报名中',
    source: 'hkyea-pitch',
  },
  {
    title: '香港國際電影節 2026 — 學生短片創作賽',
    title_en: 'HKIFF 2026 — Student Short Film Competition',
    type: '创意摄影设计',
    description: '以2-3人團隊創作5-15分鐘短片，主題為"我眼中的香港"。不限拍攝器材，需提交作品及幕後花絮。得獎作品將在電影節期間公開放映。',
    description_en: 'Create a 5-15 minute short film in teams of 2-3 on the theme "Hong Kong Through My Eyes". Any filming equipment allowed. Winning entries screened during the festival.',
    date_start: '2026-10-01',
    date_end: '2026-12-15',
    registration_deadline: '2026-09-15',
    location: '线上',
    venue: '全港取景 / 線上提交',
    venue_en: 'Filming anywhere in HK / Online submission',
    fee_type: '免费',
    fee_amount: null,
    prize: '最佳短片HKD 20,000 + 放映機會',
    prize_en: 'Best Film HKD 20,000 + Screening Opportunity',
    organizer: 'HKIFF Society',
    registration_link: 'https://example.com/hkiff-short-2026',
    age_group: '不限',
    team_size: '2-3人',
    status: '报名中',
    source: 'hkiff-short',
  },
]

export async function POST(req: Request) {
  const { migration } = await req.json()

  try {
    switch (migration) {
      // ============================================
      // 回填现有比赛 team_size：NULL → '不限'
      // ============================================
      case 'backfill_team_size': {
        const { data: nulls, error: selectErr } = await supabaseAdmin
          .from('competitions')
          .select('id')
          .is('team_size', null)

        if (selectErr) {
          // team_size 列可能还不存在
          return NextResponse.json({
            success: false,
            error: `请先在 Supabase SQL Editor 中执行: supabase/migrations/20250808_add_team_size.sql — ${selectErr.message}`,
          })
        }

        if (!nulls || nulls.length === 0) {
          return NextResponse.json({ success: true, updated: 0, message: '所有比赛已有 team_size 值，无需回填' })
        }

        const { error: updateErr } = await supabaseAdmin
          .from('competitions')
          .update({ team_size: '不限' })
          .is('team_size', null)

        if (updateErr) {
          return NextResponse.json({ success: false, error: updateErr.message })
        }

        return NextResponse.json({ success: true, updated: nulls.length })
      }

      // ============================================
      // 插入 7 个香港团体比赛
      // ============================================
      case 'insert_team_competitions': {
        // 先检查是否已插入（避免重复）
        const { data: existing } = await supabaseAdmin
          .from('competitions')
          .select('id')
          .eq('source', 'hku-debate')
          .limit(1)

        if (existing && existing.length > 0) {
          return NextResponse.json({ success: true, inserted: 0, message: '团体比赛数据已存在，跳过插入' })
        }

        const { error } = await supabaseAdmin.from('competitions').insert(TEAM_COMPETITIONS)
        if (error) {
          return NextResponse.json({ success: false, error: error.message })
        }

        return NextResponse.json({ success: true, inserted: TEAM_COMPETITIONS.length })
      }

      default:
        return NextResponse.json({ success: false, error: `未知迁移: ${migration}` })
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || '未知错误' })
  }
}

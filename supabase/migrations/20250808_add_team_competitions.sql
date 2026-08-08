-- ============================================
-- 先回填现有比赛的 team_size（NULL → '不限'）
-- ============================================
UPDATE public.competitions SET team_size = '不限' WHERE team_size IS NULL;

-- ============================================
-- 插入香港团体比赛测试数据
-- ============================================

INSERT INTO public.competitions (title, title_en, type, description, description_en, date_start, date_end, registration_deadline, location, venue, venue_en, fee_type, fee_amount, prize, prize_en, organizer, registration_link, age_group, team_size, status, source)
VALUES
-- 1. 全港中学生辩论赛
(
  '全港中學辯論錦標賽 2026',
  'Hong Kong Secondary Schools Debate Championship 2026',
  '其他',
  '全港最大規模的中學辯論賽事，以隊伍形式參賽，每隊4-6人。比賽分為初賽、複賽、準決賽及決賽四個階段，設有最佳辯論員獎項。',
  'Largest inter-school debate competition in Hong Kong. Teams of 4-6 compete across preliminary, quarter-final, semi-final and final rounds. Best Debater awards available.',
  '2026-09-15',
  '2026-12-20',
  '2026-09-01',
  '港岛',
  '香港大學',
  'University of Hong Kong',
  '免费',
  NULL,
  '冠軍HKD 10,000 + 獎盃',
  'Champion HKD 10,000 + Trophy',
  'HKU Debate Society',
  'https://example.com/hk-debate-2026',
  '青少年',
  '4-6人',
  '报名中',
  'hku-debate'
),
-- 2. 香港校際籃球聯賽
(
  '香港校際籃球聯賽 2026-27',
  'Hong Kong Inter-school Basketball League 2026-27',
  '运动',
  '一年一度的全港中學籃球聯賽，分為男子組及女子組，每隊5-12人。賽季橫跨整個學年，分區比賽後進行全港總決賽。',
  'Annual Hong Kong inter-school basketball league, divided into boys and girls divisions. Teams of 5-12 players compete across the full academic year, with district playoffs leading to territory-wide finals.',
  '2026-10-01',
  '2027-03-31',
  '2026-09-20',
  '九龙',
  '各區體育館',
  'Various District Sports Centres',
  '免费',
  NULL,
  '冠軍獎盃 + 獎牌',
  'Champion Trophy + Medals',
  'HKSSF',
  'https://example.com/hk-bball-2026',
  '青少年',
  '7人以上',
  '报名中',
  'hkssf-basketball'
),
-- 3. CyberPort 創科黑客松
(
  'CyberPort 創科黑客松 2026',
  'CyberPort Tech Hackathon 2026',
  'AI创作',
  '48小時黑客松挑戰！圍繞智慧城市、金融科技及綠色科技三大主題進行開發。每隊2-3人，需提交可運行的原型及路演簡報。',
  '48-hour hackathon challenge! Build solutions around Smart City, FinTech, and GreenTech themes. Teams of 2-3 must deliver a working prototype and pitch presentation.',
  '2026-11-08',
  '2026-11-10',
  '2026-10-25',
  '港岛',
  '數碼港 CyberPort',
  'CyberPort, Pok Fu Lam',
  '免费',
  NULL,
  '冠軍HKD 50,000 + 孵化機會',
  'Champion HKD 50,000 + Incubation Opportunity',
  'CyberPort',
  'https://example.com/cyberport-hack-2026',
  '成人/公开',
  '2-3人',
  '报名中',
  'cyberport-hackathon'
),
-- 4. 香港校際音樂節 — 樂隊賽
(
  '香港校際音樂節 2026 — 樂隊比賽',
  'Hong Kong Schools Music Festival 2026 — Band Competition',
  '音乐表演',
  '第75屆校際音樂節增設樂隊比賽項目，接受各類型樂隊參賽（流行、搖滾、爵士、古典室樂等）。每隊4-6人，需提交5-8分鐘演出曲目。',
  'The 75th Schools Music Festival introduces a band competition category. Open to all band types (pop, rock, jazz, classical chamber). Teams of 4-6 perform a 5-8 minute piece.',
  '2026-11-01',
  '2026-11-30',
  '2026-10-15',
  '九龙',
  '香港文化中心',
  'Hong Kong Cultural Centre',
  '付费',
  'HKD 200/隊',
  '冠軍HKD 8,000 + 錄音合約',
  'Champion HKD 8,000 + Recording Contract',
  'Hong Kong Schools Music and Speech Association',
  'https://example.com/hk-music-fest-2026',
  '不限',
  '4-6人',
  '报名中',
  'hksmsa-band'
),
-- 5. PolyU 電競挑戰賽
(
  'PolyU 電競挑戰賽 2026 — Valorant 5v5',
  'PolyU Esports Challenge 2026 — Valorant 5v5',
  '电竞',
  '理工大學電競學會主辦的Valorant 5v5團隊賽。每隊5名正選 + 最多1名替補。初賽線上進行，四強及決賽在PolyU現場舉行。',
  'PolyU Esports Society presents a Valorant 5v5 team tournament. 5 starters + 1 substitute per team. Preliminary rounds online, semi-finals and finals live at PolyU.',
  '2026-10-20',
  '2026-11-15',
  '2026-10-10',
  '九龙',
  'PolyU 賽馬會創新樓 / 線上',
  'PolyU Jockey Club Innovation Tower / Online',
  '付费',
  'HKD 150/隊',
  '冠軍HKD 15,000 + 電競裝備',
  'Champion HKD 15,000 + Gaming Gear',
  'PolyU Esports Society',
  'https://example.com/polyu-esports-2026',
  '青少年',
  '4-6人',
  '报名中',
  'polyu-esports'
),
-- 6. 香港青年創業計劃路演
(
  '香港青年創業計劃 2026 — 團隊路演賽',
  'Hong Kong Youth Entrepreneurship Program 2026 — Team Pitch',
  '创业路演',
  '為期三個月的創業培訓計劃，最後以團隊路演比賽作結。每隊2-4人提出創業方案，接受評判即場點評。優秀項目有機會獲天使投資。',
  '3-month entrepreneurship training program culminating in a team pitch competition. Teams of 2-4 present startup proposals with live judging. Top projects may receive angel investment.',
  '2026-09-01',
  '2026-11-30',
  '2026-08-20',
  '港岛',
  '會展中心 HKCEC',
  'HKCEC, Wan Chai',
  '免费',
  NULL,
  '種子基金HKD 100,000 + 導師指導',
  'Seed Fund HKD 100,000 + Mentorship',
  'HKYEA',
  'https://example.com/hk-yep-2026',
  '成人/公开',
  '2-3人',
  '报名中',
  'hkyea-pitch'
),
-- 7. 香港國際電影節 — 學生短片創作賽
(
  '香港國際電影節 2026 — 學生短片創作賽',
  'HKIFF 2026 — Student Short Film Competition',
  '创意摄影设计',
  '以2-3人團隊創作5-15分鐘短片，主題為"我眼中的香港"。不限拍攝器材，需提交作品及幕後花絮。得獎作品將在電影節期間公開放映。',
  'Create a 5-15 minute short film in teams of 2-3 on the theme "Hong Kong Through My Eyes". Any filming equipment allowed. Winning entries screened during the festival.',
  '2026-10-01',
  '2026-12-15',
  '2026-09-15',
  '线上',
  '全港取景 / 線上提交',
  'Filming anywhere in HK / Online submission',
  '免费',
  NULL,
  '最佳短片HKD 20,000 + 放映機會',
  'Best Film HKD 20,000 + Screening Opportunity',
  'HKIFF Society',
  'https://example.com/hkiff-short-2026',
  '不限',
  '2-3人',
  '报名中',
  'hkiff-short'
);

-- 确保新建的比赛 registration_deadline 不为 NULL 且在未来，状态正确
UPDATE public.competitions SET status = '报名中' WHERE status IS NULL OR status = '';

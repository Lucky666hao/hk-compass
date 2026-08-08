-- ============================================
-- Posts 社区帖子表
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  content     TEXT NOT NULL CHECK (char_length(content) >= 1),
  category    TEXT NOT NULL DEFAULT '其他' CHECK (category IN ('赛事讨论', '经验分享', '求组队', '其他')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts (category);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);

-- RLS 启用
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 所有人都可以阅读
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (true);

-- 登录用户可以创建
CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 作者可以更新自己的帖子
CREATE POLICY "Authors can update their own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 作者可以删除自己的帖子
CREATE POLICY "Authors can delete their own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
-- ============================================
-- Recruitments 组队招募表
-- ============================================
CREATE TABLE IF NOT EXISTS public.recruitments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id  UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  title           TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description     TEXT NOT NULL CHECK (char_length(description) >= 1),
  team_size       TEXT,
  requirements    TEXT,
  contact         TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_recruitments_created_at ON public.recruitments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruitments_status ON public.recruitments (status);
CREATE INDEX IF NOT EXISTS idx_recruitments_competition ON public.recruitments (competition_id);

-- RLS 启用
ALTER TABLE public.recruitments ENABLE ROW LEVEL SECURITY;

-- 所有人都可以阅读
CREATE POLICY "Recruitments are viewable by everyone"
  ON public.recruitments FOR SELECT
  USING (true);

-- 登录用户可以创建
CREATE POLICY "Authenticated users can create recruitments"
  ON public.recruitments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 作者可以更新自己的招募
CREATE POLICY "Authors can update their own recruitments"
  ON public.recruitments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 作者可以删除自己的招募
CREATE POLICY "Authors can delete their own recruitments"
  ON public.recruitments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
-- ============================================
-- Chat 聊天系统
-- ============================================

-- 会话表
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name        TEXT,  -- group name
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 会话参与者
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 消息表
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL CHECK (char_length(content) >= 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants (user_id);

-- RLS: conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they are in"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participations"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Realtime (Supabase 默认不启用，需要在 Dashboard > Database > Replication 手动开启)
-- 需要开启的表: messages
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- 比赛添加队伍规模字段
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS team_size TEXT DEFAULT NULL
  CHECK (team_size IS NULL OR team_size IN ('个人赛', '2-3人', '4-6人', '7人以上', '不限'));
-- ============================================
-- 用户资料系统
-- ============================================

-- 用户资料表
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio          TEXT DEFAULT '',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles (display_name);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则替换
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 为已有用户补建 profile
INSERT INTO public.profiles (user_id, display_name)
SELECT id, COALESCE(SPLIT_PART(email, '@', 1), 'User')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 好友系统
-- ============================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships (friend_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
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
  '48小時黑客松挑戰！圍繞智慧城市、金融科技及綠色科技三大主題進行開發。每隊2-5人，需提交可運行的原型及路演簡報。',
  '48-hour hackathon challenge! Build solutions around Smart City, FinTech, and GreenTech themes. Teams of 2-5 must deliver a working prototype and pitch presentation.',
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
  '第75屆校際音樂節增設樂隊比賽項目，接受各類型樂隊參賽（流行、搖滾、爵士、古典室樂等）。每隊3-8人，需提交5-8分鐘演出曲目。',
  'The 75th Schools Music Festival introduces a band competition category. Open to all band types (pop, rock, jazz, classical chamber). Teams of 3-8 perform a 5-8 minute piece.',
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
  '3-5人',
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
  '5-6人',
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
  '以2-5人團隊創作5-15分鐘短片，主題為"我眼中的香港"。不限拍攝器材，需提交作品及幕後花絮。得獎作品將在電影節期間公開放映。',
  'Create a 5-15 minute short film in teams of 2-5 on the theme "Hong Kong Through My Eyes". Any filming equipment allowed. Winning entries screened during the festival.',
  '2026-10-01',
  '2026-12-15',
  '2026-09-15',
  '不限',
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

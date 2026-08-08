-- ============================================
-- HK Compass — Supabase Database Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================

-- 1. 比赛类型枚举
CREATE TYPE competition_type AS ENUM (
  '运动',
  '电竞',
  '创意摄影设计',
  'AI创作',
  '创业路演',
  '音乐表演',
  '其他'
);

-- 2. 比赛区域枚举
CREATE TYPE competition_location AS ENUM (
  '港岛',
  '九龙',
  '新界',
  '线上'
);

-- 3. 费用类型枚举
CREATE TYPE competition_fee_type AS ENUM (
  '免费',
  '付费',
  '有奖金'
);

-- 4. 比赛状态枚举
CREATE TYPE competition_status AS ENUM (
  '报名中',
  '即将开始',
  '进行中',
  '已结束'
);

-- 5. 提醒时间枚举
CREATE TYPE remind_before AS ENUM (
  '1小时前',
  '1天前',
  '3天前',
  '1周前'
);

-- ============================================
-- 比赛表
-- ============================================
CREATE TABLE competitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  title_en        TEXT,
  type            competition_type NOT NULL,
  description     TEXT,
  date_start      TIMESTAMPTZ NOT NULL,
  date_end        TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  location        competition_location NOT NULL,
  venue           TEXT,
  fee_type        competition_fee_type NOT NULL DEFAULT '免费',
  fee_amount      TEXT,
  prize           TEXT,
  organizer       TEXT,
  registration_link TEXT,
  source_url       TEXT,
  poster_url      TEXT,
  source          TEXT,
  status          competition_status NOT NULL DEFAULT '报名中',
  view_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_competitions_type       ON competitions(type);
CREATE INDEX idx_competitions_location   ON competitions(location);
CREATE INDEX idx_competitions_fee_type   ON competitions(fee_type);
CREATE INDEX idx_competitions_status     ON competitions(status);
CREATE INDEX idx_competitions_date_start ON competitions(date_start);
CREATE INDEX idx_competitions_created_at ON competitions(created_at DESC);

-- 全文搜索索引 (中英文)
CREATE INDEX idx_competitions_search ON competitions
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(title_en, '') || ' ' || coalesce(description, '')));

-- ============================================
-- 用户收藏比赛表
-- ============================================
CREATE TABLE saved_competitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id  UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, competition_id)
);

CREATE INDEX idx_saved_user ON saved_competitions(user_id);

-- ============================================
-- 用户提醒表
-- ============================================
CREATE TABLE reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id  UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  remind_before   remind_before NOT NULL DEFAULT '1天前',
  notified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, competition_id)
);

CREATE INDEX idx_reminders_user     ON reminders(user_id);
CREATE INDEX idx_reminders_notified ON reminders(notified, remind_before);

-- ============================================
-- 自动更新 updated_at 触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- competitions: 所有人可读，仅管理员可写
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "比赛数据公开可读"
  ON competitions FOR SELECT
  USING (true);

-- saved_competitions: 用户只能操作自己的收藏
ALTER TABLE saved_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的收藏"
  ON saved_competitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可添加收藏"
  ON saved_competitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可删除收藏"
  ON saved_competitions FOR DELETE
  USING (auth.uid() = user_id);

-- reminders: 用户只能操作自己的提醒
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的提醒"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建提醒"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可删除提醒"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 辅助函数
-- ============================================

-- 浏览计数 +1
CREATE OR REPLACE FUNCTION increment_view(competition_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE competitions
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = competition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自动更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 用户资料表 (会员信息)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  is_member BOOLEAN DEFAULT false,
  membership_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人都可以查看资料"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "用户只能修改自己的资料"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的资料"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_member)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 触发器（如果不存在则创建）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- ============================================
-- 评论表
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按比赛查评论
CREATE INDEX IF NOT EXISTS idx_comments_competition ON comments(competition_id, created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 任何人都可以看评论
CREATE POLICY "任何人都可以查看评论"
  ON comments FOR SELECT
  USING (true);

-- 登录用户可以发表评论
CREATE POLICY "登录用户可发表评论"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的评论
CREATE POLICY "用户可删除自己的评论"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

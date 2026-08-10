-- ============================================
-- HK Compass — 社区帖子全面升级 (2026-08-10)
-- P1 投票 + P1 大学标签 + P2 分类 + P2 表情 + P3 收藏 + P4 匿名板块
-- ============================================

-- ============================================
-- P1: 投票系统（Reddit 式赞/踩）
-- ============================================
CREATE TABLE IF NOT EXISTS post_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_votes_post ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user ON post_votes(user_id);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS vote_score INTEGER NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read post_votes" ON post_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated insert own votes" ON post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated update own votes" ON post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated delete own votes" ON post_votes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- P1: 大学/身份标签
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_university BOOLEAN DEFAULT false;

-- ============================================
-- P2: 更细分类/看板（4 → 9 个分类）
-- ============================================
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE posts ADD CONSTRAINT posts_category_check
  CHECK (category IN ('赛事讨论','赛后复盘','赛前热身','经验分享','备赛攻略','求组队','闲聊','求助','大学专区'));

-- ============================================
-- P2: 表情回应（Threads 式 👍👏🔥💡🤔）
-- ============================================
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍','👏','🔥','💡','🤔')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);

-- RLS
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read post_reactions" ON post_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated insert own reactions" ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated delete own reactions" ON post_reactions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- P3: 收藏/保存帖子
-- ============================================
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);

-- RLS
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own saved" ON saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users save posts" ON saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave posts" ON saved_posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- P4: 🕶️ 匿名地下板块
-- ============================================
CREATE TABLE IF NOT EXISTS anonymous_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  category TEXT NOT NULL DEFAULT '吐槽' CHECK (category IN ('吐槽','八卦','争议','深夜')),
  vote_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anon_posts_created ON anonymous_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_posts_category ON anonymous_posts(category);

-- anonymous_posts 的投票和表情（复用相同结构但独立表，因为 post_id 指向 anonymous_posts）
CREATE TABLE IF NOT EXISTS anonymous_post_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_anon_votes_post ON anonymous_post_votes(post_id);

CREATE TABLE IF NOT EXISTS anonymous_post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES anonymous_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍','👏','🔥','💡','🤔')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_anon_reactions_post ON anonymous_post_reactions(post_id);

-- RLS for anonymous tables: public read, authenticated write (but user_id hidden)
ALTER TABLE anonymous_posts ENABLE ROW LEVEL SECURITY;
-- SELECT 时隐藏 user_id 列（通过 view/function 在应用层实现，RLS 只控制行访问）
CREATE POLICY "Public read anonymous_posts" ON anonymous_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated insert anonymous_posts" ON anonymous_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author update anonymous_posts" ON anonymous_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Author delete anonymous_posts" ON anonymous_posts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE anonymous_post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read anonymous votes" ON anonymous_post_votes FOR SELECT USING (true);
CREATE POLICY "Auth insert own anon votes" ON anonymous_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth update own anon votes" ON anonymous_post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Auth delete own anon votes" ON anonymous_post_votes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE anonymous_post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read anonymous reactions" ON anonymous_post_reactions FOR SELECT USING (true);
CREATE POLICY "Auth insert own anon reactions" ON anonymous_post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own anon reactions" ON anonymous_post_reactions FOR DELETE USING (auth.uid() = user_id);

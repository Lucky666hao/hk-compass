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

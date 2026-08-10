-- ============================================
-- 帖子评论系统
-- ============================================

-- 1. 创建 post_comments 表
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引：按帖子+时间排序查询
CREATE INDEX IF NOT EXISTS idx_post_comments_post_time
  ON public.post_comments(post_id, created_at DESC);

-- 2. RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 所有人可读取
CREATE POLICY "post_comments_select" ON public.post_comments
  FOR SELECT USING (true);

-- 登录用户可评论
CREATE POLICY "post_comments_insert" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可删除自己的评论
CREATE POLICY "post_comments_delete" ON public.post_comments
  FOR DELETE USING (auth.uid() = user_id);

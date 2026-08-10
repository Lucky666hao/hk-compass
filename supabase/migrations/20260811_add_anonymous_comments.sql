-- ============================================
-- 匿名帖子评论系统
-- ============================================

CREATE TABLE IF NOT EXISTS public.anonymous_post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.anonymous_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anon_post_comments_time
  ON public.anonymous_post_comments(post_id, created_at DESC);

ALTER TABLE public.anonymous_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_post_comments_select" ON public.anonymous_post_comments
  FOR SELECT USING (true);

CREATE POLICY "anon_post_comments_insert" ON public.anonymous_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anon_post_comments_delete" ON public.anonymous_post_comments
  FOR DELETE USING (auth.uid() = user_id);

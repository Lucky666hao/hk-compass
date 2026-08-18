-- ============================================
-- 地下频道匿名评论内容审核 (2026-08-18)
-- anonymous_post_comments 增加 status 字段 + RLS 屏蔽
-- ============================================

-- 状态：published（正常可见）| hidden（已屏蔽，仅作者/管理员可见）
ALTER TABLE public.anonymous_post_comments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('published', 'hidden'));

-- 屏蔽生效：普通用户只能看到 published 的评论；
-- 作者仍可看到自己的评论（即使被屏蔽），管理员通过 service role 无限制
DROP POLICY IF EXISTS "anon_post_comments_select" ON public.anonymous_post_comments;
CREATE POLICY "anon_post_comments_select"
  ON public.anonymous_post_comments FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);

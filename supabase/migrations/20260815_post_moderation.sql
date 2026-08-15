-- ============================================
-- 社区帖子内容审核 (2026-08-15)
-- 屏蔽/删除：posts 增加 status 字段 + RLS 屏蔽
-- ============================================

-- 状态：published（正常可见）| hidden（已屏蔽，仅作者/管理员可见）
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('published', 'hidden'));

-- 屏蔽生效：普通用户只能看到 published 的帖子；
-- 作者仍可看到自己的帖子（即使被屏蔽），管理员通过 service role 无限制
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);

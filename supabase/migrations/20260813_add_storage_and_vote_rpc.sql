-- ============================================
-- 修复图片上传 + 投票计数 (2026-08-13)
-- 根因：
--   1. 帖子配图上传到 storage bucket `post-images`，但该 bucket 从未创建 → 上传静默失败，图片不显示
--   2. 投票组件调用 `increment_score` RPC 维护 vote_score，但该函数从未创建 → 赞/踩无法持久化到分数
-- ============================================

-- 1. 帖子配图存储 bucket + 公开访问策略
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('post-images', 'post-images', true, false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Post images are publicly viewable" ON storage.objects;
CREATE POLICY "Post images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
CREATE POLICY "Users can upload post images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Users can update own post images" ON storage.objects;
CREATE POLICY "Users can update own post images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-images' AND owner = auth.uid());

-- 2. 投票分数原子增减（供赞/踩按钮调用）
CREATE OR REPLACE FUNCTION public.increment_score(table_name TEXT, row_id UUID, delta INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF table_name = 'posts' THEN
    UPDATE public.posts SET vote_score = vote_score + delta WHERE id = row_id;
  ELSIF table_name = 'anonymous_posts' THEN
    UPDATE public.anonymous_posts SET vote_score = vote_score + delta WHERE id = row_id;
  ELSE
    RAISE EXCEPTION 'invalid table_name: %', table_name;
  END IF;
END;
$$;

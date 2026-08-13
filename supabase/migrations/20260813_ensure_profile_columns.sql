-- ============================================
-- 修复：确保 profiles 扩展列存在 (2026-08-13)
-- ============================================
-- 个人资料保存报「更新失败」的根因：
--   profiles 表缺少 university / show_university / skills /
--   github / website / instagram 这些列。
--   handleSave 一次性更新了这 8 列，Postgres 报
--   "column ... does not exist"，前端吞掉了真实错误只显示「更新失败」。
-- 本迁移全部幂等（ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING），
-- 缺哪列补哪列，重复执行无副作用。
-- ============================================

-- 1. 大学 / 身份标签（原 20260810_community_upgrade.sql）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_university BOOLEAN DEFAULT false;

-- 2. 技能标签 + 社交链接（原 20260811_profile_expansion.sql）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;

-- 3. 头像存储 bucket + 访问策略（原 20260811_profile_expansion.sql）
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('avatars', 'avatars', true, false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;
CREATE POLICY "Users can upload avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

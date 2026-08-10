-- ============================================
-- 个人资料扩展 + 比赛提交 (2026-08-11)
-- ============================================

-- 1. 个人技能标签
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- 2. 社交链接
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram TEXT;

-- 3. 比赛提交者追踪
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. 招募 - 当前已有多少人
ALTER TABLE recruitments ADD COLUMN IF NOT EXISTS current_count INTEGER NOT NULL DEFAULT 0;

-- 5. 头像存储 bucket + 公开访问策略
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('avatars', 'avatars', true, false)
ON CONFLICT (id) DO NOTHING;

-- 允许所有人读取头像
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 允许登录用户上传自己的头像
DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;
CREATE POLICY "Users can upload avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- 允许用户更新/删除自己的头像
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

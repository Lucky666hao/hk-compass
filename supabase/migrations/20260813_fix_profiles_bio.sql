-- ============================================
-- 修复：profiles 表缺 bio 列 + PostgREST schema cache 刷新 (2026-08-13)
-- ============================================
-- 现象：保存资料报
--   "Could not find the 'bio' column of 'profiles' in the schema cache"
-- 原因 A：profiles 表实际缺 bio 列（建表迁移被跳过/用了旧版/被覆盖）。
-- 原因 B：列其实存在，但 PostgREST 的 schema cache 过期，
--   即使列在库里也会报 "not find ... in the schema cache"。
-- 本迁移两种原因一并处理，全部幂等（ADD COLUMN IF NOT EXISTS）。
-- ============================================

-- 1. 补齐基础列（万一建表时漏了）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT 'User';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. 补齐扩展列
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_university BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;

-- 3. 强制 PostgREST 刷新 schema cache（解决 "schema cache" 报错）
NOTIFY pgrst, 'reload schema';

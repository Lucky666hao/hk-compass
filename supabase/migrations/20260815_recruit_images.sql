-- ============================================
-- 组队招募加配图字段 (2026-08-15)
-- ============================================
ALTER TABLE public.recruitments ADD COLUMN IF NOT EXISTS image_urls TEXT[];

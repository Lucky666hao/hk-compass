-- 为比赛表添加英文内容列
-- 在 Supabase SQL Editor 执行

-- 1. 添加英文列
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS prize_en TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS venue_en TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS description_en TEXT;

-- 2. 已有 title_en 列保持不变

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'competitions'
  AND column_name IN ('title_en', 'prize_en', 'venue_en', 'description_en');

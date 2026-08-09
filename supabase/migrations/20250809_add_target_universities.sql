-- 为大学板块添加 target_universities 列
-- 用法：在 Supabase SQL Editor 中执行此文件

-- 1. 添加列（TEXT 数组，存储大学英文缩写）
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS target_universities TEXT[] DEFAULT NULL;

-- 2. 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_competitions_target_universities
ON competitions USING GIN (target_universities);

-- 3. 回填现有数据：根据 title/organizer 匹配大学关键词
-- 注意：跨校比赛会出现在多所大学下

-- HKU
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'HKU')
WHERE (title ILIKE '%HKU%' OR title ILIKE '%港大%' OR title ILIKE '%香港大學%' OR title ILIKE '%香港大学%'
       OR organizer ILIKE '%HKU%' OR organizer ILIKE '%港大%' OR organizer ILIKE '%香港大學%' OR organizer ILIKE '%香港大学%')
  AND NOT ('HKU' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- CUHK
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'CUHK')
WHERE (title ILIKE '%CUHK%' OR title ILIKE '%港中大%' OR title ILIKE '%香港中文大學%' OR title ILIKE '%香港中文大学%'
       OR organizer ILIKE '%CUHK%' OR organizer ILIKE '%港中大%' OR organizer ILIKE '%香港中文大學%' OR organizer ILIKE '%香港中文大学%')
  AND NOT ('CUHK' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- HKUST
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'HKUST')
WHERE (title ILIKE '%HKUST%' OR title ILIKE '%港科大%' OR title ILIKE '%香港科技大學%' OR title ILIKE '%香港科技大学%'
       OR organizer ILIKE '%HKUST%' OR organizer ILIKE '%港科大%' OR organizer ILIKE '%香港科技大學%' OR organizer ILIKE '%香港科技大学%')
  AND NOT ('HKUST' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- CityU
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'CityU')
WHERE (title ILIKE '%CityU%' OR title ILIKE '%城大%' OR title ILIKE '%香港城市大學%' OR title ILIKE '%香港城市大学%'
       OR organizer ILIKE '%CityU%' OR organizer ILIKE '%城大%' OR organizer ILIKE '%香港城市大學%' OR organizer ILIKE '%香港城市大学%')
  AND NOT ('CityU' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- PolyU
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'PolyU')
WHERE (title ILIKE '%PolyU%' OR title ILIKE '%理大%' OR title ILIKE '%香港理工大學%' OR title ILIKE '%香港理工大学%'
       OR organizer ILIKE '%PolyU%' OR organizer ILIKE '%理大%' OR organizer ILIKE '%香港理工大學%' OR organizer ILIKE '%香港理工大学%')
  AND NOT ('PolyU' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- HKBU
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'HKBU')
WHERE (title ILIKE '%HKBU%' OR title ILIKE '%浸大%' OR title ILIKE '%香港浸會大學%' OR title ILIKE '%香港浸会大学%'
       OR organizer ILIKE '%HKBU%' OR organizer ILIKE '%浸大%' OR organizer ILIKE '%香港浸會大學%' OR organizer ILIKE '%香港浸会大学%')
  AND NOT ('HKBU' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- Lingnan
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'Lingnan')
WHERE (title ILIKE '%Lingnan%' OR title ILIKE '%嶺南%' OR title ILIKE '%岭南大学%' OR title ILIKE '%嶺南大學%'
       OR organizer ILIKE '%Lingnan%' OR organizer ILIKE '%嶺南%' OR organizer ILIKE '%岭南大学%' OR organizer ILIKE '%嶺南大學%')
  AND NOT ('Lingnan' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- EdUHK
UPDATE competitions SET target_universities = array_append(COALESCE(target_universities, ARRAY[]::TEXT[]), 'EdUHK')
WHERE (title ILIKE '%EdUHK%' OR title ILIKE '%教大%' OR title ILIKE '%香港教育大學%' OR title ILIKE '%香港教育大学%'
       OR organizer ILIKE '%EdUHK%' OR organizer ILIKE '%教大%' OR organizer ILIKE '%香港教育大學%' OR organizer ILIKE '%香港教育大学%')
  AND NOT ('EdUHK' = ANY(COALESCE(target_universities, ARRAY[]::TEXT[])));

-- 验证
SELECT target_universities, COUNT(*) FROM competitions
WHERE target_universities IS NOT NULL
GROUP BY target_universities
ORDER BY COUNT(*) DESC;

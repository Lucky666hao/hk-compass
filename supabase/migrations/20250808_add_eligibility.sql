-- Migration: 添加 eligibility (报名资格) 字段
-- 用于区分「个人报名」vs「学校提名」vs「两者皆可」
-- 在 Supabase SQL Editor 中执行

-- 1. 添加 eligibility 列
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS eligibility text;

-- 2. 添加 CHECK 约束
ALTER TABLE public.competitions
ADD CONSTRAINT chk_eligibility
CHECK (eligibility IN ('个人报名', '学校提名', '两者皆可', '不限') OR eligibility IS NULL);

-- 3. 已有数据回填：根据标题/描述推断
-- 包含「学界」「校际」「学校提名」关键词 → 学校提名
UPDATE public.competitions
SET eligibility = '学校提名'
WHERE eligibility IS NULL
  AND (title LIKE '%學界%' OR title LIKE '%学界%'
    OR title LIKE '%校際%' OR title LIKE '%校际%'
    OR title LIKE '%聯校%' OR title LIKE '%联校%'
    OR title LIKE '%中學%' OR title LIKE '%中学%'
    OR title LIKE '%小學%' OR title LIKE '%小学%'
    OR description LIKE '%學校提名%' OR description LIKE '%学校提名%'
    OR description LIKE '%經學校%' OR description LIKE '%经学校%'
  );

-- 4. 其余 → 不限
UPDATE public.competitions
SET eligibility = '不限'
WHERE eligibility IS NULL;

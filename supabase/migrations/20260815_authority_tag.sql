-- 权威/含金量标签（管理员人工标注，可空）
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS authority TEXT;

ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_authority_check;
ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_authority_check
  CHECK (authority IS NULL OR authority IN ('官方主办', '高含金量', '国际赛事', '校级认证'));

-- ============================================
-- 比赛审核流程 (2026-08-15)
-- 用户提交比赛 → 管理员审核通过后才对外展示
-- 现有数据（爬虫 + 已有比赛）默认 review_status='approved'，不受影响
-- 全部幂等，可重复执行。
-- ============================================

-- ---------- 审核状态字段 ----------
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------- review_status 枚举约束 ----------
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_review_status_check;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_changes'));

-- ---------- 索引 ----------
CREATE INDEX IF NOT EXISTS idx_competitions_review_status
  ON public.competitions (review_status);

-- ---------- UPDATE 策略：用户可更新自己提交的比赛（编辑重提用） ----------
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.competitions;
CREATE POLICY "Users can update their own submissions"
  ON public.competitions FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());

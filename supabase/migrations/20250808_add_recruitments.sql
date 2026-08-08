-- ============================================
-- Recruitments 组队招募表
-- ============================================
CREATE TABLE IF NOT EXISTS public.recruitments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id  UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  title           TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description     TEXT NOT NULL CHECK (char_length(description) >= 1),
  team_size       TEXT,
  requirements    TEXT,
  contact         TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_recruitments_created_at ON public.recruitments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruitments_status ON public.recruitments (status);
CREATE INDEX IF NOT EXISTS idx_recruitments_competition ON public.recruitments (competition_id);

-- RLS 启用
ALTER TABLE public.recruitments ENABLE ROW LEVEL SECURITY;

-- 所有人都可以阅读
CREATE POLICY "Recruitments are viewable by everyone"
  ON public.recruitments FOR SELECT
  USING (true);

-- 登录用户可以创建
CREATE POLICY "Authenticated users can create recruitments"
  ON public.recruitments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 作者可以更新自己的招募
CREATE POLICY "Authors can update their own recruitments"
  ON public.recruitments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 作者可以删除自己的招募
CREATE POLICY "Authors can delete their own recruitments"
  ON public.recruitments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

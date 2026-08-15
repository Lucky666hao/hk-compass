-- ============================================
-- 比赛纠错举报表 (2026-08-15)
-- competition_reports — 用户对比赛信息纠错/过期举报
-- reason: wrong_info(信息有误) / expired(已过期) / duplicate(重复) / other(其他)
-- ============================================

CREATE TABLE IF NOT EXISTS public.competition_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, competition_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_reports_comp ON public.competition_reports (competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_reports_status ON public.competition_reports (status);

ALTER TABLE public.competition_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated insert own report" ON public.competition_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Authenticated read own report" ON public.competition_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

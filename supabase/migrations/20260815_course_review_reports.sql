-- ============================================
-- 课程评价举报表 (2026-08-15)
-- course_review_reports — 学生社区课程评价的举报
-- ============================================

CREATE TABLE IF NOT EXISTS public.course_review_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.course_reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_course_review_reports_review ON public.course_review_reports (review_id);
CREATE INDEX IF NOT EXISTS idx_course_review_reports_status ON public.course_review_reports (status);

ALTER TABLE public.course_review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated insert own report" ON public.course_review_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Authenticated read own report" ON public.course_review_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

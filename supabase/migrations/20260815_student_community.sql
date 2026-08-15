-- ============================================
-- 学生社区板块 (2026-08-15)
-- posts/recruitments 加大学归属字段 + course_reviews 课程评价表
-- ============================================

-- 1. posts 加大学归属字段（university_slug 存小写 slug，如 'hku'；null = 全港通用）
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS university_slug TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS faculty TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_university ON public.posts (university_slug);

-- 2. recruitments 加大学归属字段（null = 现有比赛组队，向后兼容）
ALTER TABLE public.recruitments ADD COLUMN IF NOT EXISTS university_slug TEXT;
ALTER TABLE public.recruitments ADD COLUMN IF NOT EXISTS faculty TEXT;
CREATE INDEX IF NOT EXISTS idx_recruitments_university ON public.recruitments (university_slug);

-- 3. course_reviews 课程/老师评价表（带审核状态，复用 posts 的 published/hidden 机制）
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_slug TEXT NOT NULL,
  course_code TEXT,                 -- 如 COMP101（可选）
  course_name TEXT NOT NULL CHECK (char_length(course_name) >= 1 AND char_length(course_name) <= 200),
  professor_name TEXT,              -- 老师名
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),      -- 总体评分
  difficulty SMALLINT CHECK (difficulty BETWEEN 1 AND 5),       -- 难度
  workload SMALLINT CHECK (workload BETWEEN 1 AND 5),           -- 工作量
  comment TEXT,                     -- 文字评价
  is_anonymous BOOLEAN NOT NULL DEFAULT true,                   -- 默认匿名
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_reviews_uni ON public.course_reviews (university_slug, created_at DESC);

-- RLS
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published reviews" ON public.course_reviews FOR SELECT USING (status = 'published');
CREATE POLICY "Authenticated insert own reviews" ON public.course_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author update own reviews" ON public.course_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author delete own reviews" ON public.course_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

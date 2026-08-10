-- ============================================
-- 批量升级: 通知 + 举报 + 图片
-- ============================================

-- 0. 帖子配图列
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 1. 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment','reply','vote','reaction','report_resolved')),
  message TEXT NOT NULL,
  link TEXT,
  related_post_id UUID,
  related_comment_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- 2. 举报表
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','violence','other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON public.post_reports(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reports_unique ON public.post_reports(reporter_id, post_id);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_reports_insert" ON public.post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
-- Only admins can view/update reports (using service_role key, no public read)

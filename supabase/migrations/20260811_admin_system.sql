-- ============================================
-- 管理员后台系统 (2026-08-11)
-- ============================================

-- 1. 管理员角色
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. 页面访问记录
CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  session_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);

-- 3. 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: 公告 — 任何人可读已发布，写入走 service_role API
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published announcements" ON announcements;
CREATE POLICY "Anyone can read published announcements"
  ON announcements FOR SELECT
  USING (is_published = true);

-- RLS: page_views — 任何人可 INSERT（匿名追踪），仅 admin 可 SELECT
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert page_views" ON page_views;
CREATE POLICY "Anyone can insert page_views"
  ON page_views FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read page_views" ON page_views;
CREATE POLICY "Admins can read page_views"
  ON page_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ));

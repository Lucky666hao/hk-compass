-- ============================================
-- 比赛默认审核状态改为 pending (2026-08-16)
-- 根因：爬虫 insert 不写 review_status，旧默认值 'approved' 导致自动上线
-- 改为 'pending' 后，任何漏写 review_status 的新数据都进审核队列，而非直接上线
-- ============================================

ALTER TABLE public.competitions
  ALTER COLUMN review_status SET DEFAULT 'pending';

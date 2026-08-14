-- 个性化关注推送：偏好存 DB + 通知类型扩展
-- ① 用户偏好存到 profiles（跨设备同步 + 审核通过时按偏好匹配推送）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB;

-- ② 通知类型扩展（加 'competition_match'）
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('comment','reply','vote','reaction','report_resolved','chat','competition_match'));

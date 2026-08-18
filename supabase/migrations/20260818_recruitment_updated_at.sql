-- ============================================
-- 组队招募 updated_at 自动更新 (2026-08-18)
-- 用于后台「久未更新」提示：有人更新招募（人数/状态/内容）时刷新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recruitments_touch ON public.recruitments;
CREATE TRIGGER recruitments_touch
  BEFORE UPDATE ON public.recruitments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

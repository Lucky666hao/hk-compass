-- ============================================================
-- 比赛数据质量保障：数据库触发器 + Cron 日志表
-- 执行方式：Supabase SQL Editor 直接运行此文件
-- ============================================================

-- 1. Cron 执行日志表
CREATE TABLE IF NOT EXISTS cron_logs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'warn')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_logs(job_name, created_at DESC);

-- 2. 自动关闭过期比赛触发器
CREATE OR REPLACE FUNCTION before_competition_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果报名截止日期或比赛结束日期已过，自动标记为"已结束"
  -- 这确保无论数据以何种方式写入（表单/API/爬虫/SQL），过期比赛永远不会显示为"报名中"
  IF (NEW.registration_deadline IS NOT NULL AND NEW.registration_deadline < NOW())
     OR (NEW.date_end IS NOT NULL AND NEW.date_end < NOW()) THEN
    NEW.status := '已结束';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）后重建
DROP TRIGGER IF EXISTS trg_before_competition_change ON competitions;

CREATE TRIGGER trg_before_competition_change
  BEFORE INSERT OR UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION before_competition_change();

-- 验证：插入一条测试数据后自动回滚
-- INSERT INTO competitions (title, type, date_start, location, fee_type, status, registration_deadline)
-- VALUES ('_test_trigger', '其他', NOW(), '线上', '免费', '报名中', '2020-01-01');
-- SELECT status FROM competitions WHERE title = '_test_trigger'; -- 应显示 '已结束'
-- DELETE FROM competitions WHERE title = '_test_trigger';

-- 比赛添加队伍规模字段
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS team_size TEXT DEFAULT NULL
  CHECK (team_size IS NULL OR team_size IN ('个人赛', '2-3人', '4-6人', '7人以上', '不限'));

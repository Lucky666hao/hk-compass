-- ============================================
-- 修复 target_universities 大小写 (2026-11-17)
-- 旧迁移 20250809_add_target_universities.sql 曾用混合大小写 'CityU'/'PolyU'/'Lingnan'/'EdUHK'，
-- 但 /uni 页面用 slug.toUpperCase() 比较，需全大写 ('CITYU'/'POLYU'/'LINGNAN'/'EDUHK')。
-- 本迁移把现有数据中所有非全大写元素统一转为大写；幂等、安全（无需要修正的行时零影响）。
-- 在 Supabase SQL Editor 手动执行即可。
-- ============================================

UPDATE competitions
SET target_universities = (
  SELECT array_agg(upper(u) ORDER BY ord)
  FROM unnest(target_universities) WITH ORDINALITY AS t(u, ord)
)
WHERE target_universities IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(target_universities) AS u WHERE u <> upper(u)
  );

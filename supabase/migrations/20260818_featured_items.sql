-- ============================================
-- 首页推荐位（Featured）— 轮播推荐 / 广告位 (2026-08-18)
-- ============================================

CREATE TABLE IF NOT EXISTS public.featured_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE, -- 关联比赛；null = 纯广告位
  title TEXT,              -- 覆盖标题；为空则用比赛标题
  subtitle TEXT,           -- 副标题 / 广告语
  image_url TEXT,          -- 横幅图片 URL；为空则用比赛海报或渐变兜底
  link_url TEXT,           -- 自定义跳转链接；为空则跳比赛详情
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_sort ON public.featured_items (sort_order, created_at);

ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;

-- 公开只读（仅生效的推荐位）
DROP POLICY IF EXISTS "Public read active featured" ON public.featured_items;
CREATE POLICY "Public read active featured" ON public.featured_items
  FOR SELECT USING (active = true);

-- 写操作不授权给普通用户，仅管理员通过 service role 管理（RLS 默认 deny）

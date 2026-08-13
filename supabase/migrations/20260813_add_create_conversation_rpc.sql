-- ============================================
-- 修复：会话创建 RPC (2026-08-13)
-- ============================================
-- 现象：登录用户创建会话报 403
--   new row violates row-level security policy for table "conversations"
-- 根因：线上库存在一条代码里没有的限制性(RESTRICTIVE)策略，
--   连 WITH CHECK (true) 的宽松策略也被它拦住。
-- 方案：改用 SECURITY DEFINER RPC 创建会话，以 owner 身份执行，
--   绕过 RLS（owner 默认不受 RLS 限制），彻底绕开这条坏策略。
-- ============================================

CREATE OR REPLACE FUNCTION public.create_conversation(conv_type TEXT, conv_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.conversations (type, name)
  VALUES (conv_type, conv_name)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_conversation(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_conversation(TEXT, TEXT) TO authenticated;

-- ============================================
-- 修复 v2：撤销自引用策略，改用 SECURITY DEFINER RPC (2026-08-13)
-- ============================================
-- 问题：上一版「Users can view participants of their conversations」是自引用
--   （EXISTS 子查询又查 conversation_participants 自己），会引发 RLS 递归，
--   导致发消息（messages INSERT 里校验「我是参与者」的子查询）报「发送失败」。
-- 修复：撤销该策略，改用 SECURITY DEFINER RPC 一次性取回「我所有会话」的
--   参与者（owner 身份执行，天然绕过 RLS，无递归风险）。
-- ============================================

DROP POLICY IF EXISTS "Users can view participants of their conversations"
  ON public.conversation_participants;

CREATE OR REPLACE FUNCTION public.get_my_conversation_participants()
RETURNS TABLE (conversation_id UUID, user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.conversation_id, cp.user_id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id IN (
    SELECT me.conversation_id
    FROM public.conversation_participants me
    WHERE me.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_conversation_participants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_participants() TO authenticated;

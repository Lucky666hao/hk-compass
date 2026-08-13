-- ============================================
-- 修复：聊天系统 RLS + 重复私聊 + 实时消息 (2026-08-13)
-- ============================================
-- 问题 1：conversations 的 INSERT 策略缺失/错误，登录用户无法创建会话。
-- 问题 2：startDM 检查「是否已有 DM」时，被 conversation_participants 的
--         RLS（只能看自己的记录）挡住，查不到对方 → 每次重复建 DM。
-- 问题 3：messages 未加入 supabase_realtime 发布，实时刷新不生效。
-- 本迁移全部幂等，重复执行无副作用。
-- ============================================

-- ---------- 1. conversations INSERT 策略 ----------
-- 删掉所有 INSERT / ALL 策略（不管名字）
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.conversations', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---------- 2. conversation_participants INSERT 策略 ----------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_participants'
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.conversation_participants', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can add members to conversations"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---------- 3. 查已有私聊的 RPC（SECURITY DEFINER 绕过 RLS） ----------
CREATE OR REPLACE FUNCTION public.find_direct_conversation(target UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp1.conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
  JOIN public.conversations c
    ON c.id = cp1.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = target
    AND c.type = 'direct'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_direct_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_direct_conversation(UUID) TO authenticated;

-- ---------- 4. 启用 messages 实时 ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

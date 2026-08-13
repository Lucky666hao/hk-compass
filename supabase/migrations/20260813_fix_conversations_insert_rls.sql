-- ============================================
-- 修复：会话创建 RLS (2026-08-13)
-- ============================================
-- 报错：
--   new row violates row-level security policy for table "conversations"
-- 根因：conversations 表的 INSERT 策略缺失/内容错误，
--   登录用户无法插入新会话（DM 和群组的第一步都卡在这）。
-- 本迁移幂等：先删掉目标表上所有 INSERT 策略（不管名字），
--   再重建一条 WITH CHECK (true) 的宽松策略。
-- ============================================

-- 1. 清掉 conversations 上所有 INSERT 策略
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.conversations', pol.policyname);
  END LOOP;
END $$;

-- 2. 重建：任何登录用户都能创建会话
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. 清掉 conversation_participants 上所有 INSERT 策略
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_participants'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.conversation_participants', pol.policyname);
  END LOOP;
END $$;

-- 4. 重建：允许把对方加进会话（否则 DM/群组加不了别人）
CREATE POLICY "Users can add members to conversations"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

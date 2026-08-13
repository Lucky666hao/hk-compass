-- ============================================
-- 修复：看不到会话里对方的名字/头像 (2026-08-13)
-- ============================================
-- 现象：发起私聊后，会话列表只显示「用户」，不显示对方名字/头像。
-- 根因：conversation_participants 的 SELECT 策略
--   「Users can view their own participations」只允许 user_id = auth.uid()，
--   导致前端拉取会话参与者时只能看到自己，查不到对方 → 名字回退成「用户」。
-- 修复：新增一条宽松策略，允许查看「自己所在会话」里的所有参与者。
--   安全：只能看自己已经加入的会话的成员，看不到无关会话。
-- ============================================

CREATE POLICY "Users can view participants of their conversations"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

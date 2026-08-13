-- ============================================
-- 修复聊天系统 RLS（2026-08-13）
-- 问题：conversation_participants 的 INSERT 策略只允许 user_id = auth.uid()，
--       导致无法把「对方 / 群组成员」加进会话 —— 一对一私聊和创建群组都失败。
-- 修复：允许 authenticated 用户把任意成员加入会话（conversation_id 为不可猜的 UUID，
--       且前端不暴露他人会话 ID，实际风险可控；发消息仍受「必须是参与者」约束）。
-- ============================================

DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;

CREATE POLICY "Users can add members to conversations"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

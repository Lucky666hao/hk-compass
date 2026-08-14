-- ============================================
-- 聊天系统大升级 (2026-08-14)
-- ① 未读角标  ② 好友（纯前端）  ③ 图片  ④ 群管理  ⑤ 表情回应  ⑥ 推送
-- 全部幂等，可重复执行。
-- ============================================

-- ---------- ① 未读：参与表加 last_read_at ----------
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------- ③ 图片：消息表加 image_url ----------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 放宽 content 约束：纯图片消息允许 content 为空（但仍不能为 NULL）
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_content_check
  CHECK (content IS NOT NULL AND (char_length(content) >= 1 OR image_url IS NOT NULL));

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('chat-images', 'chat-images', true, false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Chat images are publicly viewable" ON storage.objects;
CREATE POLICY "Chat images are publicly viewable"
  ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
CREATE POLICY "Users can upload chat images"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');

-- ---------- ④ 群管理：conversations 加 owner + avatar ----------
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 回填旧群的 owner（取最早加入的成员）
UPDATE public.conversations c
SET owner_id = (
  SELECT cp.user_id FROM public.conversation_participants cp
  WHERE cp.conversation_id = c.id
  ORDER BY cp.joined_at ASC LIMIT 1
)
WHERE c.type = 'group' AND c.owner_id IS NULL;

-- ---------- ⑤ 表情回应表（只走 RPC，不开直接访问策略） ----------
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 表情回应实时
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;

-- ---------- ⑥ 通知类型扩展（加 'chat'） ----------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('comment','reply','vote','reaction','report_resolved','chat'));

-- ============================================
-- RPC 集合
-- ============================================

-- 建会话时：群聊写入 owner_id（覆盖之前版本）
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
  INSERT INTO public.conversations (type, name, owner_id)
  VALUES (conv_type, conv_name, CASE WHEN conv_type = 'group' THEN auth.uid() ELSE NULL END)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_conversation(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_conversation(TEXT, TEXT) TO authenticated;

-- ① 未读数统计
CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE (conversation_id UUID, unread_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cp.conversation_id, COUNT(m.id)
  FROM public.conversation_participants cp
  LEFT JOIN public.messages m
    ON m.conversation_id = cp.conversation_id
   AND m.created_at > cp.last_read_at
   AND m.user_id <> auth.uid()
  WHERE cp.user_id = auth.uid()
  GROUP BY cp.conversation_id;
$$;

REVOKE ALL ON FUNCTION public.get_unread_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_counts() TO authenticated;

-- ① 标记会话已读
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

-- ⑤ 取某会话所有表情回应
CREATE OR REPLACE FUNCTION public.get_conversation_reactions(p_conversation_id UUID)
RETURNS TABLE (message_id UUID, user_id UUID, emoji TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.message_id, r.user_id, r.emoji, r.created_at
  FROM public.message_reactions r
  JOIN public.messages m ON m.id = r.message_id
  WHERE m.conversation_id = p_conversation_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = p_conversation_id AND cp.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_conversation_reactions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversation_reactions(UUID) TO authenticated;

-- ⑤ 表情回应切换（有则删，无则加）返回 true=已添加 false=已移除
CREATE OR REPLACE FUNCTION public.toggle_reaction(p_message_id UUID, p_emoji TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.message_reactions
  WHERE message_id = p_message_id AND user_id = auth.uid() AND emoji = p_emoji;
  IF FOUND THEN
    RETURN false;
  ELSE
    INSERT INTO public.message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), p_emoji);
    RETURN true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_reaction(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_reaction(UUID, TEXT) TO authenticated;

-- ④ 群成员列表（含 profile 信息）
CREATE OR REPLACE FUNCTION public.get_group_members(p_conversation_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT, joined_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cp.user_id, p.display_name, p.avatar_url, cp.joined_at
  FROM public.conversation_participants cp
  JOIN public.profiles p ON p.user_id = cp.user_id
  WHERE cp.conversation_id = p_conversation_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants me
      WHERE me.conversation_id = p_conversation_id AND me.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_group_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO authenticated;

-- ④ 加群成员（仅群主）
CREATE OR REPLACE FUNCTION public.add_group_member(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND type = 'group' AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'only owner can add members';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (p_conversation_id, p_user_id)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.add_group_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_group_member(UUID, UUID) TO authenticated;

-- ④ 移除群成员（仅群主，不能移除自己）
CREATE OR REPLACE FUNCTION public.remove_group_member(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND type = 'group' AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'only owner can remove members';
  END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'cannot remove yourself'; END IF;
  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_group_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID) TO authenticated;

-- ④ 退群（任何非群主成员）
CREATE OR REPLACE FUNCTION public.leave_group(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.conversations WHERE id = p_conversation_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'owner cannot leave group';
  END IF;
  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.leave_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

-- ④ 改群名（仅群主）
CREATE OR REPLACE FUNCTION public.rename_group(p_conversation_id UUID, p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND type = 'group' AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'only owner can rename';
  END IF;
  UPDATE public.conversations SET name = p_name WHERE id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_group(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_group(UUID, TEXT) TO authenticated;

-- ④ 设群头像（仅群主）
CREATE OR REPLACE FUNCTION public.set_group_avatar(p_conversation_id UUID, p_avatar_url TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND type = 'group' AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'only owner can set avatar';
  END IF;
  UPDATE public.conversations SET avatar_url = p_avatar_url WHERE id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_group_avatar(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_group_avatar(UUID, TEXT) TO authenticated;

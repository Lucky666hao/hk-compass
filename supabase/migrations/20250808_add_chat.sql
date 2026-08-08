-- ============================================
-- Chat 聊天系统
-- ============================================

-- 会话表
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name        TEXT,  -- group name
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 会话参与者
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 消息表
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL CHECK (char_length(content) >= 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants (user_id);

-- RLS: conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they are in"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participations"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves to conversations"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Realtime (Supabase 默认不启用，需要在 Dashboard > Database > Replication 手动开启)
-- 需要开启的表: messages
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

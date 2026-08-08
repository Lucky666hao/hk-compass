'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLocale } from '@/i18n/LanguageContext'
import { t, type Locale } from '@/i18n/translations'
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  ArrowLeft,
  Users,
  UserPlus,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

// ============================================
// 聊天主页面
// ============================================
export default function ChatPage() {
  const { locale } = useLocale()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  // 会话列表
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)

  // 搜索/新建
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searching, setSearching] = useState(false)

  // 移动端视图切换
  const [view, setView] = useState<'list' | 'chat'>('list')

  // 登录检查
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setSessionLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 加载会话列表
  const loadConversations = useCallback(async () => {
    if (!userId) return
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (!parts?.length) {
      setConversations([])
      setConvLoading(false)
      return
    }

    const convIds = parts.map((p) => p.conversation_id)
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('created_at', { ascending: false })

    if (!convs?.length) {
      setConversations([])
      setConvLoading(false)
      return
    }

    // 获取每个会话的参与者邮箱和最后消息
    const enriched = await Promise.all(
      convs.map(async (conv) => {
        // 参与者
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)

        // 找另一个用户的邮箱（DM场景）
        let otherUserEmail: string | null = null
        if (conv.type === 'direct' && participants) {
          const otherId = participants.find((p) => p.user_id !== userId)?.user_id
          if (otherId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', otherId)
              .single()
            otherUserEmail = profile?.email ?? null
          }
          if (!otherUserEmail && otherId) {
            // 用 auth.users 兜底
            const { data: { user } } = await supabase.auth.admin.getUserById(otherId)
            otherUserEmail = user?.email ?? null
          }
        }

        // 最后消息
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...conv,
          other_user_email: otherUserEmail,
          last_message: lastMsg?.content ?? null,
          last_message_at: lastMsg?.created_at ?? null,
        } as Conversation
      })
    )

    setConversations(enriched)
    setConvLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) loadConversations()
  }, [userId, loadConversations])

  // 新建 DM
  const startDM = async (targetEmail: string) => {
    if (!userId) return
    setSearching(true)

    // 通过 email 找用户（用 profiles 表）
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', targetEmail.trim().toLowerCase())
      .limit(1)

    const targetId = profiles?.[0]?.id
    if (!targetId) {
      toast.error(locale === 'en' ? 'User not found' : locale === 'zh-HK' ? '搵唔到用戶' : '未找到用户')
      setSearching(false)
      return
    }
    if (targetId === userId) {
      toast.error(locale === 'en' ? 'Cannot chat with yourself' : locale === 'zh-HK' ? '唔可以同自己傾偈' : '不能和自己聊天')
      setSearching(false)
      return
    }

    // 检查是否已有 DM 会话
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (myConvs) {
      for (const mc of myConvs) {
        const { data: other } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('conversation_id', mc.conversation_id)
          .eq('user_id', targetId)
          .limit(1)

        if (other?.length) {
          // 已有会话，直接打开
          const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', mc.conversation_id)
            .eq('type', 'direct')
            .single()

          if (conv) {
            setActiveConvId(conv.id)
            setShowNewChat(false)
            setSearchEmail('')
            setSearching(false)
            setView('chat')
            return
          }
        }
      }
    }

    // 新建 DM 会话
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single()

    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: userId },
        { conversation_id: newConv.id, user_id: targetId },
      ])
      loadConversations()
      setActiveConvId(newConv.id)
      setShowNewChat(false)
      setSearchEmail('')
      setView('chat')
    }
    setSearching(false)
  }

  // 已登录且没在加载
  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-[60vh] rounded-xl" />
      </div>
    )
  }

  // 未登录
  if (!userId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t(locale, 'posts.login_prompt')}</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            {locale === 'en'
              ? 'Chat with other competitors, organizers, and teammates in real time.'
              : locale === 'zh-HK'
              ? '同其他參賽者、主辦方同隊友即時傾偈。'
              : '与其他参赛者、主办方和队友实时聊天。'}
          </p>
          <Button onClick={() => router.push('/auth/login?redirect=/chat')}>
            {t(locale, 'saved.login_btn')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 lg:py-6">
      <div className="flex h-[calc(100vh-7rem)] lg:h-[calc(100vh-5rem)] border rounded-xl overflow-hidden bg-background">
        {/* ============ 左侧会话列表 ============ */}
        <div className={`${
          view === 'chat' ? 'hidden' : 'flex'
        } lg:flex w-full lg:w-80 flex-col border-r shrink-0`}>
          {/* 列表顶部 */}
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-violet-500" />
              {t(locale, 'chat.title')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowNewChat(!showNewChat)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 新建聊天面板 */}
          {showNewChat && (
            <div className="p-3 border-b space-y-2 bg-muted/30">
              <div className="flex gap-1.5">
                <Input
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder={t(locale, 'chat.search_users') as string}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchEmail.trim()) startDM(searchEmail.trim())
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => searchEmail.trim() && startDM(searchEmail.trim())}
                  disabled={searching || !searchEmail.trim()}
                >
                  {searching ? <span className="animate-pulse">...</span> : <UserPlus className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {locale === 'en'
                  ? 'Enter email to start a direct chat'
                  : locale === 'zh-HK'
                  ? '輸入電郵開始一對一傾偈'
                  : '输入邮箱开始一对一聊天'}
              </p>
            </div>
          )}

          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t(locale, 'chat.empty')}</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {conversations.map((conv) => {
                  const isActive = conv.id === activeConvId
                  const displayName =
                    conv.type === 'group'
                      ? conv.name
                      : conv.other_user_email?.split('@')[0] ?? locale === 'en' ? 'Chat' : '聊天'
                  const initials = displayName?.slice(0, 2).toUpperCase() ?? 'CH'

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id)
                        setView('chat')
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center gap-2.5 ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`text-xs ${isActive ? 'bg-primary/20' : 'bg-muted-foreground/10'}`}>
                          {conv.type === 'group' ? <Users className="h-3.5 w-3.5" /> : initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{displayName}</span>
                          {conv.last_message_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                              {format(new Date(conv.last_message_at), 'MM/dd')}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============ 右侧聊天窗口 ============ */}
        <div className={`${
          view === 'list' ? 'hidden' : 'flex'
        } lg:flex flex-1 flex-col min-w-0`}>
          {activeConvId ? (
            <ChatWindow
              conversationId={activeConvId}
              userId={userId}
              locale={locale}
              conversations={conversations}
              onBack={() => setView('list')}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {locale === 'en'
                    ? 'Select a conversation or start a new one'
                    : locale === 'zh-HK'
                    ? '選擇一個對話或者開始新嘅'
                    : '选择一个对话或开始新的'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 聊天窗口子组件
// ============================================
function ChatWindow({
  conversationId,
  userId,
  locale,
  conversations,
  onBack,
}: {
  conversationId: string
  userId: string
  locale: Locale
  conversations: Conversation[]
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const conv = conversations.find((c) => c.id === conversationId)
  const displayName =
    conv?.type === 'group'
      ? conv.name
      : conv?.other_user_email?.split('@')[0] ?? 'Chat'

  // 加载历史消息
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      setMessages((data as Message[]) ?? [])
      setLoading(false)
    }
    loadMessages()

    // Realtime 订阅
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      content: input.trim(),
    })
    setSending(false)
    if (!error) {
      setInput('')
    } else {
      toast.error(locale === 'en' ? 'Send failed' : '发送失败')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部条 */}
      <div className="flex items-center gap-2 p-3 border-b shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden p-1 -ml-1 hover:bg-muted rounded"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-violet-500/10">
            {conv?.type === 'group' ? <Users className="h-3 w-3" /> : displayName?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate">{displayName}</span>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-10 rounded-lg w-2/3 ${i % 2 === 0 ? 'ml-auto' : ''}`}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
            {t(locale, 'chat.no_messages') as string}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === userId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <span
                    className={`text-[10px] mt-0.5 block ${
                      isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    }`}
                  >
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="p-3 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(locale, 'chat.type_placeholder') as string}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

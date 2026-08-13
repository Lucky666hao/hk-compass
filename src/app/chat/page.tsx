'use client'

import { Fragment, useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLocale } from '@/i18n/LanguageContext'
import { t, type Locale } from '@/i18n/translations'
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  ArrowLeft,
  Users,
  X,
  Check,
} from 'lucide-react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { toast } from 'sonner'

// ============================================
// 工具函数
// ============================================
function initialsOf(name?: string | null) {
  const s = (name || '').trim()
  return s ? s.slice(0, 2).toUpperCase() : '?'
}

function listTime(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  return format(d, 'MM/dd')
}

function dayLabel(iso: string, locale: Locale) {
  const d = new Date(iso)
  if (isToday(d)) return t(locale, 'chat.today')
  if (isYesterday(d)) return t(locale, 'chat.yesterday')
  return format(d, 'yyyy/MM/dd')
}

// ============================================
// 聊天主页面
// ============================================
export default function ChatPage() {
  const { locale } = useLocale()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [convFilter, setConvFilter] = useState('')

  const [view, setView] = useState<'list' | 'chat'>('list')

  // 新建聊天（弹窗）
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatMode, setNewChatMode] = useState<'direct' | 'group'>('direct')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([])
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)

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
  const loadConversations = useCallback(async (silent = false) => {
    if (!userId) return
    if (!silent) setConvLoading(true)

    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (!parts?.length) {
      setConversations([])
      if (!silent) setConvLoading(false)
      return
    }

    const convIds = parts.map((p) => p.conversation_id)

    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)

    // 一次拉取所有会话的参与者（修复后可见对方）
    const { data: allParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)

    // 一次拉取所有参与者的资料（名字 + 头像）
    const allUserIds = [...new Set((allParts ?? []).map((p) => p.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', allUserIds)

    const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
    ;(profiles ?? []).forEach((p) => {
      profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }
    })

    const enriched = await Promise.all(
      (convs ?? []).map(async (conv) => {
        const members = (allParts ?? []).filter((p) => p.conversation_id === conv.id)
        const otherMembers = members.filter((m) => m.user_id !== userId)

        let displayName: string
        let avatar: string | null = null
        let memberAvatars: string[] = []

        if (conv.type === 'group') {
          displayName = conv.name || (locale === 'en' ? 'Group' : '群组')
          memberAvatars = otherMembers
            .slice(0, 3)
            .map((m) => profileMap[m.user_id]?.avatar_url)
            .filter((a): a is string => !!a)
        } else {
          const other = otherMembers[0]
          const p = other ? profileMap[other.user_id] : undefined
          displayName = p?.display_name || (locale === 'en' ? 'User' : '用户')
          avatar = p?.avatar_url ?? null
        }

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          ...conv,
          last_message: lastMsg?.content ?? null,
          last_message_at: lastMsg?.created_at ?? null,
          other_user_id: otherMembers[0]?.user_id ?? null,
          other_user_name: displayName,
          other_user_avatar: avatar,
          member_count: members.length,
          member_avatars: memberAvatars,
        } as Conversation
      })
    )

    // 按最近消息时间排序
    enriched.sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime()
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime()
      return tb - ta
    })

    setConversations(enriched)
    if (!silent) setConvLoading(false)
  }, [userId, locale])

  useEffect(() => {
    if (userId) loadConversations()
  }, [userId, loadConversations])

  // 实时刷新：有新消息时更新会话列表
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('conversation-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, loadConversations])

  // 搜索用户（按显示名称）
  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return
    setSearching(true)
    setHasSearched(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', userId)
      .ilike('display_name', `%${searchQuery.trim()}%`)
      .limit(10)
    setSearching(false)
    if (error) {
      toast.error((locale === 'en' ? 'Search failed: ' : '搜索失败：') + error.message)
      setSearchResults([])
      return
    }
    setSearchResults((data as Profile[]) ?? [])
  }

  // 打开新建聊天弹窗
  const openNewChat = () => {
    setShowNewChat(true)
    setNewChatMode('direct')
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setSelectedMembers([])
    setGroupName('')
  }

  // 开始一对一聊天
  const startDM = async (targetProfile: Profile) => {
    if (!userId) return

    // 是否已有 DM（SECURITY DEFINER RPC）
    const { data: existingConvId } = await supabase
      .rpc('find_direct_conversation', { target: targetProfile.user_id })

    if (existingConvId) {
      setActiveConvId(existingConvId)
      setShowNewChat(false)
      setView('chat')
      return
    }

    // 新建 DM（SECURITY DEFINER RPC）
    const { data: newConvId, error: convErr } = await supabase
      .rpc('create_conversation', { conv_type: 'direct' })

    if (convErr) {
      toast.error((locale === 'en' ? 'Failed to create chat: ' : '创建会话失败：') + convErr.message)
      return
    }

    if (newConvId) {
      const { error: partErr } = await supabase.from('conversation_participants').insert([
        { conversation_id: newConvId, user_id: userId },
        { conversation_id: newConvId, user_id: targetProfile.user_id },
      ])
      if (partErr) {
        toast.error((locale === 'en' ? 'Failed to add member: ' : '添加成员失败：') + partErr.message)
        return
      }
      loadConversations()
      setActiveConvId(newConvId)
      setShowNewChat(false)
      setView('chat')
    }
  }

  // 创建群组
  const createGroup = async () => {
    if (!userId || selectedMembers.length === 0) return
    setCreating(true)

    const gName = groupName.trim() || selectedMembers.slice(0, 3).map((m) => m.display_name).join(', ')
    const { data: newConvId, error: convErr } = await supabase
      .rpc('create_conversation', { conv_type: 'group', conv_name: gName })

    if (convErr) {
      toast.error((locale === 'en' ? 'Failed to create group: ' : '创建群组失败：') + convErr.message)
      setCreating(false)
      return
    }

    if (newConvId) {
      const participantRows = [
        { conversation_id: newConvId, user_id: userId },
        ...selectedMembers.map((m) => ({ conversation_id: newConvId, user_id: m.user_id })),
      ]
      const { error: partErr } = await supabase.from('conversation_participants').insert(participantRows)
      if (partErr) {
        toast.error((locale === 'en' ? 'Failed to add members: ' : '添加群成员失败：') + partErr.message)
        setCreating(false)
        return
      }
      toast.success(t(locale, 'chat.group_created'))
      loadConversations()
      setActiveConvId(newConvId)
      setShowNewChat(false)
      setView('chat')
    }
    setCreating(false)
  }

  const filteredConvs = conversations.filter((c) => {
    if (!convFilter.trim()) return true
    const name = c.type === 'group' ? c.name : c.other_user_name
    return (name || '').toLowerCase().includes(convFilter.trim().toLowerCase())
  })

  // 加载中
  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-4 lg:py-6">
        <div className="flex h-[calc(100vh-7rem)] lg:h-[calc(100vh-5rem)] border rounded-xl overflow-hidden bg-background">
          <Skeleton className="w-80 shrink-0 hidden lg:block" />
          <Skeleton className="flex-1" />
        </div>
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
          <p className="text-muted-foreground max-w-sm mb-6">{t(locale, 'chat.about')}</p>
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
          {/* 顶部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              {t(locale, 'chat.title')}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 搜索会话 */}
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={convFilter}
                onChange={(e) => setConvFilter(e.target.value)}
                placeholder={t(locale, 'chat.search_conversations')}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t(locale, 'chat.empty')}</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredConvs.map((conv) => {
                  const isActive = conv.id === activeConvId
                  const isGroup = conv.type === 'group'
                  const displayName = isGroup ? (conv.name || t(locale, 'chat.title')) : (conv.other_user_name || (locale === 'en' ? 'User' : '用户'))

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id)
                        setView('chat')
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center gap-3 ${
                        isActive ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-11 w-11 shrink-0">
                        {!isGroup && conv.other_user_avatar ? (
                          <AvatarImage src={conv.other_user_avatar} alt={displayName} />
                        ) : null}
                        <AvatarFallback className={isGroup ? 'bg-violet-500/10 text-violet-600' : ''}>
                          {isGroup ? <Users className="h-4 w-4" /> : initialsOf(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{displayName}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {listTime(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message || (isGroup ? `${conv.member_count} ${t(locale, 'chat.members')}` : (locale === 'en' ? 'Say hello' : '打个招呼'))}
                          </p>
                        </div>
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
                <p className="text-sm">{t(locale, 'chat.no_conv_selected')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ 新建聊天弹窗 ============ */}
      {showNewChat && (
        <NewChatModal
          locale={locale}
          mode={newChatMode}
          setMode={setNewChatMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          searching={searching}
          hasSearched={hasSearched}
          selectedMembers={selectedMembers}
          setSelectedMembers={setSelectedMembers}
          groupName={groupName}
          setGroupName={setGroupName}
          creating={creating}
          onSearch={handleSearch}
          onStartDM={startDM}
          onCreateGroup={createGroup}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  )
}

// ============================================
// 聊天窗口
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
  const [userInfo, setUserInfo] = useState<Record<string, { name: string; avatar: string | null }>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  const conv = conversations.find((c) => c.id === conversationId)
  const isGroup = conv?.type === 'group'
  const displayName = isGroup
    ? (conv?.name || t(locale, 'chat.title'))
    : (conv?.other_user_name || (locale === 'en' ? 'User' : '用户'))

  // 加载历史消息
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      const msgs = (data as Message[]) ?? []
      setMessages(msgs)

      const userIds = [...new Set(msgs.map((m) => m.user_id))]
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds)
        const map: Record<string, { name: string; avatar: string | null }> = {}
        ;(profiles ?? []).forEach((p: any) => {
          map[p.user_id] = { name: p.display_name, avatar: p.avatar_url }
        })
        setUserInfo(map)
      }

      setLoading(false)
    }
    loadMessages()

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
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          if (!userInfo[newMsg.user_id]) {
            supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', newMsg.user_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setUserInfo((prev) => ({ ...prev, [newMsg.user_id]: { name: data.display_name, avatar: data.avatar_url } }))
                }
              })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      content: input.trim(),
    })
    setSending(false)
    if (!error) setInput('')
    else toast.error(t(locale, 'chat.send_failed'))
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部条 */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b shrink-0">
        <button onClick={onBack} className="lg:hidden p-1 -ml-1 hover:bg-muted rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar className="h-9 w-9 shrink-0">
          {!isGroup && conv?.other_user_avatar ? (
            <AvatarImage src={conv.other_user_avatar} alt={displayName} />
          ) : null}
          <AvatarFallback className={isGroup ? 'bg-violet-500/10 text-violet-600' : ''}>
            {isGroup ? <Users className="h-4 w-4" /> : initialsOf(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{displayName}</div>
          {isGroup && (
            <div className="text-[11px] text-muted-foreground">
              {conv?.member_count} {t(locale, 'chat.members')}
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {loading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={`h-10 rounded-2xl w-2/3 ${i % 2 === 0 ? 'ml-auto' : ''}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-16">
            {t(locale, 'chat.no_messages')}
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1]
            const showDate = !prev || !isSameDay(new Date(prev.created_at), new Date(msg.created_at))
            const isMe = msg.user_id === userId
            const info = userInfo[msg.user_id]
            const senderName = isMe
              ? t(locale, 'chat.you')
              : info?.name || (locale === 'en' ? 'User' : '用户')

            return (
              <Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                      {dayLabel(msg.created_at, locale)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[75%] gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {/* 对方头像（群聊显示） */}
                    {isGroup && !isMe && (
                      <Avatar className="h-7 w-7 shrink-0 mt-1">
                        {info?.avatar ? <AvatarImage src={info.avatar} alt={senderName} /> : null}
                        <AvatarFallback className="text-[10px]">{initialsOf(senderName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={isMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                      {isGroup && !isMe && (
                        <span className="text-[11px] text-muted-foreground mb-0.5 ml-1">{senderName}</span>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </Fragment>
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
            placeholder={t(locale, 'chat.type_placeholder')}
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

// ============================================
// 新建聊天弹窗
// ============================================
function NewChatModal({
  locale,
  mode,
  setMode,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  hasSearched,
  selectedMembers,
  setSelectedMembers,
  groupName,
  setGroupName,
  creating,
  onSearch,
  onStartDM,
  onCreateGroup,
  onClose,
}: {
  locale: Locale
  mode: 'direct' | 'group'
  setMode: (m: 'direct' | 'group') => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  searchResults: Profile[]
  searching: boolean
  hasSearched: boolean
  selectedMembers: Profile[]
  setSelectedMembers: Dispatch<SetStateAction<Profile[]>>
  groupName: string
  setGroupName: (v: string) => void
  creating: boolean
  onSearch: () => void
  onStartDM: (p: Profile) => void
  onCreateGroup: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl border shadow-xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="font-semibold text-base">{t(locale, 'chat.new')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mx-4 mt-3 shrink-0">
          <button
            onClick={() => { setMode('direct'); setSelectedMembers([]) }}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === 'direct' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
          >
            {t(locale, 'chat.direct_message')}
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === 'group' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
          >
            {t(locale, 'chat.create_group')}
          </button>
        </div>

        {/* 群组名称 + 已选成员 */}
        {mode === 'group' && (
          <div className="px-4 mt-3 space-y-2 shrink-0">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t(locale, 'chat.group_name_placeholder')}
              className="h-9 text-sm"
            />
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((m) => (
                  <span key={m.user_id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {m.display_name}
                    <button onClick={() => setSelectedMembers((prev) => prev.filter((p) => p.user_id !== m.user_id))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 搜索 */}
        <div className="flex gap-2 px-4 mt-3 shrink-0">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(locale, 'chat.search_users')}
            className="h-9 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <Button variant="outline" className="h-9 shrink-0 px-3" onClick={onSearch} disabled={searching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* 搜索结果 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 mt-2">
          {searching ? (
            <div className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-0.5">
              {searchResults.map((p) => {
                const isSelected = selectedMembers.some((m) => m.user_id === p.user_id)
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (mode === 'direct') {
                        onStartDM(p)
                      } else {
                        setSelectedMembers((prev) =>
                          prev.some((m) => m.user_id === p.user_id)
                            ? prev
                            : [...prev, p]
                        )
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-accent flex items-center gap-3 text-sm"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.display_name} /> : null}
                      <AvatarFallback className="text-xs">{initialsOf(p.display_name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{p.display_name}</span>
                    {mode === 'group' && isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : hasSearched ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {locale === 'en' ? 'No users found. Check the name and try again.' : '未找到用户，请确认对方已注册并检查名称'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              {locale === 'en' ? 'Search for users by name to start chatting.' : '按名称搜索用户，开始聊天。'}
            </p>
          )}
        </div>

        {/* 创建群组按钮 */}
        {mode === 'group' && (
          <div className="px-4 py-3 border-t shrink-0">
            <Button
              className="w-full"
              disabled={creating || selectedMembers.length === 0}
              onClick={onCreateGroup}
            >
              <Users className="h-4 w-4 mr-1.5" />
              {t(locale, 'chat.create_group_done')}
              {selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

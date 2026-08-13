'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Conversation, Message, Profile } from '@/lib/types'
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
  X,
  Check,
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)

  const [view, setView] = useState<'list' | 'chat'>('list')

  // 新建聊天
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

  // 加载自己的 profile
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile)
      })
  }, [userId])

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

    const enriched = await Promise.all(
      convs.map(async (conv) => {
        // 获取参与者 profile
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)

        const otherIds = (participants ?? [])
          .filter((p) => p.user_id !== userId)
          .map((p) => p.user_id)

        let displayLabel: string
        if (conv.type === 'group') {
          displayLabel = conv.name || (locale === 'en' ? 'Group' : '群组')
        } else if (otherIds.length > 0) {
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', otherIds[0])
            .single()
          displayLabel = otherProfile?.display_name || (locale === 'en' ? 'User' : '用户')
        } else {
          displayLabel = locale === 'en' ? 'Chat' : '聊天'
        }

        // 最后消息
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Store display label in a way we can use
        return {
          ...conv,
          other_user_email: otherIds.length > 0 ? otherIds[0] : null,
          name: displayLabel,
          last_message: lastMsg?.content ?? null,
          last_message_at: lastMsg?.created_at ?? null,
        } as Conversation
      })
    )

    setConversations(enriched)
    setConvLoading(false)
  }, [userId, locale])

  useEffect(() => {
    if (userId) loadConversations()
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

  // 开始一对一聊天
  const startDM = async (targetProfile: Profile) => {
    if (!userId) return

    // 检查是否已有 DM（用 SECURITY DEFINER RPC，绕过 RLS 看不到对方参与记录的问题）
    const { data: existingConvId } = await supabase
      .rpc('find_direct_conversation', { target: targetProfile.user_id })

    if (existingConvId) {
      setActiveConvId(existingConvId)
      setShowNewChat(false)
      setSearchQuery('')
      setSearchResults([])
      setHasSearched(false)
      setView('chat')
      return
    }

    // 新建 DM
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single()

    if (convErr) {
      toast.error((locale === 'en' ? 'Failed to create chat: ' : '创建会话失败：') + convErr.message)
      return
    }

    if (newConv) {
      const { error: partErr } = await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: userId },
        { conversation_id: newConv.id, user_id: targetProfile.user_id },
      ])
      if (partErr) {
        toast.error((locale === 'en' ? 'Failed to add member: ' : '添加成员失败：') + partErr.message)
        return
      }
      loadConversations()
      setActiveConvId(newConv.id)
      setShowNewChat(false)
      setSearchQuery('')
      setSearchResults([])
      setHasSearched(false)
      setView('chat')
    }
  }

  // 创建群组
  const createGroup = async () => {
    if (!userId || selectedMembers.length === 0) return
    setCreating(true)

    const gName = groupName.trim() || selectedMembers.slice(0, 3).map((m) => m.display_name).join(', ')
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'group', name: gName })
      .select()
      .single()

    if (convErr) {
      toast.error((locale === 'en' ? 'Failed to create group: ' : '创建群组失败：') + convErr.message)
      setCreating(false)
      return
    }

    if (newConv) {
      const participantRows = [
        { conversation_id: newConv.id, user_id: userId },
        ...selectedMembers.map((m) => ({ conversation_id: newConv.id, user_id: m.user_id })),
      ]
      const { error: partErr } = await supabase.from('conversation_participants').insert(participantRows)
      if (partErr) {
        toast.error((locale === 'en' ? 'Failed to add members: ' : '添加群成员失败：') + partErr.message)
        setCreating(false)
        return
      }
      toast.success(t(locale, 'chat.group_created'))
      loadConversations()
      setActiveConvId(newConv.id)
      setShowNewChat(false)
      setGroupName('')
      setSelectedMembers([])
      setSearchQuery('')
      setSearchResults([])
      setHasSearched(false)
      setView('chat')
    }
    setCreating(false)
  }

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
          <p className="text-muted-foreground max-w-sm mb-6">
            {t(locale, 'chat.about') as string}
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
          {/* 顶部 */}
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-violet-500" />
              {t(locale, 'chat.title')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setShowNewChat(!showNewChat)
                setNewChatMode('direct')
                setSelectedMembers([])
                setGroupName('')
                setSearchQuery('')
                setSearchResults([])
                setHasSearched(false)
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 新建聊天面板 */}
          {showNewChat && (
            <div className="p-3 border-b space-y-2 bg-muted/30">
              {/* 模式切换 */}
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => { setNewChatMode('direct'); setSelectedMembers([]) }}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                    newChatMode === 'direct' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {t(locale, 'chat.direct_message')}
                </button>
                <button
                  onClick={() => setNewChatMode('group')}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                    newChatMode === 'group' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {t(locale, 'chat.create_group')}
                </button>
              </div>

              {/* 群组名称 */}
              {newChatMode === 'group' && (
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t(locale, 'chat.group_name_placeholder') as string}
                  className="h-8 text-sm"
                />
              )}

              {/* 已选成员 */}
              {newChatMode === 'group' && selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedMembers.map((m) => (
                    <span key={m.user_id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {m.display_name}
                      <button onClick={() => setSelectedMembers((prev) => prev.filter((p) => p.user_id !== m.user_id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 搜索 */}
              <div className="flex gap-1.5">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(locale, 'profile.search_users') as string}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleSearch} disabled={searching}>
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (newChatMode === 'direct') {
                          startDM(p)
                        } else {
                          setSelectedMembers((prev) =>
                            prev.some((m) => m.user_id === p.user_id)
                              ? prev
                              : [...prev, p]
                          )
                        }
                      }}
                      className="w-full text-left p-2 rounded-md hover:bg-accent flex items-center gap-2.5 text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{p.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{p.display_name}</span>
                      {newChatMode === 'group' && selectedMembers.some((m) => m.user_id === p.user_id) && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              ) : hasSearched && !searching ? (
                <p className="text-xs text-muted-foreground px-1 py-2">
                  {locale === 'en' ? 'No users found. Check the name and try again.' : '未找到用户，请确认对方已注册并检查名称'}
                </p>
              ) : null}

              {/* 创建群组按钮 */}
              {newChatMode === 'group' && selectedMembers.length > 0 && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={createGroup}
                  disabled={creating}
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {t(locale, 'chat.create_group_done')} ({selectedMembers.length})
                </Button>
              )}
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
                  const isGroup = conv.type === 'group'
                  const displayName = conv.name || (locale === 'en' ? 'Chat' : '聊天')
                  const initials = isGroup ? 'G' : displayName.slice(0, 2).toUpperCase()

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id)
                        setView('chat')
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center gap-2.5 ${
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`text-xs ${
                          isGroup ? 'bg-violet-500/10 text-violet-600' : isActive ? 'bg-primary/20' : 'bg-muted-foreground/10'
                        }`}>
                          {isGroup ? <Users className="h-3.5 w-3.5" /> : initials}
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
              profile={profile}
              conversations={conversations}
              onBack={() => setView('list')}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {t(locale, 'chat.no_conv_selected') as string}
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
// 聊天窗口
// ============================================
function ChatWindow({
  conversationId,
  userId,
  locale,
  profile,
  conversations,
  onBack,
}: {
  conversationId: string
  userId: string
  locale: Locale
  profile: Profile | null
  conversations: Conversation[]
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  const conv = conversations.find((c) => c.id === conversationId)
  const isGroup = conv?.type === 'group'
  const displayName = conv?.name || (locale === 'en' ? 'Chat' : '聊天')

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

      // 加载所有发言者的显示名称
      const userIds = [...new Set(msgs.map((m) => m.user_id))]
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds)
        const map: Record<string, string> = {}
        ;(profiles ?? []).forEach((p: any) => {
          map[p.user_id] = p.display_name
        })
        setUserProfiles(map)
      }

      setLoading(false)
    }
    loadMessages()

    // Realtime
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
          // Load display name for new message sender
          if (!userProfiles[newMsg.user_id]) {
            supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', newMsg.user_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setUserProfiles((prev) => ({ ...prev, [newMsg.user_id]: data.display_name }))
                }
              })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

  const getUserName = (uid: string) => {
    if (uid === userId) return locale === 'en' ? 'You' : locale === 'zh-HK' ? '你' : '你'
    return userProfiles[uid] || (locale === 'en' ? 'User' : '用户')
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部条 */}
      <div className="flex items-center gap-2 p-3 border-b shrink-0">
        <button onClick={onBack} className="lg:hidden p-1 -ml-1 hover:bg-muted rounded">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          isGroup ? 'bg-violet-500/10' : 'bg-primary/10'
        }`}>
          {isGroup ? <Users className="h-3.5 w-3.5 text-violet-500" /> : (
            <span className="text-[10px] font-bold text-primary">{displayName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <span className="font-medium text-sm truncate">{displayName}</span>
        {isGroup && conv?.other_user_email && (
          <span className="text-xs text-muted-foreground">({locale === 'en' ? 'group' : '群組'})</span>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={`h-10 rounded-lg w-2/3 ${i % 2 === 0 ? 'ml-auto' : ''}`} />
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
                <div className={`max-w-[75%] ${isMe ? '' : 'flex items-end gap-1.5'}`}>
                  {!isMe && (
                    <span className="text-[10px] text-muted-foreground shrink-0 mb-0.5">{getUserName(msg.user_id)}</span>
                  )}
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <span className={`text-[10px] mt-0.5 block ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
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

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Crown, Lock, Trash2, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { zhHK, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

// ============================================
// 通用评论组件 — 支持 competition / post / anonymous_post
// ============================================

interface CommentData {
  id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
  is_member?: boolean
  /** 匿名评论的显示名 */
  display_name?: string
  avatar_url?: string | null
}

interface CommentSectionProps {
  targetType: 'competition' | 'post' | 'anonymous_post'
  targetId: string
}

/** 随机匿名名 */
function randomAnonName(): string {
  const adjectives = ['暗影', '深夜', '迷霧', '隱世', '流浪', '沉默', '孤獨', '深潛', '月光', '幽谷']
  const nouns = ['貓', '狐狸', '烏鴉', '蝙蝠', '狼', '兔', '鷹', '蛇', '熊貓', '蝴蝶']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}#${num}`
}

function tableInfo(type: CommentSectionProps['targetType']) {
  switch (type) {
    case 'post':
      return { table: 'post_comments' as const, fk: 'post_id' as const, anonymous: false }
    case 'anonymous_post':
      return { table: 'anonymous_post_comments' as const, fk: 'post_id' as const, anonymous: true }
    default:
      return { table: 'comments' as const, fk: 'competition_id' as const, anonymous: false }
  }
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const router = useRouter()
  const { locale } = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [comments, setComments] = useState<CommentData[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)

  const { table, fk, anonymous } = tableInfo(targetType)
  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, HH:mm' : 'M月d日 HH:mm'

  // 匿名评论者的显示名（当前用户在当前帖子下的身份）
  const myAnonName = useMemo(() => randomAnonName(), [targetId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        if (!anonymous) checkMembership(session.user.id)
        supabase.from('profiles').select('avatar_url').eq('user_id', session.user.id).maybeSingle()
          .then(({ data }) => setMyAvatar(data?.avatar_url ?? null))
      }
    })
    loadComments()
  }, [targetType, targetId])

  const checkMembership = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_member')
      .eq('user_id', userId)
      .maybeSingle()
    setIsMember(data?.is_member ?? false)
  }

  const loadComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq(fk, targetId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      if (anonymous) {
        // 匿名评论：不查 profiles，直接用存储的 display_name
        const enriched: CommentData[] = data.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          display_name: c.display_name || '???',
          author_name: c.display_name || '???',
        }))
        setComments(enriched)
      } else {
        // 公开评论：查 profiles 补全显示名
        const userIds = [...new Set(data.map((c: any) => c.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, is_member, display_name, avatar_url')
          .in('user_id', userIds)

        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]))

        const enriched: CommentData[] = data.map((c: any) => {
          const p = profileMap.get(c.user_id)
          return {
            id: c.id,
            user_id: c.user_id,
            content: c.content,
            created_at: c.created_at,
            author_name: p?.display_name || c.user_id.slice(0, 6) + '...',
            is_member: p?.is_member ?? false,
            avatar_url: p?.avatar_url ?? null,
          }
        })
        setComments(enriched)
      }
    }
    setLoading(false)
  }, [table, fk, targetId, anonymous])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error(
        locale === 'en'
          ? 'Please log in to comment'
          : locale === 'zh-HK'
          ? '請先登入再評論'
          : '请先登录再评论'
      )
      const redirectPath = targetType === 'post' ? `/posts/${targetId}`
        : targetType === 'anonymous_post' ? `/posts/anonymous/${targetId}`
        : `/competition/${targetId}`
      router.push(`/auth/login?redirect=${redirectPath}`)
      return
    }
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const insertData: any = {
        [fk]: targetId,
        user_id: user.id,
        content: newComment.trim(),
      }
      if (anonymous) {
        insertData.display_name = myAnonName
      }
      const { error } = await supabase.from(table).insert(insertData)
      if (error) throw error
      setNewComment('')
      toast.success(t(locale, 'toast.comment_posted'))

      // 通知帖子作者（非匿名、非自己回复自己）
      if (!anonymous && targetType === 'post') {
        const { data: post } = await supabase.from('posts').select('user_id, title').eq('id', targetId).single()
        if (post && post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'comment',
            message: locale === 'en'
              ? `Someone commented on "${post.title?.slice(0, 30)}"`
              : locale === 'zh-HK'
              ? `有人評論了「${post.title?.slice(0, 30)}」`
              : `有人评论了「${post.title?.slice(0, 30)}」`,
            link: `/posts/${targetId}`,
            related_post_id: targetId,
          })
        }
      }

      loadComments()
    } catch (err: any) {
      toast.error(err.message || t(locale, 'toast.comment_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from(table).delete().eq('id', commentId)
    if (error) {
      toast.error(locale === 'en' ? 'Delete failed' : '刪除失敗')
    } else {
      toast.success(locale === 'en' ? 'Comment deleted' : '評論已刪除')
      loadComments()
    }
  }

  const userFallback = locale === 'en' ? 'User' : locale === 'zh-HK' ? '用戶' : '用户'
  const redirectPath = targetType === 'post' ? `/posts/${targetId}`
    : targetType === 'anonymous_post' ? `/posts/anonymous/${targetId}`
    : `/competition/${targetId}`

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{t(locale, 'comments.title')}</h3>
          {comments.length > 0 && (
            <Badge variant="secondary" className="ml-1">{comments.length}</Badge>
          )}
        </div>

        {/* 评论输入框 */}
        {user ? (
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-3">
              {/* 匿名评论用神秘头像 */}
              {anonymous ? (
                <div className="h-9 w-9 shrink-0 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <EyeOff className="h-4 w-4 text-purple-400/60" />
                </div>
              ) : (
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={myAvatar || undefined} alt={user.email || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.email?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    anonymous
                      ? locale === 'en' ? 'Whisper anonymously...' : locale === 'zh-HK' ? '匿名留言...' : '匿名留言...'
                      : t(locale, isMember ? 'comments.member_placeholder' : 'comments.placeholder') as string
                  }
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/500
                  </span>
                  <div className="flex items-center gap-2">
                    {anonymous && (
                      <span className="text-xs text-purple-400/70 font-medium">
                        {myAnonName}
                      </span>
                    )}
                    {!anonymous && isMember && (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                        <Crown className="h-3 w-3" /> {t(locale, 'comments.member_badge')}
                      </Badge>
                    )}
                    <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                      {submitting ? t(locale, 'comments.posting') : (
                        <>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          {t(locale, 'comments.post')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-6 rounded-lg border-2 border-dashed p-4 text-center">
            <Lock className="mx-auto h-5 w-5 text-muted-foreground mb-1.5" />
            <p className="text-sm text-muted-foreground mb-3">
              {t(locale, 'comments.login_hint')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/auth/login?redirect=${redirectPath}`)}
            >
              {t(locale, 'sidebar.login')}
            </Button>
          </div>
        )}

        {/* 评论列表 */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{t(locale, 'comments.empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group/comment">
                {anonymous ? (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <EyeOff className="h-3.5 w-3.5 text-purple-400/60" />
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.avatar_url || undefined} alt={comment.author_name || ''} />
                    <AvatarFallback className="text-xs bg-muted">
                      {comment.author_name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${anonymous ? 'text-purple-400' : ''}`}>
                      {comment.author_name || userFallback}
                    </span>
                    {!anonymous && comment.is_member && (
                      <Crown className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), dateFormat, { locale: dateLocale })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{comment.content}</p>
                </div>
                {user && user.id === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="shrink-0 p-1 rounded opacity-0 group-hover/comment:opacity-100 hover:bg-muted text-muted-foreground hover:text-destructive transition-all"
                    title={locale === 'en' ? 'Delete' : '刪除'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

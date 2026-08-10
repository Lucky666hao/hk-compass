'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Crown, Lock, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhHK, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

// ============================================
// 通用评论组件 — 支持 competition / post
// ============================================

interface CommentData {
  id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
  is_member?: boolean
}

interface CommentSectionProps {
  /** 'competition' → comments 表 / 'post' → post_comments 表 */
  targetType: 'competition' | 'post'
  /** competition.id 或 post.id */
  targetId: string
}

/** 根据 targetType 推断表名和 FK 列名 */
function tableInfo(type: CommentSectionProps['targetType']) {
  if (type === 'post') {
    return { table: 'post_comments' as const, fk: 'post_id' as const }
  }
  return { table: 'comments' as const, fk: 'competition_id' as const }
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

  const { table, fk } = tableInfo(targetType)
  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, HH:mm' : 'M月d日 HH:mm'

  // 加载用户状态和评论
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) checkMembership(session.user.id)
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
      // 获取所有评论者的 profile
      const userIds = [...new Set(data.map((c: any) => c.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, is_member, display_name')
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
        }
      })
      setComments(enriched)
    }
    setLoading(false)
  }, [table, fk, targetId])

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
      const redirectPath = targetType === 'post' ? `/posts/${targetId}` : `/competition/${targetId}`
      router.push(`/auth/login?redirect=${redirectPath}`)
      return
    }
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from(table).insert({
        [fk]: targetId,
        user_id: user.id,
        content: newComment.trim(),
      })
      if (error) throw error
      setNewComment('')
      toast.success(t(locale, 'toast.comment_posted'))
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
  const redirectPath = targetType === 'post'
    ? `/posts/${targetId}`
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
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user.email?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t(locale, isMember ? 'comments.member_placeholder' : 'comments.placeholder') as string}
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/500
                  </span>
                  <div className="flex items-center gap-2">
                    {isMember && (
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
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-muted">
                    {comment.author_name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.author_name || userFallback}
                    </span>
                    {comment.is_member && (
                      <Crown className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), dateFormat, { locale: dateLocale })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{comment.content}</p>
                </div>
                {/* 删除按钮 — 仅评论作者可见 */}
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

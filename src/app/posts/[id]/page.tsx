'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/lib/types'
import { POST_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Trash2, Flag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import { VoteButtons } from '@/components/vote-buttons'
import { UniversityBadge } from '@/components/university-badge'
import { SaveButton } from '@/components/save-button'
import { CommentSection } from '@/components/comment-section'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [authorUni, setAuthorUni] = useState<string | null>(null)

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy HH:mm' : 'M月d日 HH:mm'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()
      return data as Post | null
    },
  })

  // Load author's university
  useEffect(() => {
    if (!post) return
    supabase
      .from('profiles')
      .select('university, show_university')
      .eq('user_id', post.user_id)
      .single()
      .then(({ data: profile }) => {
        if (profile?.show_university && profile?.university) {
          setAuthorUni(profile.university)
        }
      })
  }, [post])

  const [reportOpen, setReportOpen] = useState(false)
  const handleReport = async (reason: string) => {
    if (!userId) {
      toast.error(locale === 'en' ? 'Please log in first' : '请先登录')
      return
    }
    const { error } = await supabase.from('post_reports').insert({ post_id: id, reporter_id: userId, reason })
    if (error) {
      if (error.code === '23505') toast.error(locale === 'en' ? 'Already reported' : locale === 'zh-HK' ? '已舉報過' : '已举报过')
      else toast.error(locale === 'en' ? 'Report failed' : '举报失败')
    } else {
      toast.success(locale === 'en' ? 'Reported. Thank you.' : locale === 'zh-HK' ? '已舉報，謝謝。' : '已举报，谢谢。')
    }
    setReportOpen(false)
  }

  const handleDelete = async () => {
    if (!post) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      toast.error(t(locale, 'posts.delete_failed'))
    } else {
      toast.success(t(locale, 'posts.delete_success'))
      router.push('/posts')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-muted-foreground py-20">
        <p className="text-lg">{t(locale, 'posts.not_found') as string}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/posts')}>
          {t(locale, 'posts.back_to_list')}
        </Button>
      </div>
    )
  }

  const isAuthor = userId && userId === post.user_id
  const catLabel = (t(locale, `posts.cat.${post.category}`) as string) || POST_CATEGORY_LABELS[post.category as keyof typeof POST_CATEGORY_LABELS] || post.category

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'posts.back_to_list')}
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{catLabel}</Badge>
              {authorUni && <UniversityBadge slug={authorUni} size="sm" />}
            </div>
            <div className="flex items-center gap-1">
              <SaveButton postId={post.id} userId={userId} />
              {/* 举报按钮 */}
              {userId && !isAuthor && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setReportOpen(!reportOpen)}
                    className="text-muted-foreground hover:text-destructive"
                    title={locale === 'en' ? 'Report' : '举报'}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                  {reportOpen && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-popover border rounded-lg shadow-lg p-2 w-40">
                      {[
                        { key: 'spam', en: 'Spam', zh: '垃圾信息' },
                        { key: 'harassment', en: 'Harassment', zh: '骚扰' },
                        { key: 'inappropriate', en: 'Inappropriate', zh: '不当内容' },
                        { key: 'violence', en: 'Violence', zh: '暴力内容' },
                        { key: 'other', en: 'Other', zh: '其他' },
                      ].map(r => (
                        <button
                          key={r.key}
                          onClick={() => handleReport(r.key)}
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                        >
                          {locale === 'en' ? r.en : r.zh}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {isAuthor && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-muted-foreground hover:text-destructive"
                  title={t(locale, 'posts.delete_confirm') as string}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          <div className="text-sm text-muted-foreground mb-6">
            {post.author_email && (
              <span>{post.author_email.split('@')[0]} · </span>
            )}
            <span>
              {format(new Date(post.created_at), dateFormat, {
                locale: dateLocale,
              })}
            </span>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
            {post.content}
          </div>

          {/* 图片展示 */}
          {post.image_urls && post.image_urls.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {post.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full rounded-lg border object-cover max-h-96"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* 赞/踩 */}
          <div className="mt-6 pt-4 border-t">
            <VoteButtons postId={post.id} userId={userId} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* 评论区 */}
      <div className="mt-6">
        <CommentSection targetType="post" targetId={id} />
      </div>
    </div>
  )
}

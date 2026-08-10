'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Post, ReactionCounts, ReactionEmoji } from '@/lib/types'
import { POST_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import { VoteButtons } from '@/components/vote-buttons'
import { PostReactions } from '@/components/post-reactions'
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

  // Load reactions
  const [reactionCounts, setReactionCounts] = useState<Partial<ReactionCounts>>({})
  const [userReactions, setUserReactions] = useState<Set<ReactionEmoji>>(new Set())
  const [userVote, setUserVote] = useState<number | null>(null)

  useEffect(() => {
    if (!id || !userId) return
    // Load vote
    supabase.from('post_votes').select('vote').eq('post_id', id).eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setUserVote(data.vote) })
    // Load reactions
    supabase.from('post_reactions').select('emoji, user_id').eq('post_id', id).then(({ data }) => {
      if (data) {
        const counts: Partial<ReactionCounts> = {}
        const uSet = new Set<ReactionEmoji>()
        for (const r of data) {
          counts[r.emoji as ReactionEmoji] = (counts[r.emoji as ReactionEmoji] || 0) + 1
          if (r.user_id === userId) uSet.add(r.emoji as ReactionEmoji)
        }
        setReactionCounts(counts)
        setUserReactions(uSet)
      }
    })
  }, [id, userId])

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
          <div className="flex items-start gap-4">
            {/* 左侧投票区 */}
            <div className="shrink-0 pt-1">
              <VoteButtons
                postId={post.id}
                voteScore={post.vote_score ?? 0}
                userVote={userVote}
                userId={userId}
                size="lg"
              />
            </div>

            {/* 主内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{catLabel}</Badge>
                  {authorUni && <UniversityBadge slug={authorUni} size="sm" />}
                </div>
                <div className="flex items-center gap-1">
                  <SaveButton_post postId={post.id} userId={userId} />
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

              {/* 表情回应 */}
              <div className="mt-6 pt-4 border-t">
                <PostReactions
                  postId={post.id}
                  counts={reactionCounts}
                  userReactions={userReactions}
                  userId={userId}
                />
              </div>
            </div>
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

/** Inline save button for detail page */
function SaveButton_post({ postId, userId }: { postId: string; userId?: string | null }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [postId, userId])

  const toggle = async () => {
    if (!userId) { toast.error('请先登录'); return }
    if (loading) return
    setLoading(true)
    if (saved) {
      await supabase.from('saved_posts').delete().match({ user_id: userId, post_id: postId })
      setSaved(false)
    } else {
      await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={loading}
      className={saved ? 'text-yellow-500' : 'text-muted-foreground'}
      title={saved ? '已收藏' : '收藏'}
    >
      <svg className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </Button>
  )
}

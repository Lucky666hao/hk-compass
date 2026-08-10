'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AnonymousPost, ReactionCounts, ReactionEmoji } from '@/lib/types'
import { ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { ArrowLeft, Trash2, Skull } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import { VoteButtons } from '@/components/vote-buttons'
import { PostReactions } from '@/components/post-reactions'

export default function AnonymousPostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const [userId, setUserId] = useState<string | null>(null)

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy HH:mm' : 'M月d日 HH:mm'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: post, isLoading } = useQuery({
    queryKey: ['anonymous_post', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('anonymous_posts')
        .select('*')
        .eq('id', id)
        .single()
      return data as AnonymousPost | null
    },
  })

  const [reactionCounts, setReactionCounts] = useState<Partial<ReactionCounts>>({})
  const [userReactions, setUserReactions] = useState<Set<ReactionEmoji>>(new Set())
  const [userVote, setUserVote] = useState<number | null>(null)

  useEffect(() => {
    if (!id || !userId) return
    supabase.from('anonymous_post_votes').select('vote').eq('post_id', id).eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setUserVote(data.vote) })
    supabase.from('anonymous_post_reactions').select('emoji, user_id').eq('post_id', id).then(({ data }) => {
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
    const { error } = await supabase.from('anonymous_posts').delete().eq('id', post.id)
    if (error) {
      toast.error(locale === 'en' ? 'Delete failed' : '删除失败')
    } else {
      toast.success(locale === 'en' ? 'Deleted.' : '已删除。')
      router.push('/posts/anonymous')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6 bg-zinc-900" />
          <Skeleton className="h-48 rounded-xl bg-zinc-900" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center text-zinc-600 py-20">
          <Skull className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-mono">{locale === 'en' ? 'Post not found' : '找不到帖子'}</p>
          <Button className="mt-4 bg-zinc-900 text-zinc-400 border-zinc-800 font-mono" onClick={() => router.push('/posts/anonymous')}>
            {locale === 'en' ? 'Back' : '返回'}
          </Button>
        </div>
      </div>
    )
  }

  const isAuthor = userId && userId === post.user_id
  const catLabel = ANONYMOUS_CATEGORY_LABELS[post.category] || post.category

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => router.push('/posts/anonymous')}
          className="mb-6 flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-400 font-mono"
        >
          <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back to Anonymous' : '返回地下板块'}
        </button>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <div className="flex items-start gap-4">
            {/* 左侧投票 */}
            <div className="shrink-0 pt-1">
              <VoteButtons
                postId={post.id}
                table="anonymous_posts"
                voteScore={post.vote_score ?? 0}
                userVote={userVote}
                userId={userId}
                size="lg"
              />
            </div>

            {/* 主内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-500 font-mono font-bold">{post.display_name}</span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-500 font-mono border border-zinc-700/50">
                    {catLabel}
                  </span>
                </div>
                {isAuthor && (
                  <button
                    onClick={handleDelete}
                    className="text-zinc-700 hover:text-red-500 transition-colors p-1"
                    title={locale === 'en' ? 'Delete' : '删除'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <h1 className="text-2xl font-bold mb-4 font-mono text-zinc-100">{post.title}</h1>

              <div className="text-xs text-zinc-600 mb-6 font-mono">
                {format(new Date(post.created_at), dateFormat, { locale: dateLocale })}
              </div>

              <div className="prose prose-sm max-w-none prose-invert whitespace-pre-wrap font-mono text-zinc-400">
                {post.content}
              </div>

              {/* 表情回应 */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <PostReactions
                  postId={post.id}
                  table="anonymous_posts"
                  counts={reactionCounts}
                  userReactions={userReactions}
                  userId={userId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

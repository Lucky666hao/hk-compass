'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import type { AnonymousPost, ReactionCounts, ReactionEmoji } from '@/lib/types'
import { ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { VoteButtons } from '@/components/vote-buttons'
import { PostReactions } from '@/components/post-reactions'
import { supabase } from '@/lib/supabase'

interface AnonymousPostCardProps {
  post: AnonymousPost
  userId?: string | null
}

export function AnonymousPostCard({ post, userId }: AnonymousPostCardProps) {
  const { locale } = useLocale()
  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d' : 'M月d日'

  const catLabel = ANONYMOUS_CATEGORY_LABELS[post.category] || post.category
  const timeAgo = format(new Date(post.created_at), dateFormat, { locale: dateLocale })

  const [reactionCounts, setReactionCounts] = useState<Partial<ReactionCounts>>({})
  const [userReactions, setUserReactions] = useState<Set<ReactionEmoji>>(new Set())

  useEffect(() => {
    supabase
      .from('anonymous_post_reactions')
      .select('emoji, user_id')
      .eq('post_id', post.id)
      .then(({ data }) => {
        if (data) {
          const counts: Partial<ReactionCounts> = {}
          const uSet = new Set<ReactionEmoji>()
          for (const r of data) {
            counts[r.emoji as ReactionEmoji] = (counts[r.emoji as ReactionEmoji] || 0) + 1
            if (userId && r.user_id === userId) uSet.add(r.emoji as ReactionEmoji)
          }
          setReactionCounts(counts)
          setUserReactions(uSet)
        }
      })
  }, [post.id, userId])

  return (
    <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700/80 transition-colors">
      <div className="flex">
        {/* 左侧投票区 */}
        <div className="flex items-stretch py-3 pl-3 pr-1 border-r border-zinc-800/50 shrink-0">
          <div className="flex items-center">
            <VoteButtons
              postId={post.id}
              table="anonymous_posts"
              voteScore={post.vote_score ?? 0}
              userVote={post.user_vote ?? null}
              userId={userId}
              size="sm"
            />
          </div>
        </div>

        {/* 主内容 */}
        <Link href={`/posts/anonymous/${post.id}`} className="flex-1 min-w-0 py-3 pr-4 pl-3 block">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-emerald-600 font-mono">{post.display_name}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-500 font-mono border border-zinc-700/50">
              {catLabel}
            </span>
            <span className="text-[10px] text-zinc-600 ml-auto font-mono">{timeAgo}</span>
          </div>
          <h3 className="font-medium line-clamp-1 text-zinc-200 group-hover:text-emerald-400 transition-colors font-mono">
            {post.title}
          </h3>
          <p className="text-xs text-zinc-500 line-clamp-2 mt-1 font-mono leading-relaxed">
            {post.content}
          </p>

          {/* 表情回应 */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800/50">
            <PostReactions
              postId={post.id}
              table="anonymous_posts"
              counts={reactionCounts}
              userReactions={userReactions}
              userId={userId}
            />
          </div>
        </Link>
      </div>
    </div>
  )
}

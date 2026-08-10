'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { ReactionEmoji, ReactionCounts } from '@/lib/types'
import { REACTION_EMOJIS } from '@/lib/types'
import { toast } from 'sonner'

interface PostReactionsProps {
  postId: string
  table?: 'posts' | 'anonymous_posts'
  counts: Partial<ReactionCounts>
  userReactions: Set<ReactionEmoji>
  userId?: string | null
}

const EMOJI_LABELS: Record<ReactionEmoji, string> = {
  '👍': '赞',
  '👏': '鼓掌',
  '🔥': '热门',
  '💡': '启发',
  '🤔': '思考',
}

export function PostReactions({
  postId,
  table = 'posts',
  counts: initialCounts,
  userReactions: initialUserReactions,
  userId,
}: PostReactionsProps) {
  const [counts, setCounts] = useState<Partial<ReactionCounts>>(initialCounts)
  const [userReactions, setUserReactions] = useState<Set<ReactionEmoji>>(initialUserReactions)
  const [loading, setLoading] = useState<Set<ReactionEmoji>>(new Set())

  const reactionTable = table === 'anonymous_posts' ? 'anonymous_post_reactions' : 'post_reactions'

  const handleReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (!userId) {
      toast.error('请先登录')
      return
    }
    if (loading.has(emoji)) return

    setLoading(prev => new Set(prev).add(emoji))

    try {
      const hasReacted = userReactions.has(emoji)

      if (hasReacted) {
        // Remove reaction
        await supabase.from(reactionTable).delete().match({
          post_id: postId,
          user_id: userId,
          emoji,
        })
        setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }))
        const next = new Set(userReactions)
        next.delete(emoji)
        setUserReactions(next)
      } else {
        // Add reaction
        await supabase.from(reactionTable).insert({
          post_id: postId,
          user_id: userId,
          emoji,
        })
        setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }))
        setUserReactions(prev => new Set(prev).add(emoji))
      }
    } catch {
      // ignore
    } finally {
      setLoading(prev => {
        const next = new Set(prev)
        next.delete(emoji)
        return next
      })
    }
  }, [postId, userId, reactionTable, counts, userReactions, loading])

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {REACTION_EMOJIS.map(emoji => {
        const count = counts[emoji] || 0
        const isActive = userReactions.has(emoji)
        return (
          <button
            key={emoji}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReaction(emoji) }}
            disabled={loading.has(emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all',
              isActive
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-muted/50 text-muted-foreground border border-transparent hover:border-border hover:bg-muted',
              loading.has(emoji) && 'opacity-50',
            )}
            title={EMOJI_LABELS[emoji]}
          >
            <span className="leading-none">{emoji}</span>
            {count > 0 && <span className="tabular-nums font-medium">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

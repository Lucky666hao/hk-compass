'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface VoteButtonsProps {
  postId: string
  table?: 'posts' | 'anonymous_posts'
  voteScore: number
  userVote?: number | null  // 1 | -1 | null
  userId?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export function VoteButtons({
  postId,
  table = 'posts',
  voteScore: initialScore,
  userVote: initialVote,
  userId,
  size = 'md',
}: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState<number | null>(initialVote ?? null)
  const [loading, setLoading] = useState(false)

  const voteTable = table === 'anonymous_posts' ? 'anonymous_post_votes' : 'post_votes'
  const scoreTable = table

  const sizeClasses = {
    sm: { btn: 'h-6 w-6', icon: 'h-3.5 w-3.5', text: 'text-xs' },
    md: { btn: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-sm' },
    lg: { btn: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-base' },
  }[size]

  const handleVote = async (vote: number) => {
    if (!userId) {
      toast.error('请先登录')
      return
    }
    if (loading) return
    setLoading(true)

    try {
      // If same vote, remove it (toggle off)
      if (userVote === vote) {
        await supabase.from(voteTable).delete().match({ post_id: postId, user_id: userId })
        const delta = vote === 1 ? -1 : 1
        setScore(s => s + delta)
        setUserVote(null)
        // Update score in DB
        await supabase.rpc('increment_score', { table_name: scoreTable, row_id: postId, delta })
      } else {
        // Upsert the vote
        if (userVote !== null) {
          // Changing vote: delete old, insert new
          await supabase.from(voteTable).delete().match({ post_id: postId, user_id: userId })
          let delta = vote === 1 ? 1 : -1
          if (userVote === 1) delta += -1  // removed upvote
          else delta -= -1  // removed downvote
          setScore(s => s + delta)
          // Update DB
          await supabase.rpc('increment_score', { table_name: scoreTable, row_id: postId, delta })
        } else {
          // Fresh vote
          const delta = vote === 1 ? 1 : -1
          setScore(s => s + delta)
          setUserVote(vote)
          await supabase.rpc('increment_score', { table_name: scoreTable, row_id: postId, delta })
        }

        // Insert new vote
        const { error } = await supabase.from(voteTable).upsert({
          post_id: postId,
          user_id: userId,
          vote,
        }, { onConflict: 'post_id,user_id' })

        if (!error) {
          setUserVote(vote)
        }
      }
    } catch (e) {
      // Fallback: direct update
      if (userVote === vote) {
        // Toggle off
        const { error } = await supabase.from(voteTable).delete().match({ post_id: postId, user_id: userId })
        if (!error) {
          const delta = vote === 1 ? -1 : 1
          setScore(s => s + delta)
          setUserVote(null)
        }
      } else {
        const { error } = await supabase.from(voteTable).upsert({
          post_id: postId,
          user_id: userId,
          vote,
        }, { onConflict: 'post_id,user_id' })
        if (!error) {
          const delta = userVote ? (vote === 1 ? 2 : -2) : (vote === 1 ? 1 : -1)
          setScore(s => s + delta)
          setUserVote(vote)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote(1) }}
        disabled={loading}
        className={cn(
          'flex items-center justify-center rounded-md transition-colors',
          sizeClasses.btn,
          userVote === 1
            ? 'text-orange-500 bg-orange-500/10'
            : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5'
        )}
        title="赞同"
      >
        <ArrowBigUp className={sizeClasses.icon} />
      </button>
      <span className={cn('font-semibold tabular-nums', sizeClasses.text, {
        'text-orange-500': userVote === 1,
        'text-blue-500': userVote === -1,
        'text-muted-foreground': userVote === null || userVote === 0,
      })}>
        {score}
      </span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote(-1) }}
        disabled={loading}
        className={cn(
          'flex items-center justify-center rounded-md transition-colors',
          sizeClasses.btn,
          userVote === -1
            ? 'text-blue-500 bg-blue-500/10'
            : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5'
        )}
        title="不赞同"
      >
        <ArrowBigDown className={sizeClasses.icon} />
      </button>
    </div>
  )
}

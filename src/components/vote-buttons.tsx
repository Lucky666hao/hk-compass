'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface VoteButtonsProps {
  postId: string
  table?: 'posts' | 'anonymous_posts'
  userId?: string | null
  size?: 'sm' | 'md' | 'lg'
}

/**
 * 赞/踩按钮（取代原来的上下箭头投票）
 * 自加载赞/踩计数，两个并排按钮：👍 赞 / 👎 踩
 */
export function VoteButtons({
  postId,
  table = 'posts',
  userId,
  size = 'md',
}: VoteButtonsProps) {
  const [upCount, setUpCount] = useState(0)
  const [downCount, setDownCount] = useState(0)
  const [userVote, setUserVote] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const voteTable = table === 'anonymous_posts' ? 'anonymous_post_votes' : 'post_votes'
  const scoreTable = table

  const sizeClasses = {
    sm: { btn: 'px-2.5 py-1 text-xs', icon: 'h-3.5 w-3.5' },
    md: { btn: 'px-3 py-1.5 text-sm', icon: 'h-4 w-4' },
    lg: { btn: 'px-4 py-2 text-sm', icon: 'h-5 w-5' },
  }[size]

  // 加载赞/踩计数 + 当前用户投票
  useEffect(() => {
    let cancelled = false
    supabase
      .from(voteTable)
      .select('vote, user_id')
      .eq('post_id', postId)
      .then(({ data }) => {
        if (cancelled) return
        let up = 0
        let down = 0
        let mine: number | null = null
        for (const v of data ?? []) {
          if (v.vote === 1) up++
          else if (v.vote === -1) down++
          if (userId && v.user_id === userId) mine = v.vote
        }
        setUpCount(up)
        setDownCount(down)
        setUserVote(mine)
      })
    return () => {
      cancelled = true
    }
  }, [postId, userId, voteTable])

  // 分数同步（best-effort：即使 RPC 未部署也不阻塞投票本身）
  const bumpScore = async (delta: number) => {
    try {
      await supabase.rpc('increment_score', { table_name: scoreTable, row_id: postId, delta })
    } catch {
      /* ignore */
    }
  }

  const handleVote = async (vote: 1 | -1) => {
    if (!userId) {
      toast.error('请先登录')
      return
    }
    if (loading) return
    setLoading(true)

    try {
      if (userVote === vote) {
        // 取消投票
        const { error } = await supabase
          .from(voteTable)
          .delete()
          .match({ post_id: postId, user_id: userId })
        if (error) throw error
        if (vote === 1) setUpCount((c) => Math.max(0, c - 1))
        else setDownCount((c) => Math.max(0, c - 1))
        setUserVote(null)
        await bumpScore(vote === 1 ? -1 : 1)
      } else {
        // 新增或改变投票：先撤销旧投票对计数/分数的影响
        if (userVote !== null) {
          if (userVote === 1) setUpCount((c) => Math.max(0, c - 1))
          else setDownCount((c) => Math.max(0, c - 1))
          await bumpScore(userVote === 1 ? -1 : 1)
        }
        const { error } = await supabase
          .from(voteTable)
          .upsert({ post_id: postId, user_id: userId, vote }, { onConflict: 'post_id,user_id' })
        if (error) throw error
        if (vote === 1) setUpCount((c) => c + 1)
        else setDownCount((c) => c + 1)
        setUserVote(vote)
        await bumpScore(vote === 1 ? 1 : -1)
      }
    } catch {
      toast.error('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleVote(1)
        }}
        disabled={loading}
        title="赞"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border transition-all',
          sizeClasses.btn,
          userVote === 1
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'text-muted-foreground border-transparent hover:border-border hover:bg-muted',
          loading && 'opacity-50',
        )}
      >
        <ThumbsUp className={sizeClasses.icon} />
        <span className="tabular-nums font-medium">{upCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleVote(-1)
        }}
        disabled={loading}
        title="踩"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border transition-all',
          sizeClasses.btn,
          userVote === -1
            ? 'bg-destructive/10 text-destructive border-destructive/30'
            : 'text-muted-foreground border-transparent hover:border-border hover:bg-muted',
          loading && 'opacity-50',
        )}
      >
        <ThumbsDown className={sizeClasses.icon} />
        <span className="tabular-nums font-medium">{downCount}</span>
      </button>
    </div>
  )
}

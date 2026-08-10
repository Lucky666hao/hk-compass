'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Post, PostVote, PostReaction, ReactionCounts, ReactionEmoji } from '@/lib/types'
import { POST_CATEGORY_LABELS, REACTION_EMOJIS } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { MessageSquare, Bookmark } from 'lucide-react'
import { VoteButtons } from '@/components/vote-buttons'
import { UniversityBadge } from '@/components/university-badge'
import { PostReactions } from '@/components/post-reactions'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface PostCardProps {
  post: Post
  showVote?: boolean
  showReactions?: boolean
  showSave?: boolean
  userId?: string | null
  authorUniSlug?: string | null
}

export function PostCard({
  post,
  showVote = true,
  showReactions = true,
  showSave = false,
  userId,
  authorUniSlug,
}: PostCardProps) {
  const { locale } = useLocale()

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d' : 'M月d日'

  const catLabel = (t(locale, `posts.cat.${post.category}`) as string) || POST_CATEGORY_LABELS[post.category as keyof typeof POST_CATEGORY_LABELS] || post.category
  const timeAgo = format(new Date(post.created_at), dateFormat, { locale: dateLocale })

  // Reactions state
  const [reactionCounts, setReactionCounts] = useState<Partial<ReactionCounts>>({})
  const [userReactions, setUserReactions] = useState<Set<ReactionEmoji>>(new Set())

  // Load reactions for this post
  useEffect(() => {
    if (!showReactions) return
    const loadReactions = async () => {
      const { data } = await supabase
        .from('post_reactions')
        .select('emoji, user_id')
        .eq('post_id', post.id)

      if (data) {
        const counts: Partial<ReactionCounts> = {}
        const userSet = new Set<ReactionEmoji>()
        for (const r of data) {
          const e = r.emoji as ReactionEmoji
          counts[e] = (counts[e] || 0) + 1
          if (userId && r.user_id === userId) {
            userSet.add(e)
          }
        }
        setReactionCounts(counts)
        setUserReactions(userSet)
      }
    }
    loadReactions()
  }, [post.id, userId, showReactions])

  return (
    <div className="group relative">
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-0">
          <div className="flex">
            {/* 左侧投票区 */}
            {showVote && (
              <div className="flex items-stretch py-3 pl-3 pr-1 border-r border-transparent bg-muted/20 rounded-l-xl shrink-0">
                <div className="flex items-center">
                  <VoteButtons
                    postId={post.id}
                    voteScore={post.vote_score ?? 0}
                    userVote={post.user_vote ?? null}
                    userId={userId}
                    size="sm"
                  />
                </div>
              </div>
            )}

            {/* 主内容区 */}
            <Link href={`/posts/${post.id}`} className="flex-1 min-w-0 py-3 pr-4 pl-3 block">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="secondary" className="text-xs shrink-0">
                  {catLabel}
                </Badge>
                {authorUniSlug && (
                  <UniversityBadge slug={authorUniSlug} size="sm" />
                )}
                <span className="text-xs text-muted-foreground ml-auto shrink-0">{timeAgo}</span>
              </div>
              <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {post.content}
              </p>

              {/* 底部表情回应 + 收藏 */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                {showReactions && (
                  <PostReactions
                    postId={post.id}
                    counts={reactionCounts}
                    userReactions={userReactions}
                    userId={userId}
                  />
                )}
                <div className="flex items-center gap-2 ml-auto">
                  {showSave && (
                    <SaveButton postId={post.id} userId={userId} />
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** 收藏按钮 */
function SaveButton({ postId, userId }: { postId: string; userId?: string | null }) {
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

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`p-1 rounded transition-colors ${saved ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
      title={saved ? '已收藏' : '收藏'}
    >
      <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { Post } from '@/lib/types'
import { POST_CATEGORY_LABELS } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { MessageSquare, Bookmark } from 'lucide-react'
import { VoteButtons } from '@/components/vote-buttons'
import { UniversityBadge } from '@/components/university-badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface PostCardProps {
  post: Post
  showSave?: boolean
  userId?: string | null
  authorUniSlug?: string | null
}

export function PostCard({
  post,
  showSave = false,
  userId,
  authorUniSlug,
}: PostCardProps) {
  const { locale } = useLocale()
  const [author, setAuthor] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null)

  useEffect(() => {
    if (!post.user_id) return
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', post.user_id)
      .maybeSingle()
      .then(({ data }) => setAuthor(data ?? null))
  }, [post.user_id])

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d' : 'M月d日'

  const catLabel = (t(locale, `posts.cat.${post.category}`) as string) || POST_CATEGORY_LABELS[post.category as keyof typeof POST_CATEGORY_LABELS] || post.category
  const timeAgo = format(new Date(post.created_at), dateFormat, { locale: dateLocale })

  return (
    <div className="group relative">
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-0">
          <Link href={`/posts/${post.id}`} className="block py-3 px-4">
            <div className="flex items-center gap-2 mb-1.5">
              {author && (
                <>
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={author.avatar_url || undefined} alt={author.display_name || ''} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {(author.display_name || post.user_id).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[100px] shrink-0">
                    {author.display_name || 'User'}
                  </span>
                </>
              )}
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

            {/* 图片预览 */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {post.image_urls.slice(0, 3).map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
                {post.image_urls.length > 3 && (
                  <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    +{post.image_urls.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* 底部：赞/踩 + 收藏 */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
              <VoteButtons postId={post.id} userId={userId} size="sm" />
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

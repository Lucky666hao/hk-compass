'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Post, PostCategory, PostVote } from '@/lib/types'
import { POST_CATEGORIES, POST_CATEGORY_LABELS } from '@/lib/types'
import { PostCard } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Plus, Flame, Clock } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

type SortMode = 'hot' | 'new'

export default function PostsPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [selectedCategories, setSelectedCategories] = useState<Set<PostCategory>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>('hot')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', Array.from(selectedCategories), sortMode],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')

      // 多选分类筛选
      if (selectedCategories.size > 0) {
        const cats = Array.from(selectedCategories)
        query = query.in('category', cats)
      }

      // 排序
      if (sortMode === 'hot') {
        query = query.order('vote_score', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data } = await query.limit(100)

      const posts = (data as Post[]) ?? []

      // Load user votes if logged in
      if (userId && posts.length > 0) {
        const { data: votes } = await supabase
          .from('post_votes')
          .select('post_id, vote')
          .eq('user_id', userId)
          .in('post_id', posts.map(p => p.id))

        if (votes) {
          const voteMap = new Map(votes.map(v => [v.post_id, v.vote]))
          for (const post of posts) {
            post.user_vote = voteMap.get(post.id) ?? null
          }
        }
      }

      return posts
    },
  })

  const toggleCategory = (cat: PostCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t(locale, 'posts.title')}</h1>
        </div>
        <Button onClick={() => router.push('/posts/new')}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t(locale, 'posts.new')}
        </Button>
      </div>

      {/* 排序切换 */}
      <div className="flex rounded-lg bg-muted p-1 mb-4 w-fit">
        <button
          onClick={() => setSortMode('hot')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
            sortMode === 'hot'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Flame className="h-4 w-4" />
          {locale === 'en' ? 'Hot' : '热门'}
        </button>
        <button
          onClick={() => setSortMode('new')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
            sortMode === 'new'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Clock className="h-4 w-4" />
          {locale === 'en' ? 'New' : '最新'}
        </button>
      </div>

      {/* 分类 Chip 标签 */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
        {POST_CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.size === 0 || selectedCategories.has(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all shrink-0',
                selectedCategories.has(cat)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isSelected && selectedCategories.size > 0
                    ? 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                    : 'bg-background text-foreground border-border hover:border-foreground/40'
              )}
            >
              {POST_CATEGORY_LABELS[cat]}
            </button>
          )
        })}
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} userId={userId} showSave />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <MessageSquare className="mb-4 h-12 w-12" />
          <p className="text-lg">{t(locale, 'posts.empty')}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/posts/new')}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t(locale, 'posts.new')}
          </Button>
        </div>
      )}

      {/* 🕶️ 匿名入口 */}
      <div className="mt-12 text-center">
        <button
          onClick={() => router.push('/posts/anonymous')}
          className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          🕶️
        </button>
      </div>
    </div>
  )
}

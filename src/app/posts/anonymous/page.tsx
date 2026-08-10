'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AnonymousPost, AnonymousCategory } from '@/lib/types'
import { ANONYMOUS_CATEGORIES, ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Plus, Flame, Clock, Skull } from 'lucide-react'
import { useState, useEffect } from 'react'
import { AnonymousPostCard } from '@/components/anonymous-post-card'
import { cn } from '@/lib/utils'

type SortMode = 'hot' | 'new'

export default function AnonymousPostsPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [selectedCategory, setSelectedCategory] = useState<AnonymousCategory | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('hot')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: posts, isLoading } = useQuery({
    queryKey: ['anonymous_posts', selectedCategory, sortMode],
    queryFn: async () => {
      let query = supabase
        .from('anonymous_posts')
        .select('*')

      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }

      if (sortMode === 'hot') {
        query = query.order('vote_score', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data } = await query.limit(100)

      const posts = (data as AnonymousPost[]) ?? []

      // Load user votes
      if (userId && posts.length > 0) {
        const { data: votes } = await supabase
          .from('anonymous_post_votes')
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 顶部暗黑标语 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-500/50 text-xs font-mono">
            <Skull className="h-3 w-3" />
            <span>地下频道 · 匿名发言 · 不代表本站立场</span>
            <Skull className="h-3 w-3" />
          </div>
          <h1 className="text-3xl font-bold font-mono text-emerald-400 mt-3">
            🕶️ 地下板块
          </h1>
          <p className="text-zinc-600 text-xs mt-1 font-mono">
            ANONYMOUS ZONE · {locale === 'en' ? 'SPEAK FREELY' : '畅所欲言'}
          </p>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/posts')}
            className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-400 font-mono"
          >
            <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back to Posts' : '返回帖子'}
          </button>
          <Button
            onClick={() => router.push('/posts/anonymous/new')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-mono text-xs"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {locale === 'en' ? 'Anonymous Post' : '匿名发言'}
          </Button>
        </div>

        {/* 排序切换 (暗黑风) */}
        <div className="flex rounded-lg bg-zinc-900 p-1 mb-4 w-fit border border-zinc-800">
          <button
            onClick={() => setSortMode('hot')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-mono transition-all',
              sortMode === 'hot'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            HOT
          </button>
          <button
            onClick={() => setSortMode('new')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-mono transition-all',
              sortMode === 'new'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            NEW
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full border border-zinc-800 whitespace-nowrap transition-all shrink-0 font-mono',
              !selectedCategory
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            )}
          >
            ALL
          </button>
          {ANONYMOUS_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border border-zinc-800 whitespace-nowrap transition-all shrink-0 font-mono',
                selectedCategory === cat
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {ANONYMOUS_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* 帖子列表 */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-zinc-900" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map(post => (
              <AnonymousPostCard key={post.id} post={post} userId={userId} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-zinc-700">
            <Skull className="mb-4 h-12 w-12" />
            <p className="text-lg font-mono">{locale === 'en' ? 'No whispers yet...' : '还没有人说话...'}</p>
            <Button
              onClick={() => router.push('/posts/anonymous/new')}
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {locale === 'en' ? 'Start the conversation' : '成为第一个'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

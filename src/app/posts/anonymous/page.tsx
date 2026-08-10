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
import { ArrowLeft, Plus, Flame, Clock, EyeOff, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { AnonymousPostCard } from '@/components/anonymous-post-card'
import { ForceDark } from '@/components/force-dark'
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
    <ForceDark>
    <div className="min-h-screen bg-background text-gray-200">
      {/* 微妙发光背景 */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.06),transparent_50%)]" />

      <div className="relative mx-auto max-w-3xl px-4 py-8">
        {/* 顶部暗黑标语 — 地下论坛氛围 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3 px-5 py-2 rounded-full bg-[#1a1a2e] border border-purple-500/20 shadow-[0_0_20px_rgba(124,58,237,0.06)]">
            <Sparkles className="h-3 w-3 text-purple-400/60" />
            <span className="text-xs text-purple-400/70 tracking-wide">
              匿名發言 · 暢所欲言 · 不代表本站立場
            </span>
            <Sparkles className="h-3 w-3 text-purple-400/60" />
          </div>
          <h1 className="text-4xl font-bold text-purple-300 mt-3 tracking-tight">
            🕶️ 地下頻道
          </h1>
          <p className="text-gray-600 text-xs mt-1 tracking-widest uppercase">
            The Underground · {locale === 'en' ? 'Speak Freely' : '暢所欲言'}
          </p>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/posts')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back to Posts' : '返回帖子'}
          </button>
          <Button
            onClick={() => router.push('/posts/anonymous/new')}
            className="bg-purple-600 hover:bg-purple-500 text-white border-0 text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.4)]"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {locale === 'en' ? 'Whisper' : '匿名發言'}
          </Button>
        </div>

        {/* 排序切换 */}
        <div className="flex rounded-lg bg-[#1a1a2e] p-1 mb-4 w-fit border border-purple-500/10">
          <button
            onClick={() => setSortMode('hot')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs transition-all',
              sortMode === 'hot'
                ? 'bg-purple-500/15 text-purple-400 shadow-sm'
                : 'text-gray-600 hover:text-gray-400'
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            {locale === 'en' ? 'HOT' : '熱門'}
          </button>
          <button
            onClick={() => setSortMode('new')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs transition-all',
              sortMode === 'new'
                ? 'bg-purple-500/15 text-purple-400 shadow-sm'
                : 'text-gray-600 hover:text-gray-400'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {locale === 'en' ? 'NEW' : '最新'}
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all shrink-0',
              !selectedCategory
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'bg-[#1a1a2e] text-gray-500 hover:text-gray-300 border-purple-500/10'
            )}
          >
            {locale === 'en' ? 'ALL' : '全部'}
          </button>
          {ANONYMOUS_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all shrink-0',
                selectedCategory === cat
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-[#1a1a2e] text-gray-500 hover:text-gray-300 border-purple-500/10'
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
              <Skeleton key={i} className="h-32 rounded-xl bg-[#1a1a2e]" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map(post => (
              <AnonymousPostCard key={post.id} post={post} userId={userId} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-gray-700">
            <EyeOff className="mb-4 h-12 w-12 opacity-40" />
            <p className="text-lg text-gray-600">
              {locale === 'en' ? 'No whispers yet...' : '還沒有秘密...'}
            </p>
            <Button
              onClick={() => router.push('/posts/anonymous/new')}
              className="mt-4 bg-purple-600 hover:bg-purple-500 text-white border-0 text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              <Plus className="h-4 w-4 mr-1" />
              {locale === 'en' ? 'Start the conversation' : '成為第一個'}
            </Button>
          </div>
        )}

        {/* 底部：回到主站链接 */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/posts')}
            className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
          >
            ← {locale === 'en' ? 'Return to main board' : '回到主站論壇'}
          </button>
        </div>
      </div>
    </div>
    </ForceDark>
  )
}

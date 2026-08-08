'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/lib/types'
import { PostCard } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PostsPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [categoryFilter, setCategoryFilter] = useState<string>('全部')

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (categoryFilter !== '全部') {
        query = query.eq('category', categoryFilter)
      }

      const { data } = await query
      return (data as Post[]) ?? []
    },
  })

  const categories = ['全部', '赛事讨论', '经验分享', '求组队', '其他']

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

      {/* 分类筛选 */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground whitespace-nowrap">{t(locale, 'posts.category')}:</span>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {cat === '全部'
                ? locale === 'en' ? 'All' : locale === 'zh-HK' ? '全部' : '全部'
                : t(locale, `posts.cat.${cat}`)}
            </button>
          ))}
        </div>
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
            <PostCard key={post.id} post={post} />
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
    </div>
  )
}

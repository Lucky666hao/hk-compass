'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { HK_UNIVERSITIES } from '@/lib/university-data'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { GraduationCap, MessageSquare, Users, Star, ChevronRight, ArrowLeft } from 'lucide-react'

export default function CampusPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const { data, isLoading } = useQuery({
    queryKey: ['campus-overview'],
    queryFn: async () => {
      const [postsRes, recruitRes, reviewRes] = await Promise.all([
        supabase.from('posts').select('university_slug').not('university_slug', 'is', null).limit(2000),
        supabase.from('recruitments').select('university_slug').not('university_slug', 'is', null).limit(2000),
        supabase.from('course_reviews').select('university_slug').limit(2000),
      ])

      // 按 slug 统计
      const counts: Record<string, { posts: number; recruits: number; reviews: number }> = {}
      for (const uni of HK_UNIVERSITIES) counts[uni.slug] = { posts: 0, recruits: 0, reviews: 0 }
      for (const p of postsRes.data ?? []) if (p.university_slug && counts[p.university_slug]) counts[p.university_slug].posts++
      for (const r of recruitRes.data ?? []) if (r.university_slug && counts[r.university_slug]) counts[r.university_slug].recruits++
      for (const v of reviewRes.data ?? []) if (v.university_slug && counts[v.university_slug]) counts[v.university_slug].reviews++

      const list = HK_UNIVERSITIES.map((uni) => ({
        uni,
        posts: counts[uni.slug].posts,
        recruits: counts[uni.slug].recruits,
        reviews: counts[uni.slug].reviews,
        total: counts[uni.slug].posts + counts[uni.slug].recruits + counts[uni.slug].reviews,
      }))

      // 按活跃度降序（有内容的学校排前面，缓解空板块观感）
      list.sort((a, b) => b.total - a.total)

      return list
    },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => router.push('/')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === 'en' ? 'Back to Home' : locale === 'zh-HK' ? '返回首頁' : '返回首页'}
      </button>

      {/* 标题 */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <GraduationCap className="mr-3 inline-block h-8 w-8 text-primary" />
          {t(locale, 'campus.title')}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          {t(locale, 'campus.subtitle')}
        </p>
      </div>

      {/* 大学卡片网格 */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map(({ uni, posts, recruits, reviews, total }) => (
            <button
              key={uni.slug}
              onClick={() => router.push(`/campus/${uni.slug}`)}
              className={`text-left p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${uni.bgClass}`}
            >
              {/* 顶部：校名 + logo */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {locale === 'en' ? uni.enName : uni.shortName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {locale === 'en' ? uni.enName : uni.fullName.split('(')[0].trim()}
                  </p>
                </div>
                <span className="text-3xl">{uni.logo}</span>
              </div>

              {/* 三项计数 */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />{posts}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />{recruits}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />{reviews}
                </span>
              </div>

              {/* 查看 */}
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                {t(locale, 'campus.enter')}
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

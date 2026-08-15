'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Post, Recruitment, Competition, CourseReview, PostCategory } from '@/lib/types'
import { POST_CATEGORIES, POST_CATEGORY_LABELS } from '@/lib/types'
import { getUniBySlug, matchUniversity } from '@/lib/university-data'
import { PostCard } from '@/components/post-card'
import { RecruitmentCard } from '@/components/recruitment-card'
import { CourseReviewCard } from '@/components/course-review-card'
import { CourseReviewForm } from '@/components/course-review-form'
import { CompetitionCard } from '@/components/competition-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import { ArrowLeft, GraduationCap, MessageSquare, Users, Star, Trophy, Plus, Search } from 'lucide-react'

type Tab = 'discuss' | 'recruit' | 'review' | 'competition'

export default function CampusSinglePage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('discuss')
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<PostCategory>>(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const uni = getUniBySlug(slug)

  // 社区数据（讨论/组队/评价）
  const { data: community } = useQuery({
    queryKey: ['campus-community', slug],
    queryFn: async () => {
      const [postsRes, recruitRes, reviewRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('university_slug', slug)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('recruitments')
          .select('*')
          .eq('university_slug', slug)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('course_reviews')
          .select('id, university_slug, course_code, course_name, professor_name, rating, difficulty, workload, comment, is_anonymous, created_at')
          .eq('university_slug', slug)
          .order('created_at', { ascending: false })
          .limit(100),
      ])
      return {
        posts: (postsRes.data as Post[]) ?? [],
        recruits: (recruitRes.data as Recruitment[]) ?? [],
        reviews: (reviewRes.data as CourseReview[]) ?? [],
      }
    },
    enabled: !!slug,
  })

  // 比赛数据（复用 uni/[slug] 的查询逻辑）
  const { data: competitions, isLoading: compLoading } = useQuery({
    queryKey: ['campus-competitions', slug],
    queryFn: async () => {
      const upper = slug.toUpperCase()
      const { data: tagged } = await supabase
        .from('competitions')
        .select('*')
        .eq('review_status', 'approved')
        .neq('status', '已结束')
        .contains('target_universities', [upper])
        .order('registration_deadline', { ascending: true, nullsFirst: false })
        .order('date_start', { ascending: true })

      const { data: untagged } = await supabase
        .from('competitions')
        .select('*')
        .eq('review_status', 'approved')
        .neq('status', '已结束')
        .is('target_universities', null)

      const textMatched = (untagged || []).filter((c) => (uni ? matchUniversity(c.title, c.organizer, uni) : false))
      const taggedIds = new Set((tagged || []).map((c) => c.id))
      return [...(tagged || []), ...textMatched.filter((c) => !taggedIds.has(c.id))] as Competition[]
    },
    enabled: !!slug && !!uni,
  })

  if (!uni) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">
          {locale === 'en' ? 'University not found' : locale === 'zh-HK' ? '找不到此大學' : '找不到此大学'}
        </p>
        <button onClick={() => router.push('/campus')} className="mt-4 text-sm text-primary hover:underline">
          ← {t(locale, 'campus.back_to_campus')}
        </button>
      </div>
    )
  }

  const posts = community?.posts ?? []
  const recruits = community?.recruits ?? []
  const reviews = community?.reviews ?? []

  const toggleCategory = (cat: PostCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filteredPosts = useMemo(() => {
    let result = posts
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      )
    }
    if (selectedCategories.size > 0) {
      result = result.filter(p => selectedCategories.has(p.category as PostCategory))
    }
    return result
  }, [posts, searchQuery, selectedCategories])

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'discuss', label: t(locale, 'campus.tab_discuss'), icon: MessageSquare, count: posts.length },
    { key: 'recruit', label: t(locale, 'campus.tab_recruit'), icon: Users, count: recruits.length },
    { key: 'review', label: t(locale, 'campus.tab_review'), icon: Star, count: reviews.length },
    { key: 'competition', label: t(locale, 'campus.tab_competition'), icon: Trophy, count: competitions?.length ?? 0 },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.push('/campus')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t(locale, 'campus.back_to_campus')}
      </button>

      {/* 大学头部（渐变横幅） */}
      <div className={`rounded-2xl p-6 mb-6 bg-gradient-to-r ${uni.color} text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{uni.logo}</span>
          <div>
            <h1 className="text-2xl font-bold">
              {locale === 'en' ? uni.enName : uni.shortName}
            </h1>
            <p className="text-sm text-white/70">
              {locale === 'en' ? uni.enName : uni.fullName.split('(')[0].trim()}
            </p>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="flex rounded-lg bg-muted p-1 gap-1 mb-6 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="text-xs opacity-60">{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* 讨论 tab */}
      {tab === 'discuss' && (
        <div className="space-y-3">
          <Button onClick={() => router.push(`/posts/new?uni=${slug}`)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t(locale, 'posts.new')}
          </Button>

          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'en' ? 'Search posts...' : locale === 'zh-HK' ? '搜尋帖子...' : '搜索帖子...'}
              className="w-full pl-9 pr-8 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* 分类筛选 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 flex-nowrap">
            {POST_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all shrink-0',
                  selectedCategories.has(cat)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                )}
              >
                {POST_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {posts.length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-12 w-12 opacity-30" />} text={t(locale, 'campus.empty_discuss')} />
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {locale === 'en' ? 'No matching posts' : locale === 'zh-HK' ? '無匹配帖子' : '无匹配帖子'}
            </div>
          ) : (
            filteredPosts.map((post) => <PostCard key={post.id} post={post} userId={userId} authorUniSlug={slug} />)
          )}
        </div>
      )}

      {/* 组队 tab */}
      {tab === 'recruit' && (
        <div className="space-y-3">
          <Button onClick={() => router.push(`/recruit/new?uni=${slug}`)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-1.5" />
            {t(locale, 'recruit.new')}
          </Button>
          {recruits.length === 0 ? (
            <EmptyState icon={<Users className="h-12 w-12 opacity-30" />} text={t(locale, 'campus.empty_recruit')} />
          ) : (
            recruits.map((r) => <RecruitmentCard key={r.id} recruitment={r} />)
          )}
        </div>
      )}

      {/* 课程评价 tab */}
      {tab === 'review' && (
        <div className="space-y-4">
          <CourseReviewForm
            universitySlug={slug}
            onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['campus-community', slug] })}
          />
          {reviews.length === 0 ? (
            <EmptyState icon={<Star className="h-12 w-12 opacity-30" />} text={t(locale, 'campus.empty_review')} />
          ) : (
            reviews.map((r) => <CourseReviewCard key={r.id} review={r} />)
          )}
        </div>
      )}

      {/* 比赛 tab */}
      {tab === 'competition' && (
        <div className="space-y-3">
          {compLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : !competitions || competitions.length === 0 ? (
            <EmptyState icon={<Trophy className="h-12 w-12 opacity-30" />} text={t(locale, 'campus.empty_competition')} />
          ) : (
            competitions.map((comp) => <CompetitionCard key={comp.id} competition={comp} />)
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-muted-foreground">
      {icon}
      <p className="text-lg mt-4">{text}</p>
    </div>
  )
}

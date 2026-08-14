'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { HK_UNIVERSITIES, matchUniversity } from '@/lib/university-data'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { GraduationCap, ChevronRight, ArrowLeft } from 'lucide-react'

export default function UniOverviewPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const { data, isLoading } = useQuery({
    queryKey: ['uni-overview'],
    queryFn: async () => {
      // 只拉取有 target_universities 的比赛（减少无关数据），按截止日期排序
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .eq('review_status', 'approved')
        .neq('status', '已结束')
        .not('target_universities', 'is', null)
        .order('registration_deadline', { ascending: true, nullsFirst: false })
        .order('date_start', { ascending: true })

      // 按大学归类
      const grouped = HK_UNIVERSITIES.map((uni) => {
        const uniComps = (comps || []).filter((c) => {
          if (c.target_universities && Array.isArray(c.target_universities)) {
            return c.target_universities.includes(uni.slug.toUpperCase())
          }
          return matchUniversity(c.title, c.organizer, uni)
        })
        return {
          uni,
          competitions: uniComps.slice(0, 5) as Competition[], // 只取前5条做预览
          total: uniComps.length,
        }
      })

      return grouped
    },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 返回 */}
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
          {locale === 'en' ? 'HK University Competitions' : locale === 'zh-HK' ? '香港大專院校比賽' : '香港大专院校比赛'}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          {locale === 'en'
            ? 'Competitions hosted by or for students of Hong Kong\'s 8 public universities.'
            : locale === 'zh-HK'
            ? '香港八大公立院校主辦或面向大學生的比賽。'
            : '香港八大公立院校主办或面向大学生的比赛。'}
        </p>
      </div>

      {/* 大学卡片网格 */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map(({ uni, competitions, total }) => (
            <button
              key={uni.slug}
              onClick={() => router.push(`/uni/${uni.slug}`)}
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

              {/* 比赛数量 */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">{total}</span>
                <span className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'active competitions' : locale === 'zh-HK' ? '個活躍比賽' : '个活跃比赛'}
                </span>
              </div>

              {/* 预览：前3条比赛标题 */}
              {competitions.length > 0 && (
                <div className="space-y-1">
                  {competitions.slice(0, 3).map((comp) => (
                    <div key={comp.id} className="flex items-center gap-1.5 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        comp.fee_type === '有奖金' ? 'bg-amber-500' : comp.fee_type === '付费' ? 'bg-red-400' : 'bg-emerald-400'
                      }`} />
                      <span className="truncate text-muted-foreground">
                        {locale === 'en' && comp.title_en ? comp.title_en : comp.title}
                      </span>
                    </div>
                  ))}
                  {total > 3 && (
                    <p className="text-xs text-muted-foreground pl-3.5 pt-0.5">
                      +{total - 3} {locale === 'en' ? 'more' : locale === 'zh-HK' ? '更多' : '更多'}...
                    </p>
                  )}
                </div>
              )}

              {/* 查看全部 */}
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                {locale === 'en' ? 'View all' : locale === 'zh-HK' ? '查看全部' : '查看全部'}
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 底部统计 */}
      {data && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {locale === 'en'
            ? `${data.reduce((sum, d) => sum + d.total, 0)} competitions across 8 universities`
            : locale === 'zh-HK'
            ? `8所大學共 ${data.reduce((sum, d) => sum + d.total, 0)} 個比賽`
            : `8所大学共 ${data.reduce((sum, d) => sum + d.total, 0)} 个比赛`}
        </div>
      )}
    </div>
  )
}

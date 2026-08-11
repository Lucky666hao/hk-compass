'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { HK_UNIVERSITIES, getUniBySlug, matchUniversity } from '@/lib/university-data'
import { CompetitionCard } from '@/components/competition-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { ArrowLeft, GraduationCap, ExternalLink } from 'lucide-react'

export default function SingleUniPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { locale } = useLocale()

  const uni = getUniBySlug(slug)

  const { data, isLoading } = useQuery({
    queryKey: ['uni', slug],
    queryFn: async () => {
      // 优先用 target_universities 数组做服务端精确筛选
      const { data: tagged } = await supabase
        .from('competitions')
        .select('*')
        .neq('status', '已结束')
        .contains('target_universities', [slug.toUpperCase()])
        .order('registration_deadline', { ascending: true, nullsFirst: false })
        .order('date_start', { ascending: true })

      // 兜底：文本匹配（target_universities 为空的比赛）
      const { data: untagged } = await supabase
        .from('competitions')
        .select('*')
        .neq('status', '已结束')
        .is('target_universities', null)
        .order('registration_deadline', { ascending: true, nullsFirst: false })
        .order('date_start', { ascending: true })

      const textMatched = (untagged || []).filter((c) => {
        if (!uni) return false
        return matchUniversity(c.title, c.organizer, uni)
      })

      // 去重合并
      const taggedIds = new Set((tagged || []).map(c => c.id))
      const merged = [...(tagged || []), ...textMatched.filter(c => !taggedIds.has(c.id))]

      return {
        competitions: merged as Competition[],
        total: merged.length,
        prizeCount: merged.filter((c) => c.fee_type === '有奖金').length,
      }
    },
    enabled: !!slug,
  })

  if (!uni) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">
          {locale === 'en' ? 'University not found' : locale === 'zh-HK' ? '找不到此大學' : '找不到此大学'}
        </p>
        <button
          onClick={() => router.push('/uni')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          ← {locale === 'en' ? 'Back to universities' : locale === 'zh-HK' ? '返回大學列表' : '返回大学列表'}
        </button>
      </div>
    )
  }

  const competitions = data?.competitions ?? []
  const total = data?.total ?? 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.push('/uni')}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === 'en' ? 'All Universities' : locale === 'zh-HK' ? '所有大學' : '所有大学'}
      </button>

      {/* 大学头部信息 */}
      <div className={`rounded-2xl p-6 mb-6 bg-gradient-to-r ${uni.color} text-white`}>
        <div className="flex items-center gap-3 mb-2">
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

        {/* 统计 */}
        {!isLoading && (
          <div className="flex gap-4 mt-4">
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
              <div className="text-xl font-bold">{total}</div>
              <div className="text-xs text-white/80">
                {locale === 'en' ? 'Active' : locale === 'zh-HK' ? '活躍比賽' : '活跃比赛'}
              </div>
            </div>
            {data && data.prizeCount > 0 && (
              <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
                <div className="text-xl font-bold">💰 {data.prizeCount}</div>
                <div className="text-xs text-white/80">
                  {locale === 'en' ? 'With Prizes' : locale === 'zh-HK' ? '有獎金' : '有奖金'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 比赛列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <GraduationCap className="mb-4 h-12 w-12 opacity-30" />
          <p className="text-lg">
            {locale === 'en'
              ? `No active competitions for ${uni.enName} at the moment.`
              : locale === 'zh-HK'
              ? `${uni.shortName}暫時未有活躍比賽。`
              : `${uni.shortName}暂时未有活跃比赛。`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      )}

      {/* 底部 */}
      {total > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {locale === 'en'
            ? `${total} active competitions at ${uni.enName}`
            : locale === 'zh-HK'
            ? `${uni.shortName}共 ${total} 個活躍比賽`
            : `${uni.shortName}共 ${total} 个活跃比赛`}
        </div>
      )}
    </div>
  )
}

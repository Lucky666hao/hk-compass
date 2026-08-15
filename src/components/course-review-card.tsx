'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { CourseReview } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Star } from 'lucide-react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'

/** 5 星评分（只读展示） */
export function StarRating({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${i <= value ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

/** 难度/工作量 5 格条形 */
function Meter({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-4 h-1.5 rounded-full ${i <= value ? 'bg-amber-500' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  )
}

export function CourseReviewCard({ review }: { review: CourseReview }) {
  const { locale } = useLocale()
  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy' : 'M月d日'
  const timeAgo = format(new Date(review.created_at), dateFormat, { locale: dateLocale })

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* 顶部：科目 + 老师 + 时间 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              {review.course_name}
              {review.course_code && (
                <span className="text-xs font-mono text-muted-foreground">{review.course_code}</span>
              )}
            </h3>
            {review.professor_name && (
              <p className="text-xs text-muted-foreground mt-0.5">👨‍🏫 {review.professor_name}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
        </div>

        {/* 评分 + 难度/工作量 */}
        <div className="flex items-center gap-2 mb-2">
          <StarRating value={review.rating} />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{review.rating}.0</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
          <Meter label={t(locale, 'review.difficulty')} value={review.difficulty} />
          <Meter label={t(locale, 'review.workload')} value={review.workload} />
        </div>

        {/* 文字评价 */}
        {review.comment && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{review.comment}</p>
        )}

        {/* 匿名标记 */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            {review.is_anonymous ? '🕶️' : '👤'} {t(locale, review.is_anonymous ? 'review.anonymous' : 'review.named')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

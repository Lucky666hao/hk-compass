'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Recruitment } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Users } from 'lucide-react'

export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  const { locale } = useLocale()

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy' : 'M月d日'
  const timeAgo = format(new Date(recruitment.created_at), dateFormat, { locale: dateLocale })
  const isOpen = recruitment.status === 'open'

  return (
    <Link href={`/recruit/${recruitment.id}`}>
      <Card className="hover:border-primary/40 transition-colors cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5">
              <Users className="h-4 w-4 text-amber-500" />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={isOpen ? 'default' : 'secondary'}
                  className="text-xs shrink-0"
                >
                  {t(locale, isOpen ? 'recruit.status_open' : 'recruit.status_closed') as string}
                </Badge>
                {recruitment.team_size && (
                  <span className="text-xs text-muted-foreground">{recruitment.team_size}</span>
                )}
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>

              <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                {recruitment.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {recruitment.description}
              </p>

              {recruitment.competition_title && (
                <div className="mt-2 text-xs text-primary/70">
                  🏆 {recruitment.competition_title}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

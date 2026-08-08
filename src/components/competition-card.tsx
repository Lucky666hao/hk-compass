'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Bell, Calendar, MapPin, ExternalLink, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhHK, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

interface Props {
  competition: Competition
}

export function CompetitionCard({ competition }: Props) {
  const router = useRouter()
  const { locale } = useLocale()
  const [saved, setSaved] = useState(false)
  const [reminding, setReminding] = useState(false)

  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormatFull = locale === 'en' ? 'MMM d (EEE) HH:mm' : 'M月d日 (EEE) HH:mm'
  const dateFormatLong = locale === 'en' ? 'MMM d, yyyy' : 'yyyy年M月d日'
  const dateFormatShort = locale === 'en' ? 'MMM d' : 'M月d日'

  // 组件挂载时检查是否已收藏
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('saved_competitions')
        .select('id')
        .eq('user_id', user.id)
        .eq('competition_id', competition.id)
        .maybeSingle()
      if (data) setSaved(true)
    }
    check()
  }, [competition.id])

  const deadlineText = competition.registration_deadline
    ? format(new Date(competition.registration_deadline), dateFormatFull, {
        locale: dateLocale,
      })
    : null

  const isUrgent =
    competition.registration_deadline &&
    new Date(competition.registration_deadline).getTime() - Date.now() <
      7 * 24 * 60 * 60 * 1000

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (saved) {
      await supabase
        .from('saved_competitions')
        .delete()
        .eq('user_id', user.id)
        .eq('competition_id', competition.id)
      setSaved(false)
      toast.success(t(locale, 'toast.unsaved'))
    } else {
      await supabase
        .from('saved_competitions')
        .insert({ user_id: user.id, competition_id: competition.id })
      setSaved(true)
      toast.success(t(locale, 'toast.saved'))
    }
  }

  const handleRemind = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    setReminding(true)
    try {
      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        competition_id: competition.id,
        remind_before: '1天前',
      })

      if (error) {
        if (error.code === '23505') {
          toast.error(t(locale, 'toast.reminder_duplicate'))
        } else {
          throw error
        }
      } else {
        toast.success(t(locale, 'toast.reminder_set'))
      }
    } catch {
      toast.error(t(locale, 'toast.reminder_failed'))
    } finally {
      setReminding(false)
    }
  }

  return (
    <Link href={`/competition/${competition.id}`}>
      <Card className="group h-full cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            {/* 类型图标 + 标题 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="shrink-0">
                  {t(locale, `type.${competition.type}`)}
                </Badge>
                {isUrgent && (
                  <Badge variant="destructive" className="shrink-0 animate-pulse">
                    {t(locale, 'card.urgent')}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {locale === 'en' && competition.title_en ? competition.title_en : competition.title}
              </h3>
            </div>

            {/* 收藏按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mr-2 -mt-1"
              onClick={handleSave}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  saved ? 'fill-red-500 text-red-500' : ''
                }`}
              />
            </Button>
          </div>

          {/* 关键信息 */}
          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {format(new Date(competition.date_start), dateFormatLong, {
                  locale: dateLocale,
                })}
                {competition.date_end &&
                  ` — ${format(new Date(competition.date_end), dateFormatShort, { locale: dateLocale })}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{t(locale, `location.${competition.location}`)} · {competition.venue || t(locale, 'detail.deadline_tba')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{t(locale, `fee.${competition.fee_type}`)}</span>
              {competition.prize && (
                <span className="text-amber-600 dark:text-amber-400">
                  🏆 {competition.prize}
                </span>
              )}
            </div>
            {deadlineText && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{t(locale, 'card.deadline', { date: deadlineText })}</span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex items-center gap-2">
            {competition.registration_link ? (
              <Button
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(competition.registration_link!, '_blank')
                }}
              >
                {t(locale, 'card.register')} <ExternalLink className="h-3 w-3" />
              </Button>
            ) : competition.source_url ? (
              <Button
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(competition.source_url!, '_blank')
                }}
              >
                {t(locale, 'card.view_source')} <ExternalLink className="h-3 w-3" />
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleRemind}
              disabled={reminding}
            >
              <Bell className="h-3.5 w-3.5" />
              {reminding ? t(locale, 'card.reminding') : t(locale, 'card.remind_me')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

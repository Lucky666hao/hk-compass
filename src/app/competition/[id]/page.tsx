'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompetitionCard } from '@/components/competition-card'
import { CommentSection } from '@/components/comment-section'
import {
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Heart,
  Bell,
  User,
  DollarSign,
  Trophy,
  ArrowLeft,
  Eye,
  Users,
  Share2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { zhHK, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const [saved, setSaved] = useState(false)
  const [reminded, setReminded] = useState(false)

  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy (EEE)' : 'yyyy年M月d日 (EEE)'
  const dateFormatShort = locale === 'en' ? 'MMM d, yyyy' : 'yyyy年M月d日'
  const dateFormatDay = locale === 'en' ? 'MMM d' : 'M月d日'
  const dateFormatTime = locale === 'en' ? 'MMM d HH:mm' : 'M月d日 HH:mm'

  // 主数据
  const { data: competition, isLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Competition
    },
  })

  // 同类相关比赛
  const { data: related } = useQuery({
    queryKey: ['related', competition?.type, id],
    queryFn: async () => {
      if (!competition) return []
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('type', competition.type)
        .neq('id', id)
        .neq('status', '已结束')
        .order('date_start', { ascending: true })
        .limit(4)
      return (data || []) as Competition[]
    },
    enabled: !!competition,
  })

  // 浏览计数
  useEffect(() => {
    if (!id) return
    const viewed = sessionStorage.getItem(`viewed-${id}`)
    if (viewed) return
    supabase.rpc('increment_view', { competition_id: id }).then(() => {
      sessionStorage.setItem(`viewed-${id}`, '1')
    })
  }, [id])

  // 加载时检查收藏/提醒状态
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [savedRes, remindedRes] = await Promise.all([
        supabase.from('saved_competitions').select('id').eq('user_id', user.id).eq('competition_id', id).maybeSingle(),
        supabase.from('reminders').select('id').eq('user_id', user.id).eq('competition_id', id).maybeSingle(),
      ])
      if (savedRes.data) setSaved(true)
      if (remindedRes.data) setReminded(true)
    }
    check()
  }, [id])

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    if (saved) {
      await supabase.from('saved_competitions').delete().eq('user_id', user.id).eq('competition_id', id)
      setSaved(false); toast.success(t(locale, 'toast.unsaved'))
    } else {
      await supabase.from('saved_competitions').insert({ user_id: user.id, competition_id: id })
      setSaved(true); toast.success(t(locale, 'toast.saved'))
    }
  }

  const handleRemind = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase.from('reminders').insert({
      user_id: user.id, competition_id: id, remind_before: '1天前',
    })
    if (error) {
      if (error.code === '23505') { toast.error(t(locale, 'toast.reminder_duplicate')) } else { toast.error(t(locale, 'toast.reminder_failed')) }
    } else {
      setReminded(true); toast.success(t(locale, 'toast.reminder_set'))
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t(locale, 'detail.share_done'))
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      toast.success(t(locale, 'detail.share_done'))
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  // Not found
  if (!competition) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-xl font-semibold">{t(locale, 'detail.not_found')}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
          {t(locale, 'detail.back_home')}
        </Button>
      </div>
    )
  }

  // 7天阈值
  const isUrgent =
    competition.status === '报名中' &&
    competition.registration_deadline &&
    new Date(competition.registration_deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
    new Date(competition.registration_deadline).getTime() > Date.now()

  const deadlineDistance = competition.registration_deadline
    ? formatDistanceToNow(new Date(competition.registration_deadline), { locale: dateLocale, addSuffix: true })
    : null

  const createdAtDistance = formatDistanceToNow(new Date(competition.created_at), {
    locale: dateLocale,
    addSuffix: true,
  })

  // 描述中的 URL 自动链接
  const formatDescription = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s，。,、\n]+)/g
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary underline break-all">
            {part}
          </a>
        )
      }
      return part
    })
  }

  const typeStr = competition.type ? t(locale, `type.${competition.type}`) : ''
  const statusStr = competition.status ? t(locale, `status.${competition.status}`) : ''
  const locationStr = competition.location ? t(locale, `location.${competition.location}`) : ''
  const feeStr = competition.fee_type ? t(locale, `fee.${competition.fee_type}`) : ''
  const ageStr = competition.age_group ? t(locale, `age.${competition.age_group}`) : ''

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'detail.back')}
      </button>

      {/* === 紧急提示条 === */}
      {isUrgent && (
        <div className="mb-6 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">{t(locale, 'detail.urgent_banner')}</p>
            <p className="text-sm text-muted-foreground">
              {t(locale, 'detail.urgent_hint', { time: deadlineDistance || '' })}
            </p>
          </div>
        </div>
      )}

      {/* === 头部 === */}
      <div className="mb-6">
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="text-sm">
            {typeStr}
          </Badge>
          <Badge
            variant={competition.status === '报名中' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {statusStr}
          </Badge>
          {competition.age_group && (
            <Badge variant="outline" className="text-sm gap-1">
              <Users className="h-3 w-3" />
              {ageStr}
            </Badge>
          )}
          {isUrgent && (
            <Badge variant="destructive" className="animate-pulse text-sm">{t(locale, 'card.urgent')}</Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold sm:text-3xl">
          {locale === 'en' && competition.title_en ? competition.title_en : competition.title}
        </h1>
        {locale !== 'en' && competition.title_en && (
          <p className="mt-1 text-muted-foreground">{competition.title_en}</p>
        )}
      </div>

      {/* 海报 */}
      {competition.poster_url && (
        <div className="mb-6 overflow-hidden rounded-xl border">
          <img
            src={competition.poster_url}
            alt={competition.title}
            className="w-full object-cover max-h-80"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== 左侧：详情 ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* 关键信息卡片 */}
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={<Calendar className="h-4 w-4" />} label={t(locale, 'detail.date')}>
                  <span className="font-medium">
                    {format(new Date(competition.date_start), dateFormat, { locale: dateLocale })}
                    {competition.date_end &&
                      ` — ${format(new Date(competition.date_end), dateFormatDay, { locale: dateLocale })}`}
                  </span>
                </InfoRow>

                {competition.registration_deadline ? (
                  <InfoRow icon={<Clock className="h-4 w-4" />} label={t(locale, 'detail.deadline_label')}>
                    <span className={`font-medium ${isUrgent ? 'text-destructive' : ''}`}>
                      {format(new Date(competition.registration_deadline), dateFormatTime, { locale: dateLocale })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({deadlineDistance})
                    </span>
                  </InfoRow>
                ) : (
                  <InfoRow icon={<Clock className="h-4 w-4" />} label={t(locale, 'detail.deadline_label')}>
                    <span className="text-muted-foreground">{t(locale, 'detail.deadline_tba')}</span>
                  </InfoRow>
                )}

                <InfoRow icon={<MapPin className="h-4 w-4" />} label={t(locale, 'detail.location')}>
                  {locationStr}
                  {competition.venue && <span className="text-muted-foreground"> · {locale === 'en' && competition.venue_en ? competition.venue_en : competition.venue}</span>}
                </InfoRow>

                <InfoRow icon={<DollarSign className="h-4 w-4" />} label={t(locale, 'detail.fee')}>
                  {feeStr}
                  {competition.fee_amount && (
                    <span className="text-muted-foreground"> · {competition.fee_amount}</span>
                  )}
                </InfoRow>

                {competition.organizer && (
                  <InfoRow icon={<User className="h-4 w-4" />} label={t(locale, 'detail.organizer')}>
                    {competition.organizer}
                  </InfoRow>
                )}

                {competition.age_group && (
                  <InfoRow icon={<Users className="h-4 w-4" />} label={t(locale, 'detail.age')}>
                    {ageStr}
                  </InfoRow>
                )}

                {competition.prize && (
                  <InfoRow icon={<Trophy className="h-4 w-4" />} label={t(locale, 'detail.prize_label')}>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {locale === 'en' && competition.prize_en ? competition.prize_en : competition.prize}
                    </span>
                  </InfoRow>
                )}
              </div>

              {/* 状态时间线 */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  {competition.status === '报名中' ? (
                    <>
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" /> {t(locale, 'detail.status.open')}
                      </span>
                      {competition.registration_deadline && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">
                            {format(new Date(competition.registration_deadline), dateFormatDay, { locale: dateLocale })} {t(locale, 'detail.status.deadline')}
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">
                        {format(new Date(competition.date_start), dateFormatDay, { locale: dateLocale })} {t(locale, 'detail.status.start')}
                      </span>
                    </>
                  ) : competition.status === '已结束' ? (
                    <span className="text-muted-foreground">{t(locale, 'detail.status.ended')}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {statusStr}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 比赛描述 */}
          {competition.description && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t(locale, 'detail.description')}
                </h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3 whitespace-pre-wrap">
                  {formatDescription(
                    locale === 'en' && competition.description_en
                      ? competition.description_en
                      : competition.description || ''
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* === 外部链接 CTA === */}
          {(competition.registration_link || competition.source_url) && (
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => window.open((competition.registration_link || competition.source_url)!, '_blank')}
            >
              <ExternalLink className="h-5 w-5" />
              {competition.status === '报名中' && competition.registration_link
                ? t(locale, 'detail.register_btn')
                : t(locale, 'detail.view_source_btn')}
            </Button>
          )}

          {/* === 评论区 === */}
          <CommentSection competitionId={id} />

          {/* 数据来源 */}
          {(competition.source || competition.source_url) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">📌 {t(locale, 'detail.source')}</p>
              {competition.source && (
                <p className="text-sm">{t(locale, 'detail.source_from', { source: competition.source })}</p>
              )}
              {competition.source_url && (
                <a
                  href={competition.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                >
                  {t(locale, 'detail.view_original')} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                {t(locale, 'detail.updated', { date: format(new Date(competition.updated_at), dateFormatShort, { locale: dateLocale }) })}
              </p>
            </div>
          )}

          {/* === 相关比赛推荐 === */}
          {related && related.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-lg">{t(locale, 'detail.related')}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((comp) => (
                  <CompetitionCard key={comp.id} competition={comp} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ===== 右侧：操作栏 ===== */}
        <div className="space-y-4">
          {/* 主要操作 */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* 只有报名中 + deadline未过才显示报名按钮 */}
              {competition.status === '报名中' && competition.registration_link && (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => window.open(competition.registration_link!, '_blank')}
                >
                  {t(locale, 'detail.register_btn')} <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {/* 其他状态显示来源链接 */}
              {(!competition.registration_link || competition.status !== '报名中') && competition.source_url ? (
                <Button
                  className="w-full gap-2"
                  variant="secondary"
                  onClick={() => window.open(competition.source_url!, '_blank')}
                >
                  {t(locale, 'detail.view_source_btn')} <ExternalLink className="h-4 w-4" />
                </Button>
              ) : null}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSave}
              >
                <Heart className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
                {saved ? t(locale, 'detail.saved') : t(locale, 'detail.save')}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleRemind}
                disabled={reminded}
              >
                <Bell className="h-4 w-4" />
                {reminded ? t(locale, 'detail.reminded') : t(locale, 'detail.remind')}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5" />
                {t(locale, 'detail.share')}
              </Button>
            </CardContent>
          </Card>

          {/* 快速信息 */}
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{t(locale, 'detail.views', { count: competition.view_count ?? 0 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {t(locale, 'detail.published', { time: createdAtDistance })}
                </span>
              </div>
              {competition.fee_type === '有奖金' && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium">{t(locale, 'card.prize')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

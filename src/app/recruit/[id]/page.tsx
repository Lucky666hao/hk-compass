'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Recruitment } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Trash2, Ban, Play, Users, Calendar, FileText, Phone, Minus, Plus, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'

export default function RecruitmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy' : 'M月d日'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: recruitment, isLoading } = useQuery({
    queryKey: ['recruitment', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('recruitments')
        .select('*')
        .eq('id', id)
        .single()
      return data as Recruitment | null
    },
  })

  const handleDelete = async () => {
    const { error } = await supabase.from('recruitments').delete().eq('id', id)
    if (error) {
      toast.error(t(locale, 'recruit.delete_failed'))
    } else {
      toast.success(t(locale, 'recruit.delete_success'))
      router.push('/recruit')
    }
  }

  const handleToggleStatus = async () => {
    if (!recruitment) return
    const newStatus = recruitment.status === 'open' ? 'closed' : 'open'
    const { error } = await supabase
      .from('recruitments')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast.error(t(locale, 'recruit.update_failed'))
    } else {
      queryClient.invalidateQueries({ queryKey: ['recruitment', id] })
      toast.success(
        newStatus === 'open'
          ? t(locale, 'recruit.reopen')
          : t(locale, 'recruit.close')
      )
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!recruitment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-muted-foreground py-20">
        <p className="text-lg">{t(locale, 'recruit.not_found') as string}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/recruit')}>
          {t(locale, 'recruit.back_to_list')}
        </Button>
      </div>
    )
  }

  const isAuthor = userId && userId === recruitment.user_id
  const isOpen = recruitment.status === 'open'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'recruit.back_to_list')}
      </button>

      <Card>
        <CardContent className="p-6">
          {/* 头部 */}
          <div className="flex items-start justify-between mb-4">
            <Badge
              variant={isOpen ? 'default' : 'secondary'}
              className={isOpen ? 'bg-amber-500' : ''}
            >
              {t(locale, isOpen ? 'recruit.status_open' : 'recruit.status_closed') as string}
            </Badge>
            {isAuthor && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleStatus}
                  className="text-muted-foreground hover:text-foreground"
                  title={t(locale, isOpen ? 'recruit.close' : 'recruit.reopen') as string}
                >
                  {isOpen ? <Ban className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-muted-foreground hover:text-destructive"
                  title={t(locale, 'recruit.delete_confirm') as string}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">{recruitment.title}</h1>

          {/* 元信息 */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm text-muted-foreground">
            {recruitment.author_email && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recruitment.author_email.split('@')[0]}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(recruitment.created_at), dateFormat, { locale: dateLocale })}
            </span>
            {recruitment.team_size && (
              <span className="flex items-center gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                {recruitment.current_count ?? 0}/{recruitment.team_size}
              </span>
            )}
          </div>

          {/* 当前人数 — 作者可以调整 */}
          {isAuthor && isOpen && recruitment.team_size && (
            <CurrentCountEditor
              recruitmentId={id}
              currentCount={recruitment.current_count ?? 0}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['recruitment', id] })}
              locale={locale}
            />
          )}

          {/* 关联比赛 */}
          {recruitment.competition_title && (
            <div className="mb-4 p-3 rounded-md bg-primary/5 border text-sm">
              {t(locale, 'recruit.competition_linked')}: <span className="text-primary">🏆 {recruitment.competition_title}</span>
            </div>
          )}

          {/* 描述 */}
          <div className="mb-6">
            <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> {t(locale, 'recruit.description')}
            </h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{recruitment.description}</p>
          </div>

          {/* 要求 */}
          {recruitment.requirements && (
            <div className="mb-6">
              <h2 className="text-sm font-medium mb-2 text-muted-foreground">
                {t(locale, 'recruit.requirements')}
              </h2>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{recruitment.requirements}</p>
            </div>
          )}

          {/* 联系方式 */}
          {recruitment.contact && (
            <div className="p-4 rounded-md bg-amber-500/5 border border-amber-500/20">
              <h2 className="text-sm font-medium mb-1 flex items-center gap-1.5 text-amber-600">
                <Phone className="h-3.5 w-3.5" /> {t(locale, 'recruit.contact')}
              </h2>
              <p className="text-sm">{recruitment.contact}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ====== 当前人数编辑器 ======
function CurrentCountEditor({
  recruitmentId,
  currentCount,
  onUpdate,
  locale,
}: {
  recruitmentId: string
  currentCount: number
  onUpdate: () => void
  locale: string
}) {
  const [saving, setSaving] = useState(false)

  const update = async (delta: number) => {
    const next = Math.max(0, currentCount + delta)
    setSaving(true)
    const { error } = await supabase
      .from('recruitments')
      .update({ current_count: next })
      .eq('id', recruitmentId)
    setSaving(false)
    if (!error) onUpdate()
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {locale === 'en' ? 'Current team members' : locale === 'zh-HK' ? '現有隊員數' : '现有队员数'}:
          <span className="ml-2 text-lg font-bold">{currentCount}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => update(-1)}
            disabled={saving || currentCount <= 0}
            className="p-1.5 rounded-md border hover:bg-muted disabled:opacity-30 transition-colors"
            title={locale === 'en' ? 'Decrease' : '减少'}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => update(1)}
            disabled={saving}
            className="p-1.5 rounded-md border hover:bg-muted transition-colors"
            title={locale === 'en' ? 'Increase' : '增加'}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {locale === 'en' ? 'Update whenever someone joins or leaves your team.' : locale === 'zh-HK' ? '有人加入或離開時更新人數。' : '有人加入或离开时更新人数。'}
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Send, Globe, MapPin, Calendar, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TYPES = ['运动', '电竞', '创意摄影设计', 'AI创作', '创业路演', '音乐表演', '其他'] as const
const LOCATIONS = ['线上', '港岛', '九龙', '新界'] as const
const FEE_TYPES = ['免费', '付费', '有奖金'] as const

function toDateInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default function NewCompetitionPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8"><Skeleton className="h-[480px] rounded-xl" /></div>}>
      <NewCompetitionForm />
    </Suspense>
  )
}

function NewCompetitionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const editId = searchParams.get('edit')

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>(TYPES[0])
  const [location, setLocation] = useState<string>(LOCATIONS[0])
  const [feeType, setFeeType] = useState<string>(FEE_TYPES[0])
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [registrationDeadline, setRegistrationDeadline] = useState('')
  const [description, setDescription] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [prize, setPrize] = useState('')
  const [registrationLink, setRegistrationLink] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 登录 + 规则同意 gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/auth/login?redirect=/competition/new')
        return
      }
      setUserId(session.user.id)

      // 新建提交需先同意规则；编辑模式（已提交过）跳过
      if (!editId && localStorage.getItem('comp-rules-agreed') !== '1') {
        router.replace('/competition/rules')
        return
      }
      setLoading(false)
    })
  }, [router, editId])

  // 编辑模式：加载原数据
  useEffect(() => {
    if (!editId) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', editId)
        .eq('submitted_by', session.user.id)
        .single()

      if (error || !data) {
        toast.error(locale === 'en' ? 'Submission not found' : locale === 'zh-HK' ? '找不到該提交' : '找不到该提交')
        router.replace('/competition/mine')
        return
      }
      const c = data as Competition
      if (c.review_status === 'approved') {
        // 已通过的不可再编辑
        router.replace('/competition/mine')
        return
      }

      setTitle(c.title)
      if ((TYPES as readonly string[]).includes(c.type)) setType(c.type)
      if ((LOCATIONS as readonly string[]).includes(c.location)) setLocation(c.location)
      if ((FEE_TYPES as readonly string[]).includes(c.fee_type)) setFeeType(c.fee_type)
      setDateStart(toDateInput(c.date_start))
      setDateEnd(toDateInput(c.date_end))
      setRegistrationDeadline(toDateInput(c.registration_deadline))
      setDescription(c.description || '')
      setOrganizer(c.organizer || '')
      setPrize(c.prize || '')
      setRegistrationLink(c.registration_link || '')
      setPosterUrl(c.poster_url || '')

      setLoadingEdit(false)
    })
  }, [editId, router, locale])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t(locale, 'comp.publish.title_required'))
      return
    }
    if (!dateStart) {
      toast.error(t(locale, 'comp.publish.date_required'))
      return
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(t(locale, 'comp.publish.login_required'))
      setSubmitting(false)
      return
    }

    const payload = {
      title: title.trim(),
      type,
      location,
      fee_type: feeType,
      date_start: new Date(dateStart).toISOString(),
      date_end: dateEnd ? new Date(dateEnd).toISOString() : null,
      registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
      description: description.trim() || null,
      organizer: organizer.trim() || null,
      prize: prize.trim() || null,
      registration_link: registrationLink.trim() || null,
      poster_url: posterUrl.trim() || null,
    }

    let error
    if (editId) {
      // 编辑重提：回到待审核，清空驳回原因
      const res = await supabase
        .from('competitions')
        .update({ ...payload, review_status: 'pending', review_note: null })
        .eq('id', editId)
        .eq('submitted_by', session.user.id)
      error = res.error
    } else {
      const res = await supabase.from('competitions').insert({
        ...payload,
        source: 'community',
        status: '报名中',
        review_status: 'pending',
        submitted_by: session.user.id,
        submitted_at: new Date().toISOString(),
      })
      error = res.error
    }

    setSubmitting(false)
    if (error) {
      console.error(error)
      toast.error(t(locale, 'comp.publish.failed'))
    } else {
      toast.success(locale === 'en' ? 'Submitted for review!' : locale === 'zh-HK' ? '已提交審核！' : '已提交审核！')
      router.push('/competition/mine')
    }
  }

  const labelClass = 'block text-sm font-medium mb-2'

  if (loading || loadingEdit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-10 w-40 mb-6" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'comp.publish.back')}
      </button>

      <h1 className="text-2xl font-bold mb-2">
        {editId
          ? (locale === 'en' ? 'Edit & Resubmit' : locale === 'zh-HK' ? '編輯並重新提交' : '编辑并重新提交')
          : t(locale, 'comp.publish.title')}
      </h1>
      <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        {locale === 'en'
          ? 'This will be reviewed by a human before going live (≈3–5 working days).'
          : locale === 'zh-HK'
          ? '提交後需人工審核（約 3–5 個工作日）通過後才公開展示。'
          : '提交后需人工审核（约 3–5 个工作日）通过后才公开展示。'}
      </p>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* 标题 */}
          <div>
            <label className={labelClass}>{t(locale, 'comp.publish.title_label')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t(locale, 'comp.publish.title_placeholder')} maxLength={200} />
          </div>

          {/* 类型 + 地区 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t(locale, 'comp.publish.type')}</label>
              <div className="flex gap-1.5 flex-wrap">
                {TYPES.map(t_val => (
                  <button key={t_val} type="button" onClick={() => setType(t_val)}
                    className={cn('px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all',
                      type === t_val ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground/30')}>
                    {t(locale, `type.${t_val}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}><MapPin className="h-3.5 w-3.5 inline mr-1" />{t(locale, 'comp.publish.location')}</label>
              <div className="flex gap-1.5 flex-wrap">
                {LOCATIONS.map(l => (
                  <button key={l} type="button" onClick={() => setLocation(l)}
                    className={cn('px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all',
                      location === l ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground/30')}>
                    {t(locale, `location.${l}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}><Calendar className="h-3.5 w-3.5 inline mr-1" />{t(locale, 'comp.publish.start')}</label>
              <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'comp.publish.end')}</label>
              <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'comp.publish.deadline')}</label>
              <Input type="date" value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
            </div>
          </div>

          {/* 费用 + 奖金 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t(locale, 'comp.publish.fee')}</label>
              <div className="flex gap-1.5">
                {FEE_TYPES.map(f => (
                  <button key={f} type="button" onClick={() => setFeeType(f)}
                    className={cn('px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all',
                      feeType === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground/30')}>
                    {t(locale, `fee.${f}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'comp.publish.prize')}</label>
              <Input value={prize} onChange={e => setPrize(e.target.value)}
                placeholder={t(locale, 'comp.publish.prize_placeholder')} />
            </div>
          </div>

          {/* 简介 */}
          <div>
            <label className={labelClass}>{t(locale, 'comp.publish.desc')}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t(locale, 'comp.publish.desc_placeholder')} rows={4} />
          </div>

          {/* 主办方 + 报名链接 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t(locale, 'comp.publish.organizer')}</label>
              <Input value={organizer} onChange={e => setOrganizer(e.target.value)}
                placeholder={t(locale, 'comp.publish.organizer_placeholder')} />
            </div>
            <div>
              <label className={labelClass}><Globe className="h-3.5 w-3.5 inline mr-1" />{t(locale, 'comp.publish.reg_link')}</label>
              <Input value={registrationLink} onChange={e => setRegistrationLink(e.target.value)}
                placeholder="https://..." type="url" />
            </div>
          </div>

          {/* 海报 */}
          <div>
            <label className={labelClass}>{t(locale, 'comp.publish.poster')}</label>
            <Input value={posterUrl} onChange={e => setPosterUrl(e.target.value)}
              placeholder={t(locale, 'comp.publish.poster_placeholder')} type="url" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => router.back()}>
              {t(locale, 'comp.publish.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" />
              {submitting ? t(locale, 'comp.publish.submitting') : t(locale, 'comp.publish.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

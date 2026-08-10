'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Send, Globe, MapPin, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TYPES = ['运动', '电竞', '创意摄影设计', 'AI创作', '创业路演', '音乐表演', '其他'] as const
const LOCATIONS = ['线上', '港岛', '九龙', '新界'] as const
const FEE_TYPES = ['免费', '付费', '有奖金'] as const

export default function NewCompetitionPage() {
  const router = useRouter()
  const { locale } = useLocale()

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

    const { error } = await supabase.from('competitions').insert({
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
      source: 'community',
      status: '报名中',
      submitted_by: session.user.id,
    })

    setSubmitting(false)
    if (error) {
      console.error(error)
      toast.error(t(locale, 'comp.publish.failed'))
    } else {
      toast.success(t(locale, 'comp.publish.success'))
      router.push('/')
    }
  }

  const labelClass = 'block text-sm font-medium mb-2'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'comp.publish.back')}
      </button>

      <h1 className="text-2xl font-bold mb-6">{t(locale, 'comp.publish.title')}</h1>

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

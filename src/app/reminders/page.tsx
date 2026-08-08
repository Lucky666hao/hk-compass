'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition, Reminder } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, ArrowLeft, BellOff, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

export default function RemindersPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [userId, setUserId] = useState<string | null | undefined>(undefined) // undefined = 加载中
  const [sessionLoading, setSessionLoading] = useState(true)

  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormat = locale === 'en' ? 'MMM d' : 'M月d日'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setSessionLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reminders', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*, competitions(*)')
        .eq('user_id', userId)
        .eq('notified', false)
        .order('created_at', { ascending: false })

      return reminders ?? []
    },
    enabled: !!userId,
  })

  const handleRemove = async (reminderId: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', reminderId)
    if (error) {
      toast.error(t(locale, 'toast.reminder_delete_failed'))
    } else {
      toast.success(t(locale, 'toast.reminder_removed'))
      refetch()
    }
  }

  // 加载中
  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // 未登录引导
  if (userId === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t(locale, 'reminders.login_prompt')}</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            {t(locale, 'reminders.login_desc')}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/auth/login?redirect=/reminders')}>{t(locale, 'saved.login_btn')}</Button>
            <Button variant="outline" onClick={() => router.push('/')}>{t(locale, 'saved.browse')}</Button>
          </div>
        </div>
      </div>
    )
  }

  const reminders = data ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'back')}
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t(locale, 'reminders.title')}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Bell className="mb-4 h-12 w-12" />
          <p className="text-lg">{t(locale, 'account.empty_reminders')}</p>
          <p className="text-sm">{t(locale, 'reminders.empty_hint')}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
            {t(locale, 'account.discover')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r: any) => {
            const comp = r.competitions as Competition
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/competition/${comp.id}`} className="hover:text-primary transition-colors">
                      <h3 className="font-medium line-clamp-1">
                        {locale === 'en' && comp.title_en ? comp.title_en : comp.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>
                        {comp.date_start
                          ? format(new Date(comp.date_start), dateFormat, { locale: dateLocale })
                          : ''}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {t(locale, `remind.${r.remind_before}`)}
                      </Badge>
                      {comp.registration_link && (
                        <a
                          href={comp.registration_link}
                          target="_blank"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {t(locale, 'account.go_register')} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(r.id)}
                    className="shrink-0"
                  >
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

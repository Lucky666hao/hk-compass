'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { ArrowLeft, Bell, MessageCircle, ThumbsUp, Flag, Heart, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

const typeIcons: Record<string, React.ElementType> = {
  comment: MessageCircle,
  reply: MessageCircle,
  vote: ThumbsUp,
  reaction: Heart,
  report_resolved: Flag,
  competition_match: Trophy,
  moderation: Flag,
}

export default function NotificationsPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!userId) return []
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data as Notification[]) ?? []
    },
    enabled: !!userId,
  })

  const markAllRead = async () => {
    if (!userId) return
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    if (n.link) router.push(n.link)
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        <Bell className="mx-auto h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg">{locale === 'en' ? 'Log in to see notifications' : '请先登录'}</p>
        <Button className="mt-4" onClick={() => router.push('/auth/login')}>
          {locale === 'en' ? 'Log in' : '登入'}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back' : '返回'}
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          {locale === 'en' ? 'Notifications' : locale === 'zh-HK' ? '通知' : '通知'}
        </h1>
        {notifications && notifications.some(n => !n.is_read) && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            {locale === 'en' ? 'Mark all read' : locale === 'zh-HK' ? '全部已讀' : '全部已读'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell
            return (
              <Card
                key={n.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-muted/50',
                  !n.is_read && 'border-primary/30 bg-primary/5'
                )}
                onClick={() => handleClick(n)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                    n.is_read ? 'bg-muted' : 'bg-primary/10'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', !n.is_read && 'font-medium')}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(n.created_at), locale === 'en' ? 'MMM d, HH:mm' : 'M月d日 HH:mm', { locale: locale === 'en' ? undefined : zhHK })}
                    </p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>{locale === 'en' ? 'No notifications yet' : locale === 'zh-HK' ? '暫無通知' : '暂无通知'}</p>
        </div>
      )}
    </div>
  )
}

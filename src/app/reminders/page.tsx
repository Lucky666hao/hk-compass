'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition, Reminder } from '@/lib/types'
import { REMIND_LABELS } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, ArrowLeft, BellOff, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'

export default function RemindersPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.push('/auth/login?redirect=/reminders')
      else setUserId(session.user.id)
    })
  }, [router])

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
    if (error) { toast.error('删除失败') } else { toast.success('已取消提醒'); refetch() }
  }

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Skeleton className="h-10 w-40" />
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
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">我的提醒</h1>
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
          <p className="text-lg">暂无提醒</p>
          <p className="text-sm">在比赛详情页点击"提醒我"即可设置提醒</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
            去发现比赛
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
                      <h3 className="font-medium line-clamp-1">{comp.title}</h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>
                        {comp.date_start
                          ? format(new Date(comp.date_start), 'M月d日', { locale: zhHK })
                          : ''}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {REMIND_LABELS[r.remind_before as keyof typeof REMIND_LABELS] || r.remind_before}
                      </Badge>
                      {comp.registration_link && (
                        <a
                          href={comp.registration_link}
                          target="_blank"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          去报名 <ExternalLink className="h-3 w-3" />
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

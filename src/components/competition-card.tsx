'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { TYPE_LABELS, LOCATION_LABELS, FEE_LABELS } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Bell, Calendar, MapPin, ExternalLink, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'

interface Props {
  competition: Competition
}

export function CompetitionCard({ competition }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [reminding, setReminding] = useState(false)

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
    ? format(new Date(competition.registration_deadline), 'M月d日 (EEE) HH:mm', {
        locale: zhHK,
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
      toast.success('已取消收藏')
    } else {
      await supabase
        .from('saved_competitions')
        .insert({ user_id: user.id, competition_id: competition.id })
      setSaved(true)
      toast.success('已收藏')
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
          toast.error('已设置过提醒')
        } else {
          throw error
        }
      } else {
        toast.success('已设置提醒，截止前一天通知你')
      }
    } catch {
      toast.error('设置提醒失败')
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
                  {TYPE_LABELS[competition.type] || competition.type}
                </Badge>
                {isUrgent && (
                  <Badge variant="destructive" className="shrink-0 animate-pulse">
                    即将截止
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {competition.title}
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
                {format(new Date(competition.date_start), 'yyyy年M月d日', {
                  locale: zhHK,
                })}
                {competition.date_end &&
                  ` — ${format(new Date(competition.date_end), 'M月d日', { locale: zhHK })}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{LOCATION_LABELS[competition.location]} · {competition.venue || '待定'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{FEE_LABELS[competition.fee_type]}</span>
              {competition.prize && (
                <span className="text-amber-600 dark:text-amber-400">
                  🏆 {competition.prize}
                </span>
              )}
            </div>
            {deadlineText && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3 shrink-0" />
                <span>报名截止：{deadlineText}</span>
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
                去报名 <ExternalLink className="h-3 w-3" />
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
                查看来源 <ExternalLink className="h-3 w-3" />
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
              {reminding ? '设置中...' : '提醒我'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

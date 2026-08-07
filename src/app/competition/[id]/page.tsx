'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { TYPE_LABELS, LOCATION_LABELS, FEE_LABELS, STATUS_LABELS } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
} from 'lucide-react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import { useState } from 'react'

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [reminded, setReminded] = useState(false)

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

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    if (saved) {
      await supabase.from('saved_competitions').delete().eq('user_id', user.id).eq('competition_id', id)
      setSaved(false); toast.success('已取消收藏')
    } else {
      await supabase.from('saved_competitions').insert({ user_id: user.id, competition_id: id })
      setSaved(true); toast.success('已收藏')
    }
  }

  const handleRemind = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase.from('reminders').insert({
      user_id: user.id, competition_id: id, remind_before: '1天前',
    })
    if (error) {
      if (error.code === '23505') { toast.error('已设置过提醒') } else { toast.error('设置提醒失败') }
    } else {
      setReminded(true); toast.success('已设置提醒，截止前一天通知你')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-xl font-semibold">比赛不存在或已下架</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
          返回首页
        </Button>
      </div>
    )
  }

  const isUrgent = competition.registration_deadline &&
    new Date(competition.registration_deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-sm">
            {TYPE_LABELS[competition.type] || competition.type}
          </Badge>
          <Badge variant={competition.status === '报名中' ? 'default' : 'secondary'}>
            {STATUS_LABELS[competition.status]}
          </Badge>
          {isUrgent && (
            <Badge variant="destructive" className="animate-pulse">即将截止</Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold sm:text-3xl">{competition.title}</h1>
        {competition.title_en && (
          <p className="mt-1 text-muted-foreground">{competition.title_en}</p>
        )}
      </div>

      {/* 海报（如有） */}
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
        {/* 左侧：比赛详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="比赛日期">
                  {format(new Date(competition.date_start), 'yyyy年M月d日 (EEEE)', { locale: zhHK })}
                  {competition.date_end &&
                    ` — ${format(new Date(competition.date_end), 'M月d日', { locale: zhHK })}`}
                </InfoRow>

                {competition.registration_deadline && (
                  <InfoRow icon={<Clock className="h-4 w-4" />} label="报名截止">
                    <span className={isUrgent ? 'text-destructive font-semibold' : ''}>
                      {format(new Date(competition.registration_deadline), 'M月d日 HH:mm', { locale: zhHK })}
                    </span>
                  </InfoRow>
                )}

                <InfoRow icon={<MapPin className="h-4 w-4" />} label="比赛地点">
                  {LOCATION_LABELS[competition.location]} · {competition.venue || '待定'}
                </InfoRow>

                <InfoRow icon={<DollarSign className="h-4 w-4" />} label="参赛费用">
                  {FEE_LABELS[competition.fee_type]}
                  {competition.fee_amount && ` — ${competition.fee_amount}`}
                </InfoRow>

                {competition.organizer && (
                  <InfoRow icon={<User className="h-4 w-4" />} label="主办方">
                    {competition.organizer}
                  </InfoRow>
                )}

                {competition.prize && (
                  <InfoRow icon={<Trophy className="h-4 w-4" />} label="奖金/奖品">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {competition.prize}
                    </span>
                  </InfoRow>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 比赛描述 */}
          {competition.description && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-3">比赛详情</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                  {competition.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 数据来源 */}
          {(competition.source || competition.source_url) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">📌 数据来源</p>
              {competition.source && (
                <p className="text-sm">{competition.source}</p>
              )}
              {competition.source_url && (
                <a
                  href={competition.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                >
                  查看原始页面 <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* 右侧：操作栏 */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {competition.registration_link && (
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(competition.registration_link!, '_blank')}
                >
                  前往报名 <ExternalLink className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSave}
              >
                <Heart className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
                {saved ? '已收藏' : '收藏比赛'}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleRemind}
                disabled={reminded}
              >
                <Bell className="h-4 w-4" />
                {reminded ? '已设置提醒' : '报名截止前提醒我'}
              </Button>
            </CardContent>
          </Card>

          {/* 统计 */}
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{(competition.view_count ?? 0) + 1} 次浏览</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>发布于 {format(new Date(competition.created_at), 'M月d日', { locale: zhHK })}</span>
              </div>
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
    <div className="flex gap-2">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  )
}

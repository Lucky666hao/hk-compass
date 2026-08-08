'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { TYPE_LABELS, LOCATION_LABELS, FEE_LABELS, STATUS_LABELS, AGE_LABELS } from '@/lib/types'
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
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [reminded, setReminded] = useState(false)

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

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('链接已复制到剪贴板')
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      toast.success('链接已复制')
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
        <p className="text-xl font-semibold">比赛不存在或已下架</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
          返回首页
        </Button>
      </div>
    )
  }

  // 7天阈值（与卡片一致）
  const isUrgent =
    competition.status === '报名中' &&
    competition.registration_deadline &&
    new Date(competition.registration_deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
    new Date(competition.registration_deadline).getTime() > Date.now()

  // 距截止还有多久
  const deadlineDistance = competition.registration_deadline
    ? formatDistanceToNow(new Date(competition.registration_deadline), { locale: zhHK, addSuffix: true })
    : null

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      {/* === 紧急提示条 === */}
      {isUrgent && (
        <div className="mb-6 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">报名即将截止</p>
            <p className="text-sm text-muted-foreground">
              {deadlineDistance}截止报名，请尽快提交申请
            </p>
          </div>
        </div>
      )}

      {/* === 头部 === */}
      <div className="mb-6">
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="text-sm">
            {TYPE_LABELS[competition.type] || competition.type}
          </Badge>
          <Badge
            variant={competition.status === '报名中' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {STATUS_LABELS[competition.status]}
          </Badge>
          {competition.age_group && (
            <Badge variant="outline" className="text-sm gap-1">
              <Users className="h-3 w-3" />
              {competition.age_group}
            </Badge>
          )}
          {isUrgent && (
            <Badge variant="destructive" className="animate-pulse text-sm">即将截止</Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold sm:text-3xl">{competition.title}</h1>
        {competition.title_en && (
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
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="比赛日期">
                  <span className="font-medium">
                    {format(new Date(competition.date_start), 'yyyy年M月d日 (EEE)', { locale: zhHK })}
                    {competition.date_end &&
                      ` — ${format(new Date(competition.date_end), 'M月d日', { locale: zhHK })}`}
                  </span>
                </InfoRow>

                {competition.registration_deadline ? (
                  <InfoRow icon={<Clock className="h-4 w-4" />} label="报名截止">
                    <span className={`font-medium ${isUrgent ? 'text-destructive' : ''}`}>
                      {format(new Date(competition.registration_deadline), 'M月d日 HH:mm', { locale: zhHK })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({deadlineDistance})
                    </span>
                  </InfoRow>
                ) : (
                  <InfoRow icon={<Clock className="h-4 w-4" />} label="报名截止">
                    <span className="text-muted-foreground">待公布</span>
                  </InfoRow>
                )}

                <InfoRow icon={<MapPin className="h-4 w-4" />} label="比赛地点">
                  {LOCATION_LABELS[competition.location]}
                  {competition.venue && <span className="text-muted-foreground"> · {competition.venue}</span>}
                </InfoRow>

                <InfoRow icon={<DollarSign className="h-4 w-4" />} label="参赛费用">
                  {FEE_LABELS[competition.fee_type]}
                  {competition.fee_amount && (
                    <span className="text-muted-foreground"> · {competition.fee_amount}</span>
                  )}
                </InfoRow>

                {competition.organizer && (
                  <InfoRow icon={<User className="h-4 w-4" />} label="主办方">
                    {competition.organizer}
                  </InfoRow>
                )}

                {competition.age_group && (
                  <InfoRow icon={<Users className="h-4 w-4" />} label="参赛年龄">
                    {AGE_LABELS[competition.age_group] || competition.age_group}
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

              {/* 状态时间线 */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  {competition.status === '报名中' ? (
                    <>
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" /> 正在接受报名
                      </span>
                      {competition.registration_deadline && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">
                            {format(new Date(competition.registration_deadline), 'M月d日', { locale: zhHK })} 截止报名
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">
                        {format(new Date(competition.date_start), 'M月d日', { locale: zhHK })} 比赛开始
                      </span>
                    </>
                  ) : competition.status === '已结束' ? (
                    <span className="text-muted-foreground">比赛已结束</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {STATUS_LABELS[competition.status]}
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
                  比赛详情
                </h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3 whitespace-pre-wrap">
                  {formatDescription(competition.description)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* === 评论区 === */}
          <CommentSection competitionId={id} />

          {/* 数据来源 */}
          {(competition.source || competition.source_url) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">📌 数据来源</p>
              {competition.source && (
                <p className="text-sm">来源：{competition.source}</p>
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
              <p className="text-xs text-muted-foreground">
                数据更新于 {format(new Date(competition.updated_at), 'yyyy年M月d日', { locale: zhHK })}
              </p>
            </div>
          )}

          {/* === 相关比赛推荐 === */}
          {related && related.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-lg">同类型比赛推荐</h2>
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
              {competition.registration_link ? (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => window.open(competition.registration_link!, '_blank')}
                >
                  前往报名 <ExternalLink className="h-4 w-4" />
                </Button>
              ) : competition.source_url ? (
                <Button
                  className="w-full gap-2"
                  variant="secondary"
                  onClick={() => window.open(competition.source_url!, '_blank')}
                >
                  查看来源 <ExternalLink className="h-4 w-4" />
                </Button>
              ) : null}

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

              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5" />
                复制链接分享
              </Button>
            </CardContent>
          </Card>

          {/* 快速信息 */}
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{competition.view_count ?? 0} 次浏览</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  发布于{' '}
                  {formatDistanceToNow(new Date(competition.created_at), {
                    locale: zhHK,
                    addSuffix: true,
                  })}
                </span>
              </div>
              {competition.fee_type === '有奖金' && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium">有奖金</span>
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

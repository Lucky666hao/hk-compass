'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Competition } from '@/lib/types'
import { CompetitionCard } from '@/components/competition-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Heart,
  Bell,
  Compass,
  LogOut,
  Mail,
  Calendar,
  Clock,
  ArrowLeft,
  BellOff,
  ExternalLink,
  Settings,
  User,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { REMIND_LABELS } from '@/lib/types'

type Tab = 'saved' | 'reminders'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('saved')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('已退出登录')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">你的个人中心</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            登录后管理收藏、提醒和评论。免费注册，无需手机验证。
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/auth/login?redirect=/account')}>登录 / 注册</Button>
            <Button variant="outline" onClick={() => router.push('/')}>先看看比赛</Button>
          </div>
        </div>
      </div>
    )
  }

  const initials = user.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.push('/')}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回首页
      </button>

      {/* === 个人信息卡片 === */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{user.email}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                注册于 {format(new Date(user.created_at), 'yyyy年M月d日', { locale: zhHK })}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> 退出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === Tab 切换 === */}
      <div className="flex rounded-lg bg-muted p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all ${
            activeTab === 'saved'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className="h-4 w-4" />
          已收藏
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all ${
            activeTab === 'reminders'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4" />
          我的提醒
        </button>
      </div>

      {/* === 内容区 === */}
      {activeTab === 'saved' ? (
        <SavedList userId={user.id} />
      ) : (
        <RemindersList userId={user.id} />
      )}
    </div>
  )
}

// ===== 收藏列表 =====
function SavedList({ userId }: { userId: string }) {
  const router = useRouter()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: saved } = await supabase
        .from('saved_competitions')
        .select('competition_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!saved?.length) { setCompetitions([]); setLoading(false); return }

      const ids = saved.map((s) => s.competition_id)
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .in('id', ids)

      // 保持收藏顺序
      const map = new Map((data || []).map((c: any) => [c.id, c]))
      setCompetitions(ids.map((id) => map.get(id)).filter(Boolean) as Competition[])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  if (competitions.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Heart className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">还没有收藏任何比赛</p>
        <p className="text-sm mt-1">浏览比赛时点击 ❤️ 即可收藏</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/')}>
          <Compass className="mr-2 h-4 w-4" />
          去发现比赛
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {competitions.map((comp) => (
        <CompetitionCard key={comp.id} competition={comp} />
      ))}
    </div>
  )
}

// ===== 提醒列表 =====
function RemindersList({ userId }: { userId: string }) {
  const router = useRouter()
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reminders')
      .select('*, competitions(*)')
      .eq('user_id', userId)
      .eq('notified', false)
      .order('created_at', { ascending: false })

    setReminders(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  const handleRemove = async (reminderId: string) => {
    await supabase.from('reminders').delete().eq('id', reminderId)
    toast.success('已取消提醒')
    load()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Bell className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">暂无提醒</p>
        <p className="text-sm mt-1">在比赛详情页设置提醒，不会错过报名截止</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/')}>
          <Compass className="mr-2 h-4 w-4" />
          去发现比赛
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reminders.map((r: any) => {
        const comp = r.competitions as Competition
        if (!comp) return null
        return (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/competition/${comp.id}`}
                  className="font-medium hover:text-primary transition-colors line-clamp-1"
                >
                  {comp.title}
                </Link>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  {comp.date_start && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(comp.date_start), 'M月d日', { locale: zhHK })}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {REMIND_LABELS[r.remind_before as keyof typeof REMIND_LABELS] || r.remind_before}
                  </Badge>
                  {comp.registration_link && (
                    <a
                      href={comp.registration_link}
                      target="_blank"
                      className="flex items-center gap-1 text-primary hover:underline ml-auto"
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
                title="取消提醒"
              >
                <BellOff className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

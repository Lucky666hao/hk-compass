'use client'

import { useState, useEffect, Suspense } from 'react'
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
  Bookmark,
  MessageSquare,
  FileText,
  PlusCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhHK, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { useQuery } from '@tanstack/react-query'

type Tab = 'saved' | 'reminders' | 'saved_posts' | 'my_posts' | 'my_comps'

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><Skeleton className="h-10 w-40" /></div>}>
      <AccountPageInner />
    </Suspense>
  )
}

function AccountPageInner() {
  const router = useRouter()
  const { locale } = useLocale()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('saved')

  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy' : 'yyyy年M月d日'

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
    toast.success(t(locale, 'toast.signout_success'))
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
          <h2 className="text-xl font-semibold mb-2">{t(locale, 'account.no_login_title')}</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            {t(locale, 'account.no_login_desc')}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/auth/login?redirect=/account')}>{t(locale, 'saved.login_btn')}</Button>
            <Button variant="outline" onClick={() => router.push('/')}>{t(locale, 'saved.browse')}</Button>
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
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'account.back')}
      </button>

      {/* === 个人信息卡片 === */}
      <Card className="mb-4">
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
                {t(locale, 'account.joined', { date: format(new Date(user.created_at), dateFormat, { locale: dateLocale }) })}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> {t(locale, 'account.signout')}
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
          {t(locale, 'account.saved_tab')}
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
          {t(locale, 'account.reminders_tab')}
        </button>
        <button
          onClick={() => setActiveTab('saved_posts')}
          className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all ${
            activeTab === 'saved_posts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          {t(locale, 'account.saved_posts_tab')}
        </button>
        <button
          onClick={() => setActiveTab('my_posts')}
          className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all ${
            activeTab === 'my_posts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          {locale === 'en' ? 'My Posts' : locale === 'zh-HK' ? '我的帖子' : '我的帖子'}
        </button>
        <button
          onClick={() => setActiveTab('my_comps')}
          className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all ${
            activeTab === 'my_comps'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          {locale === 'en' ? 'My Competitions' : locale === 'zh-HK' ? '我發佈嘅比賽' : '我发布的比赛'}
        </button>
      </div>

      {/* === 内容区 === */}
      {activeTab === 'saved' ? (
        <SavedList userId={user.id} />
      ) : activeTab === 'reminders' ? (
        <RemindersList userId={user.id} />
      ) : activeTab === 'saved_posts' ? (
        <SavedPostsList userId={user.id} />
      ) : activeTab === 'my_posts' ? (
        <MyPostsList userId={user.id} />
      ) : (
        <MyCompetitionsList userId={user.id} />
      )}
    </div>
  )
}

// ===== 收藏列表 =====
function SavedList({ userId }: { userId: string }) {
  const router = useRouter()
  const { locale } = useLocale()
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
        <p className="text-lg font-medium">{t(locale, 'account.empty_saved')}</p>
        <p className="text-sm mt-1">{t(locale, 'account.empty_saved_hint')}</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/')}>
          <Compass className="mr-2 h-4 w-4" />
          {t(locale, 'account.discover')}
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
  const { locale } = useLocale()
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const dateLocale = locale === 'en' ? enUS : zhHK
  const dateFormat = locale === 'en' ? 'MMM d' : 'M月d日'

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
    toast.success(t(locale, 'toast.reminder_removed'))
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
        <p className="text-lg font-medium">{t(locale, 'account.empty_reminders')}</p>
        <p className="text-sm mt-1">{t(locale, 'account.empty_reminders_hint')}</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/')}>
          <Compass className="mr-2 h-4 w-4" />
          {t(locale, 'account.discover')}
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
                  {locale === 'en' && comp.title_en ? comp.title_en : comp.title}
                </Link>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  {comp.date_start && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(comp.date_start), dateFormat, { locale: dateLocale })}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {t(locale, `remind.${r.remind_before}`)}
                  </Badge>
                  {comp.registration_link && (
                    <a
                      href={comp.registration_link}
                      target="_blank"
                      className="flex items-center gap-1 text-primary hover:underline ml-auto"
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
                title={t(locale, 'reminders.remove')}
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

// ===== 我的帖子列表 =====
function MyPostsList({ userId }: { userId: string }) {
  const router = useRouter()
  const { locale } = useLocale()

  const { data: posts, isLoading } = useQuery({
    queryKey: ['my_posts', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      return data || []
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!posts?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <FileText className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{locale === 'en' ? 'No posts yet' : locale === 'zh-HK' ? '仲未有帖子' : '还没有帖子'}</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/posts')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {locale === 'en' ? 'Go to Community' : locale === 'zh-HK' ? '去社區' : '去社区'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post: any) => (
        <Link key={post.id} href={`/posts/${post.id}`}>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {t(locale, `posts.cat.${post.category}`)}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {post.vote_score ?? 0} 👍
                </span>
              </div>
              <h3 className="font-medium line-clamp-1">{post.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// ===== 我发布的比赛列表 =====
function MyCompetitionsList({ userId }: { userId: string }) {
  const router = useRouter()
  const { locale } = useLocale()

  const { data: comps, isLoading } = useQuery({
    queryKey: ['my_comps', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data || []) as Competition[]
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!comps?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <PlusCircle className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{locale === 'en' ? 'No competitions published' : locale === 'zh-HK' ? '仲未發佈過比賽' : '还没有发布过比赛'}</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/competition/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {locale === 'en' ? 'Publish One' : locale === 'zh-HK' ? '發佈比賽' : '发布比赛'}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {comps.map((comp) => (
        <CompetitionCard key={comp.id} competition={comp} />
      ))}
    </div>
  )
}

// ===== 已收藏帖子列表 =====
function SavedPostsList({ userId }: { userId: string }) {
  const router = useRouter()
  const { locale } = useLocale()

  const { data: posts, isLoading } = useQuery({
    queryKey: ['saved_posts', userId],
    queryFn: async () => {
      const { data: saved } = await supabase
        .from('saved_posts')
        .select('post_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!saved?.length) return []

      const ids = saved.map(s => s.post_id)
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .in('id', ids)

      // Keep save order
      const map = new Map((postData || []).map((p: any) => [p.id, p]))
      return ids.map(id => map.get(id)).filter(Boolean) as any[]
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!posts?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Bookmark className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{t(locale, 'account.empty_saved_posts')}</p>
        <p className="text-sm mt-1">{t(locale, 'account.empty_saved_posts_hint')}</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/posts')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t(locale, 'account.go_posts')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post: any) => (
        <Link key={post.id} href={`/posts/${post.id}`}>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {t(locale, `posts.cat.${post.category}`)}
                </Badge>
              </div>
              <h3 className="font-medium line-clamp-1">{post.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

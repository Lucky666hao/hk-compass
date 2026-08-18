'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Megaphone, Flag, Mail, ClipboardCheck, MessageSquare, Star, Users, EyeOff, Sparkles, Trophy } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/auth/login')
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single()
      if (error || !data?.is_admin) {
        router.replace('/')
      } else {
        setIsAdmin(true)
      }
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t(locale, 'admin.checking')}</p>
      </div>
    )
  }

  const tabs = [
    { key: 'dashboard', href: '/admin', icon: LayoutDashboard, label: t(locale, 'admin.dashboard') },
    { key: 'review', href: '/admin/review', icon: ClipboardCheck, label: locale === 'en' ? 'Review' : locale === 'zh-HK' ? '審核' : '审核' },
    { key: 'featured', href: '/admin/featured', icon: Sparkles, label: locale === 'en' ? 'Featured' : locale === 'zh-HK' ? '推薦' : '推荐' },
    { key: 'competitions', href: '/admin/competitions', icon: Trophy, label: locale === 'en' ? 'Competitions' : locale === 'zh-HK' ? '比賽' : '比赛' },
    { key: 'posts', href: '/admin/posts', icon: MessageSquare, label: t(locale, 'admin.posts') },
    { key: 'recruitments', href: '/admin/recruitments', icon: Users, label: locale === 'en' ? 'Recruitment' : locale === 'zh-HK' ? '組隊' : '组队' },
    { key: 'reviews', href: '/admin/reviews', icon: Star, label: t(locale, 'admin.reviews') },
    { key: 'announcements', href: '/admin/announcements', icon: Megaphone, label: t(locale, 'admin.announcements') },
    { key: 'reports', href: '/admin/reports', icon: Flag, label: t(locale, 'admin.reports') },
    { key: 'anonymous', href: '/admin/anonymous', icon: EyeOff, label: locale === 'en' ? 'Underground' : locale === 'zh-HK' ? '地下頻道' : '地下频道' },
    { key: 'feedback', href: '/admin/feedback', icon: Mail, label: locale === 'en' ? 'Feedback' : locale === 'zh-HK' ? '反饋' : '反馈' },
  ]

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t(locale, 'admin.title')}</h1>

      {/* Tab 导航条 — 跟 account page 一致的 button-bar 模式 */}
      <div className="mb-8">
        <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
          {tabs.map((tab) => {
            const active = tab.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(tab.href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}

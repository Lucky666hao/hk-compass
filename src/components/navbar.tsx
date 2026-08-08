'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useLocale } from '@/i18n/LanguageContext'
import { type Locale, LOCALE_LABELS, LOCALE_FLAGS } from '@/i18n/translations'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Compass, LogOut, Heart, Bell, User, Languages, Check } from 'lucide-react'

const LANGUAGES: { value: Locale; label: string; flag: string }[] = [
  { value: 'en', label: LOCALE_LABELS['en'], flag: LOCALE_FLAGS['en'] },
  { value: 'zh-CN', label: LOCALE_LABELS['zh-CN'], flag: LOCALE_FLAGS['zh-CN'] },
  { value: 'zh-HK', label: LOCALE_LABELS['zh-HK'], flag: LOCALE_FLAGS['zh-HK'] },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, setLocale } = useLocale()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navLogin =
    locale === 'en' ? 'Log In'
    : locale === 'zh-HK' ? '登入'
    : '登录'

  const navAccount =
    locale === 'en' ? 'Account'
    : locale === 'zh-HK' ? '個人中心'
    : '个人中心'

  const navSaved =
    locale === 'en' ? 'Saved'
    : locale === 'zh-HK' ? '已收藏'
    : '已收藏'

  const navReminders =
    locale === 'en' ? 'Reminders'
    : locale === 'zh-HK' ? '我的提醒'
    : '我的提醒'

  const navSignOut =
    locale === 'en' ? 'Sign Out'
    : locale === 'zh-HK' ? '登出'
    : '退出'

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Compass className="h-5 w-5 text-primary" />
          <span>HK Compass</span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* 语言切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors outline-none">
              <Languages className="h-4 w-4" />
              <span className="text-xs">{LOCALE_FLAGS[locale]} <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span></span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => setLocale(lang.value)}
                  className="flex items-center gap-2"
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {locale === lang.value && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/reminders">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Bell className="h-4 w-4" />
                      <span className="hidden sm:inline">{navReminders}</span>
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-full size-8 hover:bg-muted transition-colors outline-none">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {user.email?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                        {user.email}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/account')}>
                        <User className="mr-2 h-4 w-4" />
                        {navAccount}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/saved')}>
                        <Heart className="mr-2 h-4 w-4" />
                        {navSaved}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/reminders')}>
                        <Bell className="mr-2 h-4 w-4" />
                        {navReminders}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {navSignOut}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => router.push('/auth/login')}>
                  {navLogin}
                </Button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

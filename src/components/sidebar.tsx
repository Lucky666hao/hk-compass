'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from '@/i18n/translations'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  Compass,
  MessageSquare,
  Users,
  MessageCircle,
  Globe,
  LogOut,
  Menu,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// SidebarContext
// ============================================
type SidebarContextType = {
  collapsed: boolean
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('hk-compass-sidebar')
    if (stored === 'collapsed') setCollapsed(true)
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('hk-compass-sidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }, [])

  const ctx = {
    collapsed: mounted ? collapsed : false,
    toggle,
    mobileOpen,
    setMobileOpen,
  }

  return (
    <SidebarContext.Provider value={ctx}>
      {children}
    </SidebarContext.Provider>
  )
}

// ============================================
// 导航项定义
// ============================================
interface NavItem {
  key: string
  href: string
  icon: React.ElementType
  colorClass: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'sidebar.discover', href: '/', icon: Compass, colorClass: 'text-blue-500' },
  { key: 'sidebar.posts', href: '/posts', icon: MessageSquare, colorClass: 'text-emerald-500' },
  { key: 'sidebar.recruit', href: '/recruit', icon: Users, colorClass: 'text-amber-500' },
  { key: 'sidebar.chat', href: '/chat', icon: MessageCircle, colorClass: 'text-violet-500' },
]

// ============================================
// Sidebar 主组件
// ============================================
export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { locale, setLocale } = useLocale()

  return (
    <>
      {/* 移动端顶部条 */}
      <MobileHeader />

      {/* 桌面端侧栏 */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-40',
          'bg-sidebar border-r border-sidebar-border',
          'transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <SidebarInner
          collapsed={collapsed}
          toggle={toggle}
          pathname={pathname}
          router={router}
          locale={locale}
          setLocale={setLocale}
        />
      </aside>

      {/* 移动端 Sheet */}
      <MobileSheet
        pathname={pathname}
        router={router}
        locale={locale}
        setLocale={setLocale}
      />
    </>
  )
}

// ============================================
// 侧栏内部内容
// ============================================
function SidebarInner({
  collapsed,
  toggle,
  pathname,
  router,
  locale,
  setLocale,
}: {
  collapsed: boolean
  toggle: () => void
  pathname: string
  router: ReturnType<typeof useRouter>
  locale: Locale
  setLocale: (l: Locale) => void
}) {
  const [user, setUser] = useState<any>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success(t(locale, 'toast.signout_success'))
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Compass className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sidebar-foreground text-sm whitespace-nowrap">
            HK Compass
          </span>
        )}
      </div>

      {/* 导航 */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <NavItemLink
              key={item.key}
              collapsed={collapsed}
              item={item}
              active={active}
              Icon={Icon}
              locale={locale}
            />
          )
        })}
      </nav>

      {/* 底部 */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {/* 语言切换 */}
        <LangSwitcher collapsed={collapsed} locale={locale} setLocale={setLocale} />

        {/* 用户区 */}
        {user === undefined ? (
          <div className={cn('flex items-center rounded-md px-2 py-2', collapsed && 'justify-center')}>
            <div className="w-6 h-6 rounded-full bg-sidebar-accent animate-pulse" />
          </div>
        ) : user === null ? (
          <Tooltip disabled={!collapsed}>
            <TooltipTrigger>
              <button
                onClick={() => router.push('/auth/login')}
                className={cn(
                  'w-full flex items-center rounded-md px-2 py-2 text-sm',
                  'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
                  collapsed && 'justify-center'
                )}
              >
                <User className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="ml-2.5 truncate">{t(locale, 'sidebar.login')}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t(locale, 'sidebar.login')}</TooltipContent>}
          </Tooltip>
        ) : (
          <div className={cn('flex items-center rounded-md px-2 py-1.5', collapsed && 'justify-center')}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-foreground">
                {user.email?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="text-xs text-sidebar-foreground/60 truncate flex-1 ml-2.5">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="shrink-0 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                  title={t(locale, 'nav.signout')}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* 折叠按钮 */}
        <button
          onClick={toggle}
          className={cn(
            'w-full flex items-center rounded-md px-2 py-2 text-sm',
            'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="ml-2.5">{t(locale, 'sidebar.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================
// 单个导航链接
// ============================================
function NavItemLink({
  collapsed,
  item,
  active,
  Icon,
  locale,
}: {
  collapsed: boolean
  item: NavItem
  active: boolean
  Icon: React.ElementType
  locale: Locale
}) {
  const label = t(locale, item.key)

  const link = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center rounded-md px-2 py-2.5 text-sm transition-colors',
        collapsed ? 'justify-center' : 'gap-2.5',
        active
          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active && item.colorClass)} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip key={item.key}>
        <TooltipTrigger>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return <div key={item.key}>{link}</div>
}

// ============================================
// 语言切换
// ============================================
function LangSwitcher({
  collapsed,
  locale,
  setLocale,
}: {
  collapsed: boolean
  locale: Locale
  setLocale: (l: Locale) => void
}) {
  const locales: Locale[] = ['en', 'zh-CN', 'zh-HK']

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <button
            onClick={() => {
              const idx = locales.indexOf(locale)
              setLocale(locales[(idx + 1) % locales.length])
            }}
            className={cn(
              'w-full flex items-center justify-center rounded-md px-2 py-2',
              'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors'
            )}
          >
            <Globe className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{LOCALE_LABELS[locale]}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Globe className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="flex-1 bg-transparent text-xs text-sidebar-foreground/60 border-none outline-none cursor-pointer hover:text-sidebar-foreground"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-background text-foreground">
            {LOCALE_FLAGS[l]} {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  )
}

// ============================================
// 移动端顶部条
// ============================================
function MobileHeader() {
  const { setMobileOpen } = useSidebar()

  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center h-12 px-3 bg-background border-b">
      <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2 ml-2">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
          <Compass className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">HK Compass</span>
      </div>
    </div>
  )
}

// ============================================
// 移动端 Sheet
// ============================================
function MobileSheet({
  pathname,
  router,
  locale,
  setLocale,
}: {
  pathname: string
  router: ReturnType<typeof useRouter>
  locale: Locale
  setLocale: (l: Locale) => void
}) {
  const { mobileOpen, setMobileOpen } = useSidebar()

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-sidebar-border">
        <SidebarInner
          collapsed={false}
          toggle={() => {}}
          pathname={pathname}
          router={router}
          locale={locale}
          setLocale={(l) => {
            setLocale(l)
            setMobileOpen(false)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// SidebarInset — 主内容区，根据侧栏状态自动调整
// ============================================
export function SidebarInset({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col min-h-screen transition-all duration-200',
        collapsed ? 'lg:ml-16' : 'lg:ml-56',
        'pt-12 lg:pt-0'
      )}
    >
      {children}
    </div>
  )
}

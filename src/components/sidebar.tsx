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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Compass,
  MessageSquare,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  LogOut,
  Menu,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// SidebarContext — 展开/收起状态
// ============================================
type SidebarContextType = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('hk-compass-sidebar')
    if (stored === 'collapsed') setCollapsedState(true)
    setMounted(true)
  }, [])

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v)
    localStorage.setItem('hk-compass-sidebar', v ? 'collapsed' : 'expanded')
  }, [])

  if (!mounted) {
    return (
      <SidebarContext.Provider value={{ collapsed: false, setCollapsed, mobileOpen: false, setMobileOpen }}>
        {children}
      </SidebarContext.Provider>
    )
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
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
  { key: 'sidebar.discover', href: '/', icon: Compass, colorClass: 'text-blue-400' },
  { key: 'sidebar.posts', href: '/posts', icon: MessageSquare, colorClass: 'text-emerald-400' },
  { key: 'sidebar.recruit', href: '/recruit', icon: Users, colorClass: 'text-amber-400' },
  { key: 'sidebar.chat', href: '/chat', icon: MessageCircle, colorClass: 'text-violet-400' },
]

// ============================================
// Sidebar 主组件
// ============================================
export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { locale, setLocale } = useLocale()

  // 桌面端：固定侧栏，仅在 md+ 显示
  return (
    <>
      {/* 移动端顶部条 */}
      <MobileHeader />

      {/* 桌面端侧栏 — lg及以上 */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-zinc-900 text-zinc-300 border-r border-zinc-800 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pathname={pathname}
          router={router}
          locale={locale}
          setLocale={setLocale}
        />
      </aside>

      {/* 移动端 Sheet — 仅 <lg */}
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
// 侧栏内容（桌面和移动端复用）
// ============================================
function SidebarContent({
  collapsed,
  setCollapsed,
  pathname,
  router,
  locale,
  setLocale,
}: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
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
      {/* === Logo === */}
      <div className={`flex items-center h-14 px-3 border-b border-zinc-800 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
          <Compass className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-white text-sm whitespace-nowrap">
            HK Compass
          </span>
        )}
      </div>

      {/* === 导航项 === */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <SidebarNavItem
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

      {/* === 底部区域 === */}
      <div className="border-t border-zinc-800 p-2 space-y-1">
        {/* 语言切换 */}
        <SidebarLangSwitcher collapsed={collapsed} locale={locale} setLocale={setLocale} />

        {/* 用户区 */}
        {user === undefined ? (
          // 加载中
          <div className={`flex items-center rounded-lg px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-6 h-6 rounded-full bg-zinc-700 animate-pulse" />
          </div>
        ) : user === null ? (
          // 未登录
          <Tooltip disabled={!collapsed}>
            <TooltipTrigger>
              <button
                onClick={() => router.push('/auth/login')}
                className={`w-full flex items-center rounded-lg px-2 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${
                  collapsed ? 'justify-center' : 'gap-2.5'
                }`}
              >
                <User className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{t(locale, 'sidebar.login')}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t(locale, 'sidebar.login')}</TooltipContent>}
          </Tooltip>
        ) : (
          // 已登录
          <div className={`flex items-center rounded-lg px-2 py-1.5 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-zinc-700 text-zinc-300">
                {user.email?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="text-xs text-zinc-400 truncate flex-1">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="shrink-0 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title={t(locale, 'nav.signout')}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* 收起/展开按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center rounded-lg px-2 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ${
            collapsed ? 'justify-center' : 'gap-2.5'
          }`}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>{t(locale, 'sidebar.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================
// 单个导航项
// ============================================
function SidebarNavItem({
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
      className={`flex items-center rounded-lg px-2 py-2.5 text-sm transition-colors ${
        collapsed ? 'justify-center' : 'gap-2.5'
      } ${
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? item.colorClass : ''}`} />
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
// 语言切换器（侧栏内）
// ============================================
function SidebarLangSwitcher({
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
            className="w-full flex items-center justify-center rounded-lg px-2 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
      <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="flex-1 bg-transparent text-xs text-zinc-400 border-none outline-none cursor-pointer hover:text-zinc-200"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-zinc-800 text-zinc-200">
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
  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center h-12 px-3 bg-background border-b">
      <MobileMenuTrigger />
      <div className="flex items-center gap-2 ml-2">
        <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
          <Compass className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm">HK Compass</span>
      </div>
    </div>
  )
}

function MobileMenuTrigger() {
  const { setMobileOpen } = useSidebar()

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={() => setMobileOpen(true)}>
      <Menu className="h-5 w-5" />
    </Button>
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
      <SheetContent side="left" className="w-64 p-0 bg-zinc-900 border-r-zinc-800">
        <SidebarContent
          collapsed={false}
          setCollapsed={() => {}}
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
// SidebarInset — 主内容区包装器（根据侧栏状态动态调整边距）
// ============================================
export function SidebarInset({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col min-h-screen transition-all duration-200',
        collapsed ? 'lg:ml-16' : 'lg:ml-56',
        'pt-12 lg:pt-0' // 移动端为 MobileHeader 留空间
      )}
    >
      {children}
    </div>
  )
}

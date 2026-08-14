'use client'

import { LanguageProvider } from '@/i18n/LanguageContext'
import { Providers } from '@/components/providers'
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/sidebar'
import { PageViewTracker } from '@/components/page-view-tracker'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { PreferenceOnboarding } from '@/components/preference-onboarding'
import { useLocale } from '@/i18n/LanguageContext'
import Link from 'next/link'

function FooterWithLocale() {
  const { locale } = useLocale()
  const text =
    locale === 'en' ? 'HK Compass · Discover Hong Kong Competitions'
    : locale === 'zh-HK' ? 'HK Compass · 發現香港所有比賽'
    : 'HK Compass · 发现香港所有比赛'

  const feedbackLabel =
    locale === 'en' ? 'Feedback' : locale === 'zh-HK' ? '意見反饋' : '意见反馈'

  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4">
        <div>
          {text} · © {new Date().getFullYear()}
        </div>
        <div className="mt-1.5">
          <Link href="/feedback" className="text-primary hover:underline">
            {feedbackLabel}
          </Link>
          <span className="mx-2">·</span>
          <a href="mailto:ie3223268@gmail.com" className="hover:underline">
            ie3223268@gmail.com
          </a>
        </div>
      </div>
    </footer>
  )
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <Providers>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <SidebarInset>
              <main className="flex-1">
                <PageViewTracker />
                <AnnouncementBanner />
                <PreferenceOnboarding />
                {children}
              </main>
              <FooterWithLocale />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </Providers>
    </LanguageProvider>
  )
}

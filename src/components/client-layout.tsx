'use client'

import { LanguageProvider } from '@/i18n/LanguageContext'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/navbar'
import { useLocale } from '@/i18n/LanguageContext'

function FooterWithLocale() {
  const { locale } = useLocale()
  const text =
    locale === 'en' ? 'HK Compass · Discover Hong Kong Competitions'
    : locale === 'zh-HK' ? 'HK Compass · 發現香港所有比賽'
    : 'HK Compass · 发现香港所有比赛'

  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4">
        {text} · © {new Date().getFullYear()}
      </div>
    </footer>
  )
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <Providers>
        <div className="flex min-h-full flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <FooterWithLocale />
        </div>
      </Providers>
    </LanguageProvider>
  )
}

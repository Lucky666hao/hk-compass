import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/navbar'

const geist = Geist({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'HK Compass — 发现香港所有比赛',
  description: '一站式发现香港公开比赛：运动、电竞、创意、AI创作、创业路演。闲暇时发现感兴趣的比赛，随手报名参与。',
  keywords: '香港,比赛,竞赛,报名,运动,电竞,AI创作,摄影比赛,创业路演,抢票',
  openGraph: {
    title: 'HK Compass — 发现香港所有比赛',
    description: '一站式发现香港公开比赛',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-HK" suppressHydrationWarning className="h-full">
      <body className={`${geist.className} min-h-full bg-background antialiased`}>
        <Providers>
          <div className="flex min-h-full flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              <div className="mx-auto max-w-7xl px-4">
                HK Compass · 发现香港所有比赛 · © {new Date().getFullYear()}
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}

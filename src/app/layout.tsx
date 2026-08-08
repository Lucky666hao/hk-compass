import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '@/components/client-layout'

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'HK Compass — 发现香港所有比赛',
  description: '一站式发现香港公开比赛：运动、电竞、创意、AI创作、创业路演。闲暇时发现感兴趣的比赛，随手报名参与。',
  keywords: '香港,比赛,竞赛,报名,运动,电竞,AI创作,摄影比赛,创业路演',
  manifest: '/manifest.json',
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
    <html lang="zh-Hans-CN" suppressHydrationWarning className={`h-full ${geist.variable}`}>
      <head>
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="HK Compass" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {})
                })
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-background antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

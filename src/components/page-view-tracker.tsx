'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    // 后台管理页不计入前台浏览统计
    if (pathname.startsWith('/admin')) return
    if (pathname === lastTracked.current) return
    lastTracked.current = pathname

    // 生成本次会话的 session_id（同一 tab 内不变）
    if (typeof window !== 'undefined' && !sessionStorage.getItem('hk-session-id')) {
      sessionStorage.setItem('hk-session-id', crypto.randomUUID())
    }
    const sessionId = typeof window !== 'undefined'
      ? sessionStorage.getItem('hk-session-id')
      : null

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, session_id: sessionId }),
    }).catch(() => {
      // 静默失败 — 不影响用户体验
    })
  }, [pathname])

  // 无 UI 渲染
  return null
}

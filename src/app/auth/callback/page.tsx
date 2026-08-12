'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Supabase Auth 回调页 (OAuth / Magic Link / Password Reset)
// 用浏览器客户端处理会话建立，兼容两种流程：
//   - PKCE / OAuth：URL 带 `code`，需手动 exchangeCodeForSession（verifier 存 localStorage）
//   - Implicit（旧式邮箱链接）：token 在 #fragment，由客户端自动解析并触发 onAuthStateChange
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackInner />
    </Suspense>
  )
}

function CallbackLoading() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">正在登录…</p>
      </div>
    </div>
  )
}

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  // 只允许站内路径（排除 `//` 协议相对 URL），防止开放重定向
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
  const done = useRef(false)
  const exchanging = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (done.current) return
      done.current = true
      router.replace(next)
    }
    const fail = () => {
      if (done.current) return
      done.current = true
      router.replace('/auth/login?error=auth_failed')
    }

    // ── PKCE / OAuth：URL 带 code，手动交换 ──────────────
    if (code) {
      if (exchanging.current) return
      exchanging.current = true
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => (error ? fail() : finish()))
        .catch(fail)
      return
    }

    // ── Implicit：token 在 #fragment，客户端自动解析 ────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        finish()
      }
    })

    // 兜底：session 可能已自动解析完成
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) fail()
      else if (data.session) finish()
    })

    // 超时兜底，避免无限停留在加载页
    const timer = setTimeout(fail, 6000)

    return () => clearTimeout(timer)
  }, [code, next, router])

  return <CallbackLoading />
}

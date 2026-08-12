'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Supabase Auth 回调页 (OAuth / Magic Link / Password Reset)
// 兼容三种情况，失败时停在当前页显示错误（不再静默跳登录页）：
//   1. PKCE / OAuth：URL 带 `code` → exchangeCodeForSession
//   2. Implicit 邮箱链接：token 在 `#fragment` → 手动解析并 setSession
//   3. 已有 session（重复点击）→ 直接跳转
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
  const [err, setErr] = useState<string | null>(null)
  const done = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (done.current) return
      done.current = true
      router.replace(next)
    }
    const fail = (msg: string) => {
      if (done.current) return
      done.current = true
      setErr(msg)
    }

    async function run() {
      // Supabase 直接回传错误（通常是 redirect 白名单 / 配置问题）
      const urlErr = searchParams.get('error')
      if (urlErr) {
        fail(`${urlErr}${searchParams.get('error_description') ? ': ' + searchParams.get('error_description') : ''}`)
        return
      }

      // 1. PKCE / OAuth：带 code，手动交换
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          fail('code 交换失败（PKCE verifier 不匹配或已过期）: ' + error.message)
          return
        }
        finish()
        return
      }

      // 2. Implicit：token 在 #fragment，手动解析
      if (typeof window !== 'undefined' && window.location.hash) {
        const p = new URLSearchParams(window.location.hash.slice(1))
        const accessToken = p.get('access_token')
        const refreshToken = p.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            fail('session 设置失败: ' + error.message)
            return
          }
          finish()
          return
        }
        const fragErr = p.get('error')
        if (fragErr) {
          fail(`${fragErr}${p.get('error_description') ? ': ' + p.get('error_description') : ''}`)
          return
        }
      }

      // 3. 兜底：可能已有 session（重复点击）
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        finish()
        return
      }

      // 4. 都没有 → 显示诊断信息
      const url = typeof window !== 'undefined' ? window.location.href : ''
      fail('链接里既没有 code 也没有 access_token。请把地址栏完整 URL 复制给开发者。当前: ' + url)
    }

    run()
  }, [code, next, router, searchParams])

  if (err) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-red-300 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
          <p className="text-lg font-semibold text-red-700 dark:text-red-400">登录验证失败</p>
          <p className="mt-2 break-all text-sm text-red-600/80 dark:text-red-300/80">{err}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            请把上面这段信息 + 浏览器地址栏完整 URL 截图发给开发者排查。
          </p>
        </div>
      </div>
    )
  }

  return <CallbackLoading />
}

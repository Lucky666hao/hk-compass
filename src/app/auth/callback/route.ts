import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Supabase Auth 回调 (OAuth / Magic Link / Password Reset)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 密码重置后跳转账号页，带上 reset 参数触发设置新密码
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/account?reset=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Auth callback error:', error.message)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}

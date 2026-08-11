'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Compass, Mail, Eye, EyeOff, LockKeyhole, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // === 邮箱密码登录/注册 ===
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tab === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        })
        if (error) throw error
        toast.success('注册成功！请查收确认邮件')
        setEmailSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          // 显示具体错误原因，方便用户排查
          if (error.message.includes('Email not confirmed')) {
            throw new Error('邮箱未验证，请先检查邮箱点击确认链接')
          }
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('邮箱或密码错误')
          }
          throw new Error(error.message)
        }
        toast.success('登录成功')
        router.push(redirectTo)
      }
    } catch (err: any) {
      toast.error(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // === 免密码魔法链接 ===
  const handleMagicLink = async () => {
    if (!email) {
      toast.error('请输入邮箱地址')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (error) throw error
      setEmailSent(true)
      toast.success('已发送登录链接到你的邮箱')
    } catch (err: any) {
      toast.error(err.message || '发送失败')
    } finally {
      setLoading(false)
    }
  }

  // === Google 登录 ===
  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message || 'Google 登录失败')
      setLoading(false)
    }
  }

  // === 发送成功状态 ===
  if (emailSent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">邮件已发送</h2>
              <p className="text-sm text-muted-foreground mt-1">
                点击邮件中的链接{tab === 'register' ? '完成注册' : '即可登录'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              没收到？检查垃圾邮件箱，或
              <button
                className="ml-1 text-primary hover:underline"
                onClick={() => setEmailSent(false)}
              >
                重新发送
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Compass className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">HK Compass</CardTitle>
          <CardDescription>发现香港所有比赛，随时报名参加</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Tab 切换 */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                tab === 'login'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                tab === 'register'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              注册
            </button>
          </div>

          {/* Google 登录 */}
          <Button
            variant="outline"
            className="w-full gap-3 h-11"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            使用 Google 账号{tab === 'register' ? '注册' : '登录'}
          </Button>

          {/* 分隔线 */}
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              或使用邮箱
            </span>
          </div>

          {/* 邮箱密码表单 */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                {tab === 'login' && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => router.push('/auth/forgot-password')}
                  >
                    忘记密码？
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={tab === 'register' ? '至少6位字符' : '输入密码'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  处理中...
                </span>
              ) : tab === 'register' ? (
                '创建账号'
              ) : (
                '登录'
              )}
            </Button>
          </form>

          {/* 免密码登录 */}
          {tab === 'login' && (
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={handleMagicLink}
              disabled={loading}
            >
              <Mail className="h-4 w-4" />
              发送免密码登录链接
            </Button>
          )}

          {/* 隐私提示 */}
          {tab === 'register' && (
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              注册即表示同意我们的
              <span className="text-primary">服务条款</span> 和
              <span className="text-primary">隐私政策</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

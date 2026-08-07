'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Compass, Mail } from 'lucide-react'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}` },
        })
        if (error) throw error
        toast.success('注册成功！请查看邮箱确认链接')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(redirectTo)
      }
    } catch (err: any) {
      toast.error(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) { toast.error('请输入邮箱地址'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}` },
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

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Compass className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-xl mt-2">
            {isSignUp ? '注册 HK Compass' : '登录 HK Compass'}
          </CardTitle>
          <CardDescription>
            {isSignUp ? '发现香港所有比赛' : '欢迎回来'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center py-4 space-y-2">
              <Mail className="mx-auto h-10 w-10 text-primary" />
              <p className="font-medium">邮件已发送</p>
              <p className="text-sm text-muted-foreground">点击邮件中的链接即可登录</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" type="email" placeholder="your@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input id="password" type="password" placeholder="输入密码"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
                </Button>
              </form>
              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">或</span>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={handleMagicLink} disabled={loading}>
                <Mail className="h-4 w-4" />发送免密码登录链接
              </Button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {isSignUp ? '已有账号？' : '没有账号？'}
                <button type="button" className="ml-1 text-primary hover:underline"
                  onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? '去登录' : '去注册'}
                </button>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

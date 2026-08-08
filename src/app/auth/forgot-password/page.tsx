'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LockKeyhole, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('请输入邮箱地址'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/account`,
      })
      if (error) throw error
      setSent(true)
      toast.success('重置密码链接已发送')
    } catch (err: any) {
      toast.error(err.message || '发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <LockKeyhole className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>忘记密码</CardTitle>
          <CardDescription>输入注册邮箱，我们将发送重置链接</CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">邮件已发送</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  请检查 {email} 的收件箱，点击链接即可重置密码
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => router.push('/auth/login')}>
                返回登录
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleReset} className="space-y-4">
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
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      发送中...
                    </span>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      发送重置链接
                    </>
                  )}
                </Button>
              </form>
              <button
                onClick={() => router.back()}
                className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回登录
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

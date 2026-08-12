'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { KeyRound, Eye, EyeOff, CheckCircle2, ShieldCheck, Home } from 'lucide-react'
import { toast } from 'sonner'

// 纯修改密码页：仅通过重置链接到达，不含账户/收藏等无关内容。
export default function ResetPasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setChecking(false)
    })
  }, [])

  const strength = getStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('密码至少 6 位字符')
      return
    }
    if (password !== confirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      toast.error(error.message || '修改失败，请稍后重试')
    } else {
      setDone(true)
      toast.success('密码修改成功')
    }
  }

  // 校验中
  if (checking) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // 链接失效 / 未登录
  if (!hasSession) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldCheck className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">链接已失效</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              重置链接已过期或无效，请重新发送一封重置邮件。
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => router.push('/auth/forgot-password')}>重新发送</Button>
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                返回登录
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 成功态
  if (done) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-green-500/30">
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">密码修改成功</h2>
            <p className="mt-2 text-sm text-muted-foreground">下次登录请使用新密码。</p>
            <Button className="mt-7 h-11 w-full" onClick={() => router.push('/')}>
              <Home className="mr-2 h-4 w-4" />
              返回主页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 表单
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>设置新密码</CardTitle>
          <CardDescription>你已通过重置链接验证，请设置一个新密码</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="rp-password">新密码</Label>
              <div className="relative">
                <input
                  id="rp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoFocus
                  placeholder="至少 6 位字符"
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-8 rounded-full transition-colors ${
                          strength >= i
                            ? strength === 1
                              ? 'bg-red-400'
                              : strength === 2
                              ? 'bg-amber-400'
                              : 'bg-green-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {['弱', '中', '强'][strength - 1]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rp-confirm">确认新密码</Label>
              <input
                id="rp-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                placeholder="再次输入新密码"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-500">两次输入的密码不一致</p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  提交中…
                </span>
              ) : (
                '确认修改'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// 密码强度 1(弱)/2(中)/3(强)
function getStrength(p: string): number {
  if (!p) return 0
  let s = 1
  if (p.length >= 8) s++
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(s, 3)
}

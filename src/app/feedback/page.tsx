'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Send, CheckCircle2, MessageSquare, ShieldCheck, Clock, User } from 'lucide-react'
import { toast } from 'sonner'

const FEEDBACK_EMAIL = 'ie3223268@gmail.com'
const CATEGORIES = ['问题反馈', '投诉', '建议', '其他'] as const
const MAX_LEN = 5000

export default function FeedbackPage() {
  const { locale } = useLocale()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<string>('问题反馈')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // 预填登录邮箱
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      toast.error(locale === 'en' ? 'Please enter your feedback' : '请输入反馈内容')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name, email, category, message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '提交失败')
      setDone(true)
    } catch (err: any) {
      toast.error(err.message || '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const title = locale === 'en' ? 'Feedback & Complaints' : locale === 'zh-HK' ? '意見反饋' : '意见反馈'
  const subtitle =
    locale === 'en'
      ? 'Tell us about a problem, a complaint, or an idea — we read every message.'
      : locale === 'zh-HK'
      ? '遇到問題、想投訴或有建議？我哋會認真閱讀每條留言。'
      : '遇到问题、想投诉或有建议？我们会认真阅读每一条留言。'

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <Card className="border-green-500/30">
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">
              {locale === 'en' ? 'Thanks! Feedback received' : locale === 'zh-HK' ? '多謝！已收到你嘅反饋' : '谢谢！已收到你的反馈'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {locale === 'en'
                ? 'We will get back to you as soon as possible.'
                : locale === 'zh-HK'
                ? '我哋會盡快回覆你。'
                : '我们会尽快回复你。'}
            </p>
            <Button variant="outline" className="mt-7" onClick={() => { setDone(false); setMessage(''); setCategory('问题反馈'); setName('') }}>
              {locale === 'en' ? 'Submit another' : locale === 'zh-HK' ? '再提交一條' : '再提交一条'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquare className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 左栏：联系信息 + 说明 */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {locale === 'en' ? 'Email us directly' : locale === 'zh-HK' ? '直接電郵我哋' : '直接邮件联系我们'}
                  </p>
                  <a href={`mailto:${FEEDBACK_EMAIL}`} className="mt-0.5 block text-sm text-primary hover:underline break-all">
                    {FEEDBACK_EMAIL}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Your feedback goes straight to our team inbox.' : locale === 'zh-HK' ? '你嘅反饋會直接送到我哋團隊。' : '你的反馈会直接送到我们团队。'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'We usually reply within 1–2 business days.' : locale === 'zh-HK' ? '我哋通常喺 1–2 個工作日內回覆。' : '我们通常在 1–2 个工作日内回复。'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右栏：表单 */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 分类 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {locale === 'en' ? 'Category' : locale === 'zh-HK' ? '類型' : '类型'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                        category === c
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 姓名 + 邮箱 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="fb-name">
                    {locale === 'en' ? 'Name' : locale === 'zh-HK' ? '姓名' : '姓名'}
                    <span className="ml-1 text-xs text-muted-foreground">({locale === 'en' ? 'optional' : locale === 'zh-HK' ? '可選' : '可选'})</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="fb-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder={locale === 'en' ? 'Your name' : locale === 'zh-HK' ? '你嘅姓名' : '你的姓名'}
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="fb-email">
                    {locale === 'en' ? 'Email' : locale === 'zh-HK' ? '電郵' : '邮箱'}
                    <span className="ml-1 text-xs text-muted-foreground">({locale === 'en' ? 'optional' : locale === 'zh-HK' ? '可選' : '可选'})</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="fb-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={200}
                      placeholder="you@email.com"
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* 内容 */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="fb-message">
                  {locale === 'en' ? 'Message' : locale === 'zh-HK' ? '內容' : '内容'}
                </label>
                <textarea
                  id="fb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={MAX_LEN}
                  required
                  placeholder={locale === 'en' ? 'Describe the problem or suggestion…' : locale === 'zh-HK' ? '描述你嘅問題或建議…' : '描述你的问题或建议…'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">{message.length}/{MAX_LEN}</span>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    {locale === 'en' ? 'Submitting…' : '提交中…'}
                  </span>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {locale === 'en' ? 'Submit feedback' : locale === 'zh-HK' ? '提交反饋' : '提交反馈'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

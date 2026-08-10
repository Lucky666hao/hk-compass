'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { AnonymousCategory } from '@/lib/types'
import { ANONYMOUS_CATEGORIES, ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/i18n/LanguageContext'
import { ArrowLeft, Send, Shuffle, EyeOff } from 'lucide-react'
import { ForceDark } from '@/components/force-dark'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// 随机代号生成
function generateName(): string {
  const adjectives = ['暗影', '深夜', '迷霧', '隱世', '流浪', '沉默', '孤獨', '深潛', '月光', '幽谷', '靜默', '隱形']
  const nouns = ['貓', '狐狸', '烏鴉', '蝙蝠', '章魚', '狼', '鯊魚', '鷹', '蛇', '兔子', '熊貓', '企鵝', '龍', '鳳凰', '貓頭鷹', '蝴蝶']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}#${num}`
}

export default function NewAnonymousPostPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [displayName, setDisplayName] = useState(generateName())
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<AnonymousCategory>(ANONYMOUS_CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error(locale === 'en' ? 'Please enter a title.' : '請輸入標題。'); return }
    if (!content.trim()) { toast.error(locale === 'en' ? 'Please enter some content.' : '請輸入內容。'); return }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(locale === 'en' ? 'Please log in first' : '請先登錄')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('anonymous_posts').insert({
      display_name: displayName,
      title: title.trim(),
      content: content.trim(),
      category,
      user_id: session.user.id,
    })

    setSubmitting(false)
    if (error) {
      toast.error(locale === 'en' ? 'Failed to publish.' : '發布失敗，請重試。')
    } else {
      toast.success(locale === 'en' ? 'Whisper sent.' : '匿名發言已發送。')
      router.push('/posts/anonymous')
    }
  }

  return (
    <ForceDark>
    <div className="min-h-screen bg-background text-gray-200">
      {/* 微妙发光背景 */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.05),transparent_50%)]" />

      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back' : '返回'}
        </button>

        <h1 className="text-2xl font-bold mb-6 text-purple-300">
          🕶️ {locale === 'en' ? 'Anonymous Whisper' : '匿名發言'}
        </h1>

        <Card className="bg-[#1a1a2e] border-purple-500/10 shadow-[0_0_15px_rgba(124,58,237,0.04)]">
          <CardContent className="p-6 space-y-4">
            {/* 匿名身份 */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#111113] border border-purple-500/10">
              <EyeOff className="h-4 w-4 text-purple-400/60" />
              <span className="text-xs text-gray-500">{locale === 'en' ? 'Posting as:' : '發言身份:'}</span>
              <span className="text-sm text-purple-400 font-bold">{displayName}</span>
              <button
                type="button"
                onClick={() => setDisplayName(generateName())}
                className="ml-auto p-1.5 rounded-md hover:bg-purple-500/10 transition-colors"
                title={locale === 'en' ? 'Random name' : '換一個名字'}
              >
                <Shuffle className="h-3.5 w-3.5 text-gray-600 hover:text-purple-400 transition-colors" />
              </button>
            </div>

            {/* 分类选择 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-500">
                {locale === 'en' ? 'Category' : '分類'}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {ANONYMOUS_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all',
                      category === cat
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-[#111113] text-gray-500 hover:text-gray-300 border-purple-500/10'
                    )}
                  >
                    {ANONYMOUS_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* 标题 */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={locale === 'en' ? 'Title of your whisper...' : '給匿名貼起個標題...'}
                maxLength={200}
                className="bg-[#111113] border-purple-500/10 text-gray-200 placeholder:text-gray-700 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-lg"
              />
            </div>

            {/* 内容 */}
            <div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={locale === 'en' ? 'Speak your mind anonymously...' : '放心說，這裡沒人知道你是誰...'}
                rows={8}
                className="resize-y min-h-[160px] bg-[#111113] border-purple-500/10 text-gray-200 placeholder:text-gray-700 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-300 hover:bg-purple-500/5"
              >
                {locale === 'en' ? 'Cancel' : '取消'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-all"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {submitting ? '...' : locale === 'en' ? 'Send' : '匿名發送'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </ForceDark>
  )
}

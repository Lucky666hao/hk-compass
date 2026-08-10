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
import { ArrowLeft, Send, Skull, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// 随机代号生成
function generateName(): string {
  const adjectives = ['匿名', '地下', '隐藏', '神秘', '无声', '暗影', '夜行', '流浪', '孤独', '沉默', '深潜', '隐世']
  const nouns = ['犀牛', '猫', '狐狸', '乌鸦', '蝙蝠', '章鱼', '狼', '鲨鱼', '鹰', '蛇', '兔子', '熊猫', '企鹅', '龙', '凤凰', '独角兽']
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
    if (!title.trim()) { toast.error(locale === 'en' ? 'Please enter a title.' : '请输入标题。'); return }
    if (!content.trim()) { toast.error(locale === 'en' ? 'Please enter some content.' : '请输入内容。'); return }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(locale === 'en' ? 'Please log in first' : '请先登录')
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
      toast.error(locale === 'en' ? 'Failed to publish.' : '发布失败，请重试。')
    } else {
      toast.success(locale === 'en' ? 'Whisper sent.' : '匿名发言已发送。')
      router.push('/posts/anonymous')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-400 font-mono"
        >
          <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back' : '返回'}
        </button>

        <h1 className="text-2xl font-bold mb-6 font-mono text-emerald-400">
          🕶️ {locale === 'en' ? 'Anonymous Post' : '匿名发言'}
        </h1>

        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardContent className="p-6 space-y-4">
            {/* 匿名身份 */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <Skull className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-zinc-500 font-mono">{locale === 'en' ? 'Posting as:' : '发言身份:'}</span>
              <span className="text-sm text-emerald-400 font-mono font-bold">{displayName}</span>
              <button
                type="button"
                onClick={() => setDisplayName(generateName())}
                className="ml-auto p-1 rounded hover:bg-zinc-800 transition-colors"
                title={locale === 'en' ? 'Random name' : '换一个名字'}
              >
                <Shuffle className="h-3.5 w-3.5 text-zinc-600" />
              </button>
            </div>

            {/* 分类选择 */}
            <div>
              <label className="block text-sm font-medium mb-2 font-mono text-zinc-500">
                {locale === 'en' ? 'CATEGORY' : '分类'}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {ANONYMOUS_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-full border border-zinc-800 whitespace-nowrap transition-all font-mono',
                      category === cat
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30'
                        : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
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
                placeholder={locale === 'en' ? 'Title of your whisper...' : '给匿名贴起个标题...'}
                maxLength={200}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-700 font-mono"
              />
            </div>

            {/* 内容 */}
            <div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={locale === 'en' ? 'Speak your mind anonymously...' : '放心说，这里没人知道你是谁...'}
                rows={8}
                className="resize-y min-h-[160px] bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-700 font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300 font-mono">
                {locale === 'en' ? 'CANCEL' : '取消'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-mono"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {submitting ? '...' : locale === 'en' ? 'SEND' : '匿名发送'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { PostCategory } from '@/lib/types'
import { POST_CATEGORIES, POST_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function NewPostPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<PostCategory>(POST_CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t(locale, 'posts.no_title'))
      return
    }
    if (!content.trim()) {
      toast.error(t(locale, 'posts.no_content'))
      return
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(t(locale, 'posts.login_prompt'))
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('posts').insert({
      title: title.trim(),
      content: content.trim(),
      category,
      user_id: session.user.id,
    })

    setSubmitting(false)

    if (error) {
      toast.error(t(locale, 'posts.publish_error'))
    } else {
      toast.success(t(locale, 'posts.publish_success'))
      router.push('/posts')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'posts.back_to_list')}
      </button>

      <h1 className="text-2xl font-bold mb-6">{t(locale, 'posts.create')}</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t(locale, 'posts.category')}</label>
            <div className="flex gap-2 flex-wrap">
              {POST_CATEGORIES.map((cat) => {
                const label = t(locale, `posts.cat.${cat}`)
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      category === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(locale, 'posts.title_placeholder')}
              maxLength={200}
              className="text-lg"
            />
          </div>

          {/* 内容 */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t(locale, 'posts.content_placeholder')}
              rows={8}
              className="resize-y min-h-[160px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              {t(locale, 'posts.cancel') as string}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-1.5" />
              {submitting ? t(locale, 'posts.publishing') as string : t(locale, 'posts.publish') as string}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function NewAnnouncementPage() {
  const { locale } = useLocale()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<string>('info')
  const [isPublished, setIsPublished] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast.error(t(locale, 'admin.announce.fill_all'))
      return
    }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error(t(locale, 'admin.announce.auth_required'))
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        type,
        is_published: publish,
      }),
    })

    setSaving(false)

    if (res.ok) {
      toast.success(t(locale, 'admin.announce.created'))
      router.push('/admin/announcements')
    } else {
      toast.error(t(locale, 'admin.announce.save_failed'))
    }
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push('/admin/announcements')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t(locale, 'back')}
      </button>

      <Card>
        <CardContent className="p-6 space-y-5">
          <h2 className="font-semibold text-lg">{t(locale, 'admin.announce.new')}</h2>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t(locale, 'admin.announce.title')}</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t(locale, 'admin.announce.title_placeholder') as string}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t(locale, 'admin.announce.content')}</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t(locale, 'admin.announce.content_placeholder') as string}
              rows={5}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t(locale, 'admin.announce.type')}</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {(['info', 'warning', 'success'] as const).map(tp => (
                <option key={tp} value={tp}>
                  {t(locale, `admin.announce.type.${tp}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Published toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{t(locale, 'admin.announce.is_published')}</span>
          </label>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => handleSubmit(true)} disabled={saving}>
              {saving ? '...' : t(locale, 'admin.announce.publish')}
            </Button>
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={saving}>
              {t(locale, 'admin.announce.save_draft')}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/admin/announcements')}>
              {t(locale, 'admin.announce.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

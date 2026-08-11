'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import type { Announcement } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function EditAnnouncementPage() {
  const { locale } = useLocale()
  const router = useRouter()
  const params = useParams()
  const editId = params.id as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<string>('info')
  const [isPublished, setIsPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!editId) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`/api/admin/announcements/${editId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.announcement) {
            const a = data.announcement as Announcement
            setTitle(a.title)
            setContent(a.content)
            setType(a.type)
            setIsPublished(a.is_published)
          }
        })
        .finally(() => setLoading(false))
    })
  }, [editId])

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast.error(t(locale, 'admin.announce.fill_all'))
      return
    }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`/api/admin/announcements/${editId}`, {
      method: 'PATCH',
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
      toast.success(t(locale, 'admin.announce.updated'))
      router.push('/admin/announcements')
    } else {
      toast.error(t(locale, 'admin.announce.save_failed'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
          <h2 className="font-semibold text-lg">{t(locale, 'admin.announce.edit')}</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t(locale, 'admin.announce.title')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t(locale, 'admin.announce.content')}</label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={5} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t(locale, 'admin.announce.type')}</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {(['info', 'warning', 'success'] as const).map(tp => (
                <option key={tp} value={tp}>{t(locale, `admin.announce.type.${tp}`)}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{t(locale, 'admin.announce.is_published')}</span>
          </label>

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

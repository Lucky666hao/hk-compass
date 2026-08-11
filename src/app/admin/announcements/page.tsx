'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import type { Announcement } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

export default function AnnouncementsPage() {
  const { locale } = useLocale()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/announcements', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.announcements) setAnnouncements(data.announcements)
        })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const togglePublish = async (a: Announcement) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/admin/announcements/${a.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ is_published: !a.is_published }),
    })
    if (res.ok) {
      fetchData()
      toast.success(a.is_published ? t(locale, 'admin.announce.unpublished') : t(locale, 'admin.announce.published'))
    }
  }

  const deleteAnnouncement = async (a: Announcement) => {
    if (!confirm(t(locale, 'admin.announce.delete_confirm'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/admin/announcements/${a.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      fetchData()
      toast.success(t(locale, 'admin.announce.deleted'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-5"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {announcements.length} {t(locale, 'admin.announce.count')}
        </p>
        <Link href="/admin/announcements/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t(locale, 'admin.announce.new')}
          </Button>
        </Link>
      </div>

      {announcements.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t(locale, 'admin.no_data')}</p>
      ) : (
        announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{a.title}</span>
                    <Badge className={TYPE_COLORS[a.type] || TYPE_COLORS.info}>
                      {t(locale, `admin.announce.type.${a.type}`)}
                    </Badge>
                    {a.is_published ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        {t(locale, 'admin.announce.status_published')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t(locale, 'admin.announce.status_draft')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePublish(a)}
                    title={a.is_published ? (t(locale, 'admin.announce.unpublish') as string) : (t(locale, 'admin.announce.publish') as string)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    {a.is_published ? (
                      <XCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </button>
                  <Link
                    href={`/admin/announcements/${a.id}/edit`}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title={t(locale, 'admin.announce.edit') as string}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <button
                    onClick={() => deleteAnnouncement(a)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title={t(locale, 'admin.announce.delete') as string}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

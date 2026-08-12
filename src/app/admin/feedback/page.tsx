'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  read: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  read: '已读',
  resolved: '已解决',
}

export default function FeedbackAdminPage() {
  const { locale } = useLocale()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch('/api/admin/feedback', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((res) => res.json())
        .then((data) => { if (data.feedback) setItems(data.feedback) })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const updateStatus = async (id: string, status: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, status }),
    })
    fetchItems()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {items.length} {locale === 'en' ? 'feedbacks' : locale === 'zh-HK' ? '條反饋' : '条反馈'}
      </p>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {locale === 'en' ? 'No feedback yet' : locale === 'zh-HK' ? '暫無反饋' : '暂无反馈'}
        </p>
      ) : (
        items.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{f.category}</span>
                    <Badge className={STATUS_COLORS[f.status] || ''}>
                      {STATUS_LABELS[f.status] || f.status}
                    </Badge>
                  </div>

                  <p className="text-sm whitespace-pre-wrap mt-2">{f.message}</p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 flex-wrap">
                    {f.name && <span className="font-medium">{f.name}</span>}
                    {f.email && (
                      <a href={`mailto:${f.email}`} className="text-primary hover:underline">
                        {f.email}
                      </a>
                    )}
                    <span>{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {f.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(f.id, 'read')}
                        className="px-2.5 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 transition-colors"
                      >
                        {locale === 'en' ? 'Mark read' : locale === 'zh-HK' ? '標為已讀' : '标为已读'}
                      </button>
                      <button
                        onClick={() => updateStatus(f.id, 'resolved')}
                        className="px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                      >
                        {locale === 'en' ? 'Resolve' : locale === 'zh-HK' ? '標為已解決' : '标为已解决'}
                      </button>
                    </>
                  )}
                  {f.status === 'read' && (
                    <button
                      onClick={() => updateStatus(f.id, 'resolved')}
                      className="px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                    >
                      {locale === 'en' ? 'Resolve' : locale === 'zh-HK' ? '標為已解決' : '标为已解决'}
                    </button>
                  )}
                  {f.status === 'resolved' && (
                    <span
                      onClick={() => updateStatus(f.id, 'pending')}
                      className="px-2.5 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                    >
                      {locale === 'en' ? 'Reopen' : locale === 'zh-HK' ? '重新開啟' : '重新打开'}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

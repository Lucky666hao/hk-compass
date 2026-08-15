'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  dismissed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate Content',
  violence: 'Violence',
  other: 'Other',
}

export default function ReportsPage() {
  const { locale } = useLocale()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.reports) setReports(data.reports)
        })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const updateStatus = async (reportId: string, status: string, type?: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/admin/reports`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: reportId, status, type }),
    })
    fetchReports()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}><CardContent className="p-5"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {reports.length} {t(locale, 'admin.reports.count')}
      </p>

      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t(locale, 'admin.no_data')}</p>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{REASON_LABELS[r.reason] || r.reason}</span>
                    <Badge className={STATUS_COLORS[r.status] || ''}>
                      {r.status}
                    </Badge>
                    {r.type === 'review' && (
                      <Badge variant="outline" className="text-xs">
                        {t(locale, 'admin.reviews')}
                      </Badge>
                    )}
                  </div>
                  {r.type === 'review' && r.course?.course_name && (
                    <p className="text-sm text-foreground mt-1">📚 {r.course.course_name}</p>
                  )}
                  {r.detail && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.detail}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    {r.type === 'review' ? (
                      <Link
                        href={r.course?.university_slug ? `/campus/${r.course.university_slug}` : '/campus'}
                        className="text-primary hover:underline font-mono"
                      >
                        #{r.review_id?.slice(0, 8)}
                      </Link>
                    ) : (
                      <Link
                        href={`/posts/${r.post_id}`}
                        className="text-primary hover:underline font-mono"
                      >
                        #{r.post_id?.slice(0, 8)}
                      </Link>
                    )}
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    {r.reporter_email && <span>by {r.reporter_email}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(r.id, 'resolved', r.type)}
                        className="px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                      >
                        {t(locale, 'admin.reports.resolve')}
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, 'dismissed', r.type)}
                        className="px-2.5 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 transition-colors"
                      >
                        {t(locale, 'admin.reports.dismiss')}
                      </button>
                    </>
                  )}
                  {r.status !== 'pending' && (
                    <span
                      onClick={() => updateStatus(r.id, 'pending', r.type)}
                      className="px-2.5 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                    >
                      {t(locale, 'admin.reports.reopen')}
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

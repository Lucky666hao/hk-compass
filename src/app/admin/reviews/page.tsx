'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getUniBySlug } from '@/lib/university-data'
import { Trash2, EyeOff, Eye, Star } from 'lucide-react'

type Filter = 'all' | 'published' | 'hidden'

const FILTERS: { key: Filter; labelKey: string }[] = [
  { key: 'all', labelKey: 'admin.reviews.all' },
  { key: 'published', labelKey: 'admin.reviews.published' },
  { key: 'hidden', labelKey: 'admin.reviews.hidden' },
]

export default function AdminReviewsPage() {
  const { locale } = useLocale()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const fetchReviews = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/reviews', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => { if (data.reviews) setReviews(data.reviews) })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const updateStatus = async (id: string, status: 'published' | 'hidden') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, status }),
    })
    fetchReviews()
  }

  const deleteReview = async (id: string) => {
    if (!window.confirm(t(locale, 'admin.reviews.delete_confirm'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/reviews', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    })
    fetchReviews()
  }

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter)

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {t(locale, 'admin.reviews.count')}
        </p>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(locale, f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t(locale, 'admin.reviews.empty')}</p>
      ) : (
        filtered.map((r) => {
          const uni = getUniBySlug(r.university_slug)
          return (
            <Card key={r.id} className={r.status === 'hidden' ? 'opacity-70' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{r.course_name}</span>
                      {r.course_code && (
                        <span className="text-xs font-mono text-muted-foreground">{r.course_code}</span>
                      )}
                      {r.professor_name && (
                        <span className="text-xs text-muted-foreground">👨‍🏫 {r.professor_name}</span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />{r.rating}
                      </span>
                      {r.status === 'hidden' && (
                        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {t(locale, 'admin.reviews.hidden_badge')}
                        </Badge>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.comment}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span>{uni ? (locale === 'en' ? uni.enName : uni.shortName) : r.university_slug}</span>
                      <span>{r.is_anonymous ? '🕶️' : '👤'} {r.author_email || '—'}</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {r.status === 'published' ? (
                      <button
                        onClick={() => updateStatus(r.id, 'hidden')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {t(locale, 'admin.reviews.hide')}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(r.id, 'published')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t(locale, 'admin.reviews.unhide')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteReview(r.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t(locale, 'admin.reviews.delete')}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

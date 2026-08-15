'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Trash2, EyeOff, Eye, MessageSquare, Flag } from 'lucide-react'

type Filter = 'all' | 'published' | 'hidden'

const FILTERS: { key: Filter; labelKey: string }[] = [
  { key: 'all', labelKey: 'admin.posts.all' },
  { key: 'published', labelKey: 'admin.posts.published' },
  { key: 'hidden', labelKey: 'admin.posts.hidden' },
]

export default function AdminPostsPage() {
  const { locale } = useLocale()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const fetchPosts = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/posts', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => { if (data.posts) setPosts(data.posts) })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const updateStatus = async (id: string, status: 'published' | 'hidden') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/posts', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, status }),
    })
    fetchPosts()
  }

  const deletePost = async (id: string) => {
    if (!window.confirm(t(locale, 'admin.posts.delete_confirm'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    })
    fetchPosts()
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

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
      {/* 顶部：计数 + 状态筛选 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {t(locale, 'admin.posts.count')}
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
        <p className="text-muted-foreground text-sm py-8 text-center">{t(locale, 'admin.posts.empty')}</p>
      ) : (
        filtered.map((p) => (
          <Card key={p.id} className={p.status === 'hidden' ? 'opacity-70' : ''}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{p.title}</span>
                    {p.status === 'hidden' && (
                      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {t(locale, 'admin.posts.hidden_badge')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                    <Link
                      href={`/posts/${p.id}`}
                      className="text-primary hover:underline font-mono"
                    >
                      #{p.id?.slice(0, 8)}
                    </Link>
                    <span>{p.author_email || '—'}</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />{p.comment_count}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${p.report_count > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                      <Flag className="h-3 w-3" />{p.report_count}
                    </span>
                    <span>{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {p.status === 'published' ? (
                    <button
                      onClick={() => updateStatus(p.id, 'hidden')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      {t(locale, 'admin.posts.hide')}
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(p.id, 'published')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t(locale, 'admin.posts.unhide')}
                    </button>
                  )}
                  <button
                    onClick={() => deletePost(p.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t(locale, 'admin.posts.delete')}
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

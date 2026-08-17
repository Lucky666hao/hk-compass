'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, EyeOff, Eye, Inbox } from 'lucide-react'
import Link from 'next/link'
import { ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'

type Filter = 'all' | 'published' | 'hidden'

export default function AdminAnonymousPage() {
  const { locale } = useLocale()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  const fetchPosts = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/anonymous', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((res) => res.json())
        .then((data) => { if (data.posts) setPosts(data.posts) })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const setStatus = async (ids: string[], status: 'published' | 'hidden') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/anonymous', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids, status }),
    })
    fetchPosts()
  }

  const deletePosts = async (ids: string[]) => {
    if (!window.confirm(L('Delete this post?', '確定刪除這條匿名帖？', '确定删除这条匿名帖？'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/anonymous', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids }),
    })
    fetchPosts()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: L('All', '全部', '全部') },
    { key: 'published', label: L('Published', '正常', '正常') },
    { key: 'hidden', label: L('Hidden', '已屏蔽', '已屏蔽') },
  ]

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}><CardContent className="p-5"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">
          {L('Total', '共', '共')} <span className="font-medium text-foreground">{posts.length}</span>{' '}
          {L('anonymous posts', '條匿名帖', '条匿名帖')}
        </span>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{L('No anonymous posts.', '暫無匿名帖。', '暂无匿名帖。')}</p>
        </div>
      ) : (
        filtered.map((p) => (
          <Card key={p.id} className={p.status === 'hidden' ? 'opacity-70' : ''}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{p.title}</span>
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                      {(ANONYMOUS_CATEGORY_LABELS as Record<string, string>)[p.category] || p.category}
                    </span>
                    {p.status === 'hidden' && (
                      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {L('Hidden', '已屏蔽', '已屏蔽')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                    <Link href={`/posts/anonymous/${p.id}`} className="text-primary hover:underline font-mono">
                      #{p.id?.slice(0, 8)}
                    </Link>
                    <span className="text-purple-400 font-medium">{p.display_name}</span>
                    {p.author_email && <span>{p.author_email}</span>}
                    <span>👍 {p.vote_score ?? 0}</span>
                    <span>{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {p.status === 'published' ? (
                    <button
                      onClick={() => setStatus([p.id], 'hidden')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      {L('Hide', '屏蔽', '屏蔽')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus([p.id], 'published')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {L('Unhide', '恢復', '恢复')}
                    </button>
                  )}
                  <button
                    onClick={() => deletePosts([p.id])}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {L('Delete', '刪除', '删除')}
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

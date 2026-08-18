'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, EyeOff, Eye, Inbox } from 'lucide-react'
import Link from 'next/link'
import { ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'published' | 'hidden'
type View = 'posts' | 'comments'

export default function AdminAnonymousPage() {
  const { locale } = useLocale()
  const [view, setView] = useState<View>('posts')
  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-muted p-1 gap-1 w-fit">
        {([
          { key: 'posts', label: L('Posts', '帖子', '帖子') },
          { key: 'comments', label: L('Comments', '評論', '评论') },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              view === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'posts' ? <PostsTab /> : <CommentsTab />}
    </div>
  )
}

function useAdminFetch<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(endpoint, { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((res) => res.json())
        .then((data) => {
          const arr = (data.posts ?? data.comments ?? []) as T[]
          setItems(arr)
        })
        .finally(() => setLoading(false))
    })
  }, [endpoint])

  useEffect(() => { fetchItems() }, [fetchItems])
  return { items, loading, refresh: fetchItems }
}

function PostsTab() {
  const { locale } = useLocale()
  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)
  const { items: posts, loading, refresh } = useAdminFetch<any>('/api/admin/anonymous')
  const [filter, setFilter] = useState<Filter>('all')

  const setStatus = async (ids: string[], status: 'published' | 'hidden') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/anonymous', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids, status }),
    })
    refresh()
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
    refresh()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: L('All', '全部', '全部') },
    { key: 'published', label: L('Published', '正常', '正常') },
    { key: 'hidden', label: L('Hidden', '已屏蔽', '已屏蔽') },
  ]

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter)

  if (loading) return <LoadingSkeleton />

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
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === f.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty text={L('No anonymous posts.', '暫無匿名帖。', '暂无匿名帖。')} />
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

function CommentsTab() {
  const { locale } = useLocale()
  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)
  const { items: comments, loading, refresh } = useAdminFetch<any>('/api/admin/anonymous-comments')
  const [filter, setFilter] = useState<Filter>('all')

  const setStatus = async (ids: string[], status: 'published' | 'hidden') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/anonymous-comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids, status }),
    })
    refresh()
  }

  const deleteComments = async (ids: string[]) => {
    if (!window.confirm(L('Delete this comment?', '確定刪除這條評論？', '确定删除这条评论？'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/anonymous-comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids }),
    })
    refresh()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: L('All', '全部', '全部') },
    { key: 'published', label: L('Published', '正常', '正常') },
    { key: 'hidden', label: L('Hidden', '已屏蔽', '已屏蔽') },
  ]

  const filtered = filter === 'all' ? comments : comments.filter((c) => c.status === filter)

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">
          {L('Total', '共', '共')} <span className="font-medium text-foreground">{comments.length}</span>{' '}
          {L('comments', '條評論', '条评论')}
        </span>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === f.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty text={L('No comments.', '暫無評論。', '暂无评论。')} />
      ) : (
        filtered.map((c) => (
          <Card key={c.id} className={c.status === 'hidden' ? 'opacity-70' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{c.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                    <span className="text-purple-400 font-medium">{c.display_name}</span>
                    {c.author_email && <span>{c.author_email}</span>}
                    {c.post_title && (
                      <span className="inline-flex items-center gap-1">
                        📄 {c.post_title}
                      </span>
                    )}
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {c.status === 'published' ? (
                    <button
                      onClick={() => setStatus([c.id], 'hidden')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      {L('Hide', '屏蔽', '屏蔽')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus([c.id], 'published')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {L('Unhide', '恢復', '恢复')}
                    </button>
                  )}
                  <button
                    onClick={() => deleteComments([c.id])}
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}><CardContent className="p-5"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Trash2, EyeOff, Eye, MessageSquare, Flag, X } from 'lucide-react'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())

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

  const updateStatus = async (ids: string[], status: 'published' | 'hidden') => {
    let reason = ''
    if (status === 'hidden') {
      const input = window.prompt(
        locale === 'en'
          ? 'Reason for hiding (will notify the author):'
          : locale === 'zh-HK'
          ? '屏蔽原因（將通知發帖人，可留空）：'
          : '屏蔽原因（将通知发帖人，可留空）：'
      )
      if (input === null) return // 用户取消
      reason = input
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/posts', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ids, status, reason }),
    })
    setSelected(new Set())
    fetchPosts()
  }

  const deletePosts = async (ids: string[]) => {
    if (!window.confirm(t(locale, 'admin.posts.delete_confirm'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ids }),
    })
    setSelected(new Set())
    fetchPosts()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(p => p.id)))
    }
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
      {/* 顶部：计数 + 状态筛选 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={filtered.length === 0}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="font-medium text-foreground">{filtered.length}</span>
            {t(locale, 'admin.posts.count')}
          </label>
        </div>
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelected(new Set()) }}
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

      {/* 批量操作栏 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex-wrap">
          <span className="text-sm font-medium">
            {locale === 'en' ? `${selected.size} selected` : locale === 'zh-HK' ? `已選 ${selected.size} 條` : `已选 ${selected.size} 条`}
          </span>
          <button
            onClick={() => updateStatus([...selected], 'hidden')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
          >
            <EyeOff className="h-3.5 w-3.5" />
            {t(locale, 'admin.posts.hide')}
          </button>
          <button
            onClick={() => updateStatus([...selected], 'published')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            {t(locale, 'admin.posts.unhide')}
          </button>
          <button
            onClick={() => deletePosts([...selected])}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t(locale, 'admin.posts.delete')}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {locale === 'en' ? 'Clear' : locale === 'zh-HK' ? '取消' : '取消选择'}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t(locale, 'admin.posts.empty')}</p>
      ) : (
        filtered.map((p) => {
          const isSelected = selected.has(p.id)
          return (
            <Card key={p.id} className={`${p.status === 'hidden' ? 'opacity-70' : ''} ${isSelected ? 'ring-2 ring-primary/40' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {/* 多选框 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    className="mt-1 h-4 w-4 rounded border-input accent-primary shrink-0"
                  />

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

                  {/* 单条操作 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status === 'published' ? (
                      <button
                        onClick={() => updateStatus([p.id], 'hidden')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {t(locale, 'admin.posts.hide')}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus([p.id], 'published')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t(locale, 'admin.posts.unhide')}
                      </button>
                    )}
                    <button
                      onClick={() => deletePosts([p.id])}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t(locale, 'admin.posts.delete')}
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

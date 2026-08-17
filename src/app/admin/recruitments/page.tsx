'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Ban, Play, Users, Inbox } from 'lucide-react'
import Link from 'next/link'

type Filter = 'all' | 'open' | 'closed'

export default function AdminRecruitmentsPage() {
  const { locale } = useLocale()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  const fetchItems = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/recruitments', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((res) => res.json())
        .then((data) => { if (data.recruitments) setItems(data.recruitments) })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const setStatus = async (ids: string[], status: 'open' | 'closed') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/recruitments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids, status }),
    })
    fetchItems()
  }

  const deleteItems = async (ids: string[]) => {
    if (!window.confirm(L('Delete this recruitment?', '確定刪除這條招募？', '确定删除这条招募？'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/recruitments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids }),
    })
    fetchItems()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: L('All', '全部', '全部') },
    { key: 'open', label: L('Open', '招募中', '招募中') },
    { key: 'closed', label: L('Closed', '已截止', '已截止') },
  ]

  const filtered = filter === 'all' ? items : items.filter((r) => r.status === filter)

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
          {L('Total', '共', '共')} <span className="font-medium text-foreground">{items.length}</span>{' '}
          {L('recruitments', '條招募', '条招募')}
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
          <p className="text-sm">{L('No recruitments.', '暫無招募。', '暂无招募。')}</p>
        </div>
      ) : (
        filtered.map((r) => (
          <Card key={r.id} className={r.status === 'closed' ? 'opacity-70' : ''}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{r.title}</span>
                    <Badge className={r.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>
                      {r.status === 'open' ? L('Open', '招募中', '招募中') : L('Closed', '已截止', '已截止')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                    <Link href={`/recruit/${r.id}`} className="text-primary hover:underline font-mono">
                      #{r.id?.slice(0, 8)}
                    </Link>
                    {r.author_email && <span>{r.author_email}</span>}
                    {r.competition_title && <span>🏆 {r.competition_title}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {r.current_count ?? 0}{r.team_size ? `/${r.team_size}` : ''}
                    </span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {r.status === 'open' ? (
                    <button
                      onClick={() => setStatus([r.id], 'closed')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {L('Close', '關閉', '关闭')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus([r.id], 'open')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {L('Reopen', '重新開啟', '重新开启')}
                    </button>
                  )}
                  <button
                    onClick={() => deleteItems([r.id])}
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

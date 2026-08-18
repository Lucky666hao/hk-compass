'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trash2, Ban, Inbox, X, Search, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUSES = ['报名中', '即将开始', '进行中', '已结束'] as const

const STATUS_CLS: Record<string, string> = {
  '报名中': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  '即将开始': 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  '进行中': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  '已结束': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function AdminCompetitionsPage() {
  const { locale } = useLocale()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  // 防抖搜索
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400)
    return () => clearTimeout(t)
  }, [qInput])

  const fetchItems = useCallback(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status && status !== 'all') params.set('status', status)
      fetch(`/api/admin/competitions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((d) => { if (d.competitions) setItems(d.competitions) })
        .finally(() => setLoading(false))
    })
  }, [q, status])

  useEffect(() => { fetchItems() }, [fetchItems])

  const terminate = async (ids: string[]) => {
    if (!window.confirm(L('Mark selected as ended?', '確定標記為已結束？', '确定标记为已结束？'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/competitions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids, action: 'terminate' }),
    })
    setSelected(new Set())
    fetchItems()
  }

  const deleteItems = async (ids: string[]) => {
    if (!window.confirm(L('Delete these competitions? This cannot be undone.', '確定刪除這些比賽？不可恢復。', '确定删除这些比赛？不可恢复。'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/competitions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids }),
    })
    setSelected(new Set())
    fetchItems()
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = items.length > 0 && items.every((c) => selected.has(c.id))
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map((c) => c.id)))
  }

  const filters: { key: string; label: string }[] = [
    { key: 'all', label: L('All', '全部', '全部') },
    ...STATUSES.map((s) => ({ key: s, label: s })),
  ]

  return (
    <div className="space-y-4">
      {/* 顶部：搜索 + 计数 + 状态筛选 */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={L('Search by title...', '按標題搜索...', '按标题搜索...')}
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={items.length === 0}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="font-medium text-foreground">{items.length}</span>
            {L('competitions', '場比賽', '场比赛')}
          </label>
          <div className="flex rounded-lg bg-muted p-1 gap-1 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => { setStatus(f.key); setSelected(new Set()) }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  status === f.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex-wrap">
          <span className="text-sm font-medium">
            {L('selected', '已選', '已选')} {selected.size}
          </span>
          <button
            onClick={() => terminate([...selected])}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
          >
            <Ban className="h-3.5 w-3.5" />
            {L('Terminate', '終止', '终止')}
          </button>
          <button
            onClick={() => deleteItems([...selected])}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {L('Delete', '刪除', '删除')}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {L('Clear', '取消', '取消选择')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{L('No competitions.', '暫無比賽。', '暂无比赛。')}</p>
        </div>
      ) : (
        items.map((c) => {
          const isSelected = selected.has(c.id)
          return (
            <Card key={c.id} className={cn(c.status === '已结束' && 'opacity-70', isSelected && 'ring-2 ring-primary/40')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(c.id)}
                    className="mt-1 h-4 w-4 rounded border-input accent-primary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{c.title}</span>
                      <Badge className={STATUS_CLS[c.status] || 'bg-muted text-muted-foreground'}>{c.status}</Badge>
                      {c.review_status && c.review_status !== 'approved' && (
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                          {c.review_status === 'pending' ? L('Under review', '審核中', '审核中') : c.review_status === 'rejected' ? L('Rejected', '已駁回', '已驳回') : L('Needs changes', '需補充材料', '需补充材料')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span>{c.type} · {c.location}</span>
                      <span>{c.date_start?.slice(0, 10)}{c.registration_deadline ? ` → ${c.registration_deadline.slice(0, 10)}` : ''}</span>
                      {c.source && <span>{L('Source', '來源', '来源')}: {c.source}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.status !== '已结束' && (
                      <button
                        onClick={() => terminate([c.id])}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {L('End', '終止', '终止')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteItems([c.id])}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {L('Delete', '刪除', '删除')}
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

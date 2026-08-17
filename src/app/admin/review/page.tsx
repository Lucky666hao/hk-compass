'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/i18n/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { AUTHORITY_TAGS, AUTHORITY_LABELS } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Clock, CheckCircle2, XCircle, AlertCircle, Inbox, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

function statusMeta(status: string | undefined, locale: 'en' | 'zh-CN' | 'zh-HK') {
  switch (status) {
    case 'pending':
      return { text: locale === 'en' ? 'Under review' : locale === 'zh-HK' ? '審核中' : '审核中', icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
    case 'rejected':
      return { text: locale === 'en' ? 'Rejected' : locale === 'zh-HK' ? '已駁回' : '已驳回', icon: XCircle, cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' }
    case 'needs_changes':
      return { text: locale === 'en' ? 'Needs changes' : locale === 'zh-HK' ? '需補充材料' : '需补充材料', icon: AlertCircle, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' }
    default:
      return { text: status || '', icon: Clock, cls: 'bg-muted text-muted-foreground' }
  }
}

function ReviewCard({
  c,
  submitterName,
  locale,
  onReviewed,
}: {
  c: Competition
  submitterName: string
  locale: 'en' | 'zh-CN' | 'zh-HK'
  onReviewed: () => void
}) {
  const [action, setAction] = useState<'reject' | 'needs_changes' | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  const setAuthority = async (tag: string | null) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: c.id, authority: tag }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || L('Failed', '操作失敗', '操作失败'))
    }
  }

  const doAction = async (act: 'approve' | 'reject' | 'needs_changes', reason?: string) => {
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }
    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: c.id, action: act, note: reason }),
    })
    setBusy(false)
    if (res.ok) {
      toast.success(L('Done', '已完成', '已完成'))
      onReviewed()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || L('Failed', '操作失敗', '操作失败'))
    }
  }

  const s = statusMeta(c.review_status, locale)
  const StatusIcon = s.icon

  return (
    <div className="p-4 rounded-xl border bg-background">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{c.title}</h3>
            {c.registration_link && (
              <a href={c.registration_link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {c.type} · {c.location} · {c.fee_type}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {L('By', '提交者：', '提交者：')} {submitterName}
            {' · '}
            {c.submitted_at ? new Date(c.submitted_at).toLocaleString() : ''}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {s.text}
        </span>
      </div>

      {/* 关键字段 */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div><span className="font-medium">{L('Dates', '日期', '日期')}:</span> {c.date_start?.slice(0, 10)}{c.date_end ? ` → ${c.date_end.slice(0, 10)}` : ''}</div>
        <div><span className="font-medium">{L('Deadline', '截止', '截止')}:</span> {c.registration_deadline?.slice(0, 10) || '—'}</div>
        {c.organizer && <div className="col-span-2"><span className="font-medium">{L('Organizer', '主办方', '主办方')}:</span> {c.organizer}</div>}
        {c.prize && <div className="col-span-2"><span className="font-medium">{L('Prize', '奖项', '奖项')}:</span> {c.prize}</div>}
        {c.description && <div className="col-span-2"><span className="font-medium">{L('Desc', '简介', '简介')}:</span> {c.description.slice(0, 120)}</div>}
      </div>

      {/* 现有驳回原因 */}
      {c.review_note && (
        <div className="mt-3 p-2.5 rounded-lg bg-muted/60 text-xs">
          <span className="font-medium text-muted-foreground">{L('Note', '意見', '意见')}:</span> {c.review_note}
        </div>
      )}

      {/* 操作按钮 */}
      {!action ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => doAction('approve')}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {L('Approve', '通過', '通过')}
          </button>
          <button
            onClick={() => setAction('needs_changes')}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <AlertCircle className="h-4 w-4" /> {L('Needs changes', '需補充材料', '需补充材料')}
          </button>
          <button
            onClick={() => setAction('reject')}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> {L('Reject', '駁回', '驳回')}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={L('Reason (required)', '填寫原因（必填）', '填写原因（必填）')}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => doAction(action, note)}
              disabled={busy || !note.trim()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {L('Confirm', '確認', '确认')}
            </button>
            <button
              onClick={() => { setAction(null); setNote('') }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border hover:bg-muted"
            >
              {L('Cancel', '取消', '取消')}
            </button>
          </div>
        </div>
      )}

      {/* 权威/含金量标签（点击切换，再点取消） */}
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          {L('Authority tag', '權威/含金量標籤', '权威/含金量标签')}:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {AUTHORITY_TAGS.map((tag) => {
            const active = c.authority === tag
            return (
              <button
                key={tag}
                onClick={() => setAuthority(active ? null : tag)}
                className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                  active
                    ? 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'border-border text-muted-foreground hover:border-foreground/30'
                }`}
              >
                {AUTHORITY_LABELS[tag]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AdminReviewPage() {
  const { locale } = useLocale()
  const [items, setItems] = useState<Competition[]>([])
  const [submitterMap, setSubmitterMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'needs_changes' | 'rejected' | 'all'>('pending')
  const [sourceFilter, setSourceFilter] = useState<'crawler' | 'community'>('crawler')

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .neq('review_status', 'approved')
      .order('submitted_at', { ascending: false })

    const list = (data as Competition[]) ?? []
    setItems(list)

    const userIds = [...new Set(list.map((c) => c.submitted_by).filter(Boolean))] as string[]
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)
      const map: Record<string, string> = {}
      ;(profiles ?? []).forEach((p: any) => { map[p.user_id] = p.display_name })
      setSubmitterMap(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sourceItems = sourceFilter === 'community'
    ? items.filter((c) => c.source === 'community')
    : items.filter((c) => c.source !== 'community')
  const filtered = filter === 'all' ? sourceItems : sourceItems.filter((c) => c.review_status === filter)

  return (
    <div className="space-y-4">
      {/* 来源分流：爬虫采集 vs 用户手动提交 */}
      <div className="flex rounded-lg bg-muted p-1 gap-1 w-fit">
        {([
          { key: 'crawler', label: L('Crawler scraped', '爬蟲採集', '爬虫采集') },
          { key: 'community', label: L('User submitted', '用戶提交', '用户提交') },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setSourceFilter(s.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              sourceFilter === s.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.label}
            <span className="ml-1 opacity-60">
              ({s.key === 'crawler' ? items.filter((c) => c.source !== 'community').length : items.filter((c) => c.source === 'community').length})
            </span>
          </button>
        ))}
      </div>

      {/* 状态筛选 tab */}
      <div className="flex items-center gap-1 flex-wrap">
        {([
          { key: 'pending', label: L('Under review', '審核中', '审核中') },
          { key: 'needs_changes', label: L('Needs changes', '需補充材料', '需补充材料') },
          { key: 'rejected', label: L('Rejected', '已駁回', '已驳回') },
          { key: 'all', label: L('All', '全部', '全部') },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              filter === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            {t.label}
            {t.key !== 'all' && <span className="ml-1 opacity-60">({sourceItems.filter((c) => c.review_status === t.key).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{L('Nothing to review here.', '暫無需審核的比賽。', '暂无待审核的比赛。')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ReviewCard
              key={c.id}
              c={c}
              submitterName={submitterMap[c.submitted_by || ''] || L('Unknown', '未知', '未知')}
              locale={locale}
              onReviewed={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}

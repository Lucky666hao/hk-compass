'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Pencil, Inbox } from 'lucide-react'
import { toast } from 'sonner'

function reviewLabel(status: string | undefined, locale: 'en' | 'zh-CN' | 'zh-HK') {
  switch (status) {
    case 'pending':
      return { text: locale === 'en' ? 'Under review' : locale === 'zh-HK' ? '審核中' : '审核中', icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
    case 'approved':
      return { text: locale === 'en' ? 'Approved' : locale === 'zh-HK' ? '已通過' : '已通过', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' }
    case 'rejected':
      return { text: locale === 'en' ? 'Rejected' : locale === 'zh-HK' ? '已駁回' : '已驳回', icon: XCircle, cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' }
    case 'needs_changes':
      return { text: locale === 'en' ? 'Needs changes' : locale === 'zh-HK' ? '需補充材料' : '需补充材料', icon: AlertCircle, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' }
    default:
      return { text: status || '', icon: Clock, cls: 'bg-muted text-muted-foreground' }
  }
}

export default function MineSubmissionsPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [subs, setSubs] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('submitted_by', uid)
      .order('submitted_at', { ascending: false })

    if (error) {
      toast.error(error.message)
    } else {
      setSubs((data as Competition[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/auth/login?redirect=/competition/mine')
        return
      }
      setUserId(session.user.id)
      load(session.user.id)
    })
  }, [router, load])

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-3">
        <Skeleton className="h-10 w-40" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {L('Back', '返回', '返回')}
      </button>

      <h1 className="text-2xl font-bold mb-1">{L('My Submissions', '我的提交', '我的提交')}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {L('Competitions you submitted for review.', '你提交審核的比賽。', '你提交审核的比赛。')}
      </p>

      {subs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{L('No submissions yet.', '未有提交。', '还没有提交。')}</p>
          <Button className="mt-4" onClick={() => router.push('/competition/rules')}>
            {L('Publish a competition', '發佈比賽', '发布比赛')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((c) => {
            const s = reviewLabel(c.review_status, locale)
            const Icon = s.icon
            const editable = c.review_status === 'rejected' || c.review_status === 'needs_changes'
            return (
              <div key={c.id} className="p-4 rounded-xl border bg-background">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.type} · {c.location} · {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {s.text}
                  </span>
                </div>

                {/* 驳回/补充原因 */}
                {c.review_note && (c.review_status === 'rejected' || c.review_status === 'needs_changes') && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/60 text-sm">
                    <span className="font-medium text-muted-foreground text-xs block mb-1">
                      {L('Reviewer note:', '審核意見：', '审核意见：')}
                    </span>
                    <p className="whitespace-pre-wrap">{c.review_note}</p>
                  </div>
                )}

                {editable && (
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push(`/competition/new?edit=${c.id}`)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {L('Edit & resubmit', '編輯並重新提交', '编辑并重新提交')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

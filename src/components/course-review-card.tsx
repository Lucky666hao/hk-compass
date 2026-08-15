'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { CourseReview } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Star, Flag, Pencil, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { StarPicker, ScalePicker } from '@/components/course-review-form'

/** 5 星评分（只读展示） */
export function StarRating({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${i <= value ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

/** 难度/工作量 5 格条形 */
function Meter({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-4 h-1.5 rounded-full ${i <= value ? 'bg-amber-500' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  )
}

const REPORT_REASONS = [
  { key: 'spam', en: 'Spam', zh: '垃圾信息' },
  { key: 'harassment', en: 'Harassment', zh: '骚扰' },
  { key: 'inappropriate', en: 'Inappropriate', zh: '不当内容' },
  { key: 'violence', en: 'Violence', zh: '暴力内容' },
  { key: 'other', en: 'Other', zh: '其他' },
]

export function CourseReviewCard({
  review,
  currentUserId,
  onChanged,
}: {
  review: CourseReview
  currentUserId?: string | null
  onChanged?: () => void
}) {
  const { locale } = useLocale()
  const [editing, setEditing] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // 编辑表单状态
  const [courseName, setCourseName] = useState(review.course_name)
  const [courseCode, setCourseCode] = useState(review.course_code ?? '')
  const [professorName, setProfessorName] = useState(review.professor_name ?? '')
  const [rating, setRating] = useState(review.rating)
  const [difficulty, setDifficulty] = useState<number | null>(review.difficulty)
  const [workload, setWorkload] = useState<number | null>(review.workload)
  const [comment, setComment] = useState(review.comment ?? '')
  const [isAnonymous, setIsAnonymous] = useState(review.is_anonymous)

  const isAuthor = !!currentUserId && currentUserId === review.user_id

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy' : 'M月d日'
  const timeAgo = format(new Date(review.created_at), dateFormat, { locale: dateLocale })

  const handleReport = async (reason: string) => {
    if (!currentUserId) {
      toast.error(locale === 'en' ? 'Please log in first' : locale === 'zh-HK' ? '請先登入' : '请先登录')
      return
    }
    const { error } = await supabase.from('course_review_reports').insert({
      review_id: review.id,
      reporter_id: currentUserId,
      reason,
    })
    if (error) {
      if (error.code === '23505') toast.error(locale === 'en' ? 'Already reported' : locale === 'zh-HK' ? '已舉報過' : '已举报过')
      else toast.error(locale === 'en' ? 'Report failed' : '举报失败')
    } else {
      toast.success(locale === 'en' ? 'Reported. Thank you.' : locale === 'zh-HK' ? '已舉報，謝謝。' : '已举报，谢谢。')
    }
    setReportOpen(false)
  }

  const handleSave = async () => {
    if (!courseName.trim()) {
      toast.error(t(locale, 'review.no_course'))
      return
    }
    if (rating < 1) {
      toast.error(t(locale, 'review.no_rating'))
      return
    }
    setSaving(true)
    const { error } = await supabase.from('course_reviews').update({
      course_name: courseName.trim(),
      course_code: courseCode.trim() || null,
      professor_name: professorName.trim() || null,
      rating,
      difficulty,
      workload,
      comment: comment.trim() || null,
      is_anonymous: isAnonymous,
    }).eq('id', review.id)
    setSaving(false)
    if (error) {
      toast.error(locale === 'en' ? 'Update failed' : locale === 'zh-HK' ? '更新失敗' : '更新失败')
    } else {
      toast.success(locale === 'en' ? 'Review updated' : locale === 'zh-HK' ? '評價已更新' : '评价已更新')
      setEditing(false)
      onChanged?.()
    }
  }

  const handleDelete = async () => {
    if (!confirm(locale === 'en' ? 'Delete this review?' : locale === 'zh-HK' ? '確定刪除呢條評價？' : '确定删除这条评价？')) return
    const { error } = await supabase.from('course_reviews').delete().eq('id', review.id)
    if (error) {
      toast.error(locale === 'en' ? 'Delete failed' : locale === 'zh-HK' ? '刪除失敗' : '删除失败')
    } else {
      toast.success(locale === 'en' ? 'Review deleted' : locale === 'zh-HK' ? '評價已刪除' : '评价已删除')
      onChanged?.()
    }
  }

  // 编辑模式
  if (editing) {
    return (
      <Card className="border-primary/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {locale === 'en' ? 'Edit review' : locale === 'zh-HK' ? '編輯評價' : '编辑评价'}
            </h3>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground p-0.5 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.course_name')} *</label>
              <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} maxLength={200} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.course_code')}</label>
              <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} maxLength={20} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.professor')}</label>
            <Input value={professorName} onChange={(e) => setProfessorName(e.target.value)} maxLength={100} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.rating')} *</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div className="space-y-2">
            <ScalePicker label={t(locale, 'review.difficulty')} value={difficulty} onChange={setDifficulty} />
            <ScalePicker label={t(locale, 'review.workload')} value={workload} onChange={setWorkload} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.comment')}</label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="resize-y min-h-[70px]" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span>🕶️ {t(locale, 'review.anonymous')}</span>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              {locale === 'en' ? 'Cancel' : locale === 'zh-HK' ? '取消' : '取消'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (locale === 'en' ? 'Saving...' : locale === 'zh-HK' ? '保存中...' : '保存中...')
                : (locale === 'en' ? 'Save' : locale === 'zh-HK' ? '保存' : '保存')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* 顶部：科目 + 老师 + 时间 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              {review.course_name}
              {review.course_code && (
                <span className="text-xs font-mono text-muted-foreground">{review.course_code}</span>
              )}
            </h3>
            {review.professor_name && (
              <p className="text-xs text-muted-foreground mt-0.5">👨‍🏫 {review.professor_name}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
        </div>

        {/* 评分 + 难度/工作量 */}
        <div className="flex items-center gap-2 mb-2">
          <StarRating value={review.rating} />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{review.rating}.0</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
          <Meter label={t(locale, 'review.difficulty')} value={review.difficulty} />
          <Meter label={t(locale, 'review.workload')} value={review.workload} />
        </div>

        {/* 文字评价 */}
        {review.comment && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{review.comment}</p>
        )}

        {/* 作者 / 匿名标记 + 操作按钮 */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            {review.is_anonymous ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                🕶️ {t(locale, 'review.anonymous')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={review.avatar_url || undefined} alt={review.author_name || ''} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {(review.author_name || '?').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[160px] font-medium text-foreground">
                  {review.author_name || '👤'}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAuthor && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title={locale === 'en' ? 'Edit' : locale === 'zh-HK' ? '編輯' : '编辑'}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title={locale === 'en' ? 'Delete' : locale === 'zh-HK' ? '刪除' : '删除'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {currentUserId && !isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setReportOpen(!reportOpen)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title={locale === 'en' ? 'Report' : '举报'}
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
                {reportOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-popover border rounded-lg shadow-lg p-2 w-40">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => handleReport(r.key)}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                      >
                        {locale === 'en' ? r.en : r.zh}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

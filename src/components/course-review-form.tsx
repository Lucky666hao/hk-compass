'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

/** 可点击的 5 星选择器 */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
          aria-label={`${i} stars`}
        >
          <Star
            className={`h-6 w-6 ${i <= value ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
    </div>
  )
}

/** 1-5 量表选择器（难度/工作量） */
export function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            type="button"
            key={i}
            onClick={() => onChange(value === i ? null : i)}
            className={`w-8 h-7 rounded-md text-xs font-medium border transition-colors ${
              value === i
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-background text-muted-foreground border-border hover:border-amber-400'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CourseReviewForm({
  universitySlug,
  onSubmitted,
}: {
  universitySlug: string
  onSubmitted?: () => void
}) {
  const { locale } = useLocale()
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [professorName, setProfessorName] = useState('')
  const [rating, setRating] = useState(0)
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [workload, setWorkload] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!courseName.trim()) {
      toast.error(t(locale, 'review.no_course'))
      return
    }
    if (rating < 1) {
      toast.error(t(locale, 'review.no_rating'))
      return
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(t(locale, 'review.login_prompt'))
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('course_reviews').insert({
      user_id: session.user.id,
      university_slug: universitySlug,
      course_name: courseName.trim(),
      course_code: courseCode.trim() || null,
      professor_name: professorName.trim() || null,
      rating,
      difficulty,
      workload,
      comment: comment.trim() || null,
      is_anonymous: isAnonymous,
    })

    setSubmitting(false)

    if (error) {
      toast.error(t(locale, 'review.submit_error'))
    } else {
      toast.success(t(locale, 'review.submit_success'))
      setCourseName('')
      setCourseCode('')
      setProfessorName('')
      setRating(0)
      setDifficulty(null)
      setWorkload(null)
      setComment('')
      onSubmitted?.()
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.course_name')} *</label>
          <Input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder={t(locale, 'review.course_name_placeholder')}
            maxLength={200}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.course_code')}</label>
          <Input
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="COMP101"
            maxLength={20}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.professor')}</label>
        <Input
          value={professorName}
          onChange={(e) => setProfessorName(e.target.value)}
          placeholder={t(locale, 'review.professor_placeholder')}
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.rating')} *</label>
        <div className="flex items-center gap-2">
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 && <span className="text-sm text-muted-foreground">{rating} / 5</span>}
        </div>
      </div>

      <div className="space-y-2">
        <ScalePicker label={t(locale, 'review.difficulty')} value={difficulty} onChange={setDifficulty} />
        <ScalePicker label={t(locale, 'review.workload')} value={workload} onChange={setWorkload} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">{t(locale, 'review.comment')}</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t(locale, 'review.comment_placeholder')}
          rows={4}
          className="resize-y min-h-[90px]"
        />
      </div>

      {/* 匿名开关 */}
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <span>🕶️ {t(locale, 'review.anonymous')}</span>
        <span className="text-xs text-muted-foreground">{t(locale, 'review.anonymous_hint')}</span>
      </label>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? t(locale, 'review.submitting') : t(locale, 'review.submit')}
        </Button>
      </div>
    </div>
  )
}

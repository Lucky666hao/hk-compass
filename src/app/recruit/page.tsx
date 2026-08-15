'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Recruitment } from '@/lib/types'
import { RecruitmentCard } from '@/components/recruitment-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { useState } from 'react'
import { HK_UNIVERSITIES } from '@/lib/university-data'
import { getFaculties } from '@/lib/faculty-data'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function RecruitPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [uniFilter, setUniFilter] = useState<string>('')
  const [facultyFilter, setFacultyFilter] = useState<string>('')

  const { data: recruitments, isLoading } = useQuery({
    queryKey: ['recruitments', statusFilter, uniFilter, facultyFilter],
    queryFn: async () => {
      let query = supabase
        .from('recruitments')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (uniFilter) {
        query = query.eq('university_slug', uniFilter)
      }
      if (facultyFilter) {
        query = query.eq('faculty', facultyFilter)
      }

      const { data } = await query
      return (data as Recruitment[]) ?? []
    },
  })

  const filters = [
    { key: 'open', label: t(locale, 'recruit.status_open') as string },
    { key: 'closed', label: t(locale, 'recruit.status_closed') as string },
    { key: 'all', label: t(locale, 'recruit.all') as string },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">{t(locale, 'recruit.title')}</h1>
        </div>
        <Button onClick={() => router.push('/recruit/new')} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-1.5" />
          {t(locale, 'recruit.new')}
        </Button>
      </div>

      {/* 状态筛选 */}
      <div className="flex gap-1.5 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 学校/学院筛选（学生组队） */}
      <div className="flex gap-2 mb-4">
        <Select value={uniFilter || '_all'} onValueChange={(v) => { setUniFilter(v && v !== '_all' ? v : ''); setFacultyFilter('') }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t(locale, 'recruit.filter_uni')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t(locale, 'recruit.filter_uni_all')}</SelectItem>
            {HK_UNIVERSITIES.map((u) => (
              <SelectItem key={u.slug} value={u.slug}>
                {u.logo} {locale === 'en' ? u.enName : u.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniFilter && (
          <Select value={facultyFilter || '_any'} onValueChange={(v) => setFacultyFilter(v && v !== '_any' ? v : '')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t(locale, 'recruit.filter_faculty')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_any">{t(locale, 'recruit.filter_faculty_all')}</SelectItem>
              {getFaculties(uniFilter).map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : recruitments && recruitments.length > 0 ? (
        <div className="space-y-3">
          {recruitments.map((r) => (
            <RecruitmentCard key={r.id} recruitment={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Users className="mb-4 h-12 w-12" />
          <p className="text-lg">{t(locale, 'recruit.empty')}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/recruit/new')}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t(locale, 'recruit.new')}
          </Button>
        </div>
      )}
    </div>
  )
}

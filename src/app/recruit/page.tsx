'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Recruitment, TeamSize } from '@/lib/types'
import { TEAM_SIZE_OPTIONS, TEAM_SIZE_LABELS } from '@/lib/types'
import { RecruitmentCard } from '@/components/recruitment-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Users, Plus, Flame, Clock, Search, X, ChevronDown } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type SortMode = 'newest' | 'needy'

export default function RecruitPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [teamSizeFilter, setTeamSizeFilter] = useState<string>('全部')
  const [sort, setSort] = useState<SortMode>('newest')

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setKeyword(searchInput.trim())
  }

  const { data: recruitments, isLoading } = useQuery({
    queryKey: ['recruitments', keyword, statusFilter, teamSizeFilter, sort],
    queryFn: async () => {
      let query = supabase
        .from('recruitments')
        .select('*')

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (keyword) {
        query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%,requirements.ilike.%${keyword}%`)
      }
      if (teamSizeFilter !== '全部') {
        // 不限 → 同时匹配 team_size='不限' 和 NULL（发布时未选人数即不限）
        if (teamSizeFilter === '不限') {
          query = query.or('team_size.eq.不限,team_size.is.null')
        } else {
          query = query.eq('team_size', teamSizeFilter)
        }
      }
      if (sort === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else {
        // 缺人优先：现有人数最少的排前面
        query = query.order('current_count', { ascending: true })
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

      {/* 检索：关键词 + 分组筛选 */}
      <div className="mb-5 space-y-3">
        {/* 关键词搜索 */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={L('Search title / description', '搜尋標題/描述', '搜索标题/描述')}
            className="h-11 pl-9 pr-20 text-base"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setSearchInput(''); setKeyword('') }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" size="sm" className="h-8">{L('Search', '搜索', '搜索')}</Button>
          </div>
        </form>

        {/* 分组：状态 + 人数 + 排序 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 状态筛选 */}
          <div className="flex gap-1.5">
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

          {/* 人数筛选 */}
          <Popover>
            <PopoverTrigger
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 h-7 text-xs transition-colors',
                teamSizeFilter !== '全部'
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-border bg-background hover:bg-muted'
              )}
            >
              {teamSizeFilter === '全部'
                ? L('Team size', '人數', '人数')
                : TEAM_SIZE_LABELS[teamSizeFilter as TeamSize] ?? teamSizeFilter}
              <ChevronDown className="h-3 w-3" />
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              <button
                onClick={() => setTeamSizeFilter('全部')}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                  teamSizeFilter === '全部' ? 'bg-accent font-medium' : ''
                )}
              >
                {L('All sizes', '所有人數', '所有人数')}
              </button>
              {TEAM_SIZE_OPTIONS.map((ts) => (
                <button
                  key={ts}
                  onClick={() => setTeamSizeFilter(ts)}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    teamSizeFilter === ts ? 'bg-accent font-medium' : ''
                  )}
                >
                  {TEAM_SIZE_LABELS[ts]}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* 排序 */}
          <div className="ml-auto flex rounded-lg bg-muted p-1 gap-1">
            <button
              onClick={() => setSort('newest')}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors',
                sort === 'newest' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {L('Newest', '最新', '最新')}
            </button>
            <button
              onClick={() => setSort('needy')}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs transition-colors',
                sort === 'needy' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Flame className="h-3.5 w-3.5" />
              {L('Most needed', '缺人優先', '缺人优先')}
            </button>
          </div>
        </div>
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

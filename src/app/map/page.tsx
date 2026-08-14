'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition, CompetitionLocation } from '@/lib/types'
import { CompetitionCard } from '@/components/competition-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Map, ArrowLeft } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

const REGIONS: CompetitionLocation[] = ['港岛', '九龙', '新界', '线上']

// 区域配色（浅色系，用于地图区块）
const REGION_STYLE: Record<CompetitionLocation, string> = {
  港岛: 'bg-rose-100 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30',
  九龙: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30',
  新界: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30',
  线上: 'bg-sky-100 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/30',
}

export default function MapPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [selected, setSelected] = useState<CompetitionLocation | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['map-competitions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('review_status', 'approved')
        .neq('status', '已结束')
        .order('registration_deadline', { ascending: true, nullsFirst: false })
        .order('date_start', { ascending: true })
      return (data as Competition[]) ?? []
    },
  })

  const competitions = data ?? []

  const counts = useMemo(() => {
    const m = {} as Record<CompetitionLocation, number>
    for (const r of REGIONS) m[r] = 0
    for (const c of competitions) {
      if (c.location && m[c.location] !== undefined) m[c.location]++
    }
    return m
  }, [competitions])

  const filtered = selected ? competitions.filter((c) => c.location === selected) : competitions

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'back')}
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Map className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t(locale, 'map.title')}</h1>
      </div>
      <p className="mb-6 -mt-2 text-sm text-muted-foreground">{t(locale, 'map.subtitle')}</p>

      {/* 香港三区「地图」+ 线上 */}
      <div className="mb-8 space-y-2">
        {/* 新界（北） */}
        <RegionZone
          region="新界"
          count={counts['新界']}
          selected={selected === '新界'}
          onClick={() => setSelected(selected === '新界' ? null : '新界')}
          locale={locale}
        />
        {/* 九龙（中） */}
        <div className="grid grid-cols-2 gap-2">
          <RegionZone
            region="九龙"
            count={counts['九龙']}
            selected={selected === '九龙'}
            onClick={() => setSelected(selected === '九龙' ? null : '九龙')}
            locale={locale}
          />
          {/* 港岛（南，岛屿） */}
          <RegionZone
            region="港岛"
            count={counts['港岛']}
            selected={selected === '港岛'}
            onClick={() => setSelected(selected === '港岛' ? null : '港岛')}
            locale={locale}
          />
        </div>
        {/* 线上 */}
        <RegionZone
          region="线上"
          count={counts['线上']}
          selected={selected === '线上'}
          onClick={() => setSelected(selected === '线上' ? null : '线上')}
          locale={locale}
        />
      </div>

      {/* 列表 */}
      <h2 className="font-semibold text-lg mb-3">
        {selected
          ? t(locale, 'map.in_region', { region: t(locale, `location.${selected}`) })
          : t(locale, 'map.all_active')}
      </h2>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Map className="mb-4 h-12 w-12 opacity-30" />
          <p className="text-lg">{t(locale, 'map.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      )}
    </div>
  )
}

function RegionZone({
  region,
  count,
  selected,
  onClick,
  locale,
}: {
  region: CompetitionLocation
  count: number
  selected: boolean
  onClick: () => void
  locale: 'en' | 'zh-CN' | 'zh-HK'
}) {
  const style = REGION_STYLE[region]
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${style} ${
        selected ? 'ring-2 ring-primary' : 'hover:shadow-md hover:scale-[1.01]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">{t(locale, `location.${region}`)}</span>
        <span className="text-2xl font-bold opacity-70">{count}</span>
      </div>
      <p className="text-xs opacity-60 mt-0.5">
        {locale === 'en' ? 'competitions' : locale === 'zh-HK' ? '個比賽' : '个比赛'}
      </p>
    </button>
  )
}

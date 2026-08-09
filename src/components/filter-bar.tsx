'use client'

import type { CompetitionFilters, TeamSize } from '@/lib/types'
import { TEAM_SIZE_OPTIONS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'

// 原始中文值 → i18n key 的映射
const TYPE_KEYS = ['运动', '电竞', '创意摄影设计', 'AI创作', '创业路演', '音乐表演', '其他']
const LOCATION_KEYS = ['港岛', '九龙', '新界', '线上']
const FEE_KEYS = ['免费', '付费', '有奖金']
const STATUS_KEYS = ['报名中', '即将开始', '进行中', '已结束']
const AGE_KEYS = ['儿童', '青少年', '成人公开', '不限']

interface Props {
  filters: CompetitionFilters
  onFilterChange: (key: keyof CompetitionFilters, value: string) => void
}

const DATE_VALUES = ['全部', '本周', '本月', '下月']
const DATE_LABEL_KEYS = ['home.filter.all_time', 'home.filter.this_week', 'home.filter.this_month', 'home.filter.next_month']

const btnBase = 'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border text-sm font-medium whitespace-nowrap transition-all outline-none h-7 px-2.5'
const btnActive = 'bg-primary text-primary-foreground border-transparent hover:bg-primary/80'
const btnInactive = 'border-border bg-background hover:bg-muted hover:text-foreground'

export function FilterBar({ filters, onFilterChange }: Props) {
  const { locale } = useLocale()

  const hasActive =
    filters.type !== '全部' ||
    filters.location !== '全部' ||
    filters.fee_type !== '全部' ||
    filters.date_range !== '全部' ||
    filters.age_group !== '全部' ||
    filters.team_size !== '全部' ||
    filters.status !== '全部'

  const resetAll = () => {
    onFilterChange('type', '全部')
    onFilterChange('location', '全部')
    onFilterChange('fee_type', '全部')
    onFilterChange('date_range', '全部')
    onFilterChange('age_group', '全部')
    onFilterChange('team_size', '全部')
    onFilterChange('status', '全部')
  }

  const typeOptions = [
    { value: '全部', label: t(locale, 'home.filter.all_types') },
    ...TYPE_KEYS.map((k) => ({ value: k, label: t(locale, `type.${k}`) })),
  ]
  const locOptions = [
    { value: '全部', label: t(locale, 'home.filter.all_locations') },
    ...LOCATION_KEYS.map((k) => ({ value: k, label: t(locale, `location.${k}`) })),
  ]
  const feeOptions = [
    { value: '全部', label: t(locale, 'home.filter.all_fees') },
    ...FEE_KEYS.map((k) => ({ value: k, label: t(locale, `fee.${k}`) })),
  ]
  const dateOptions = DATE_VALUES.map((v, i) => ({ value: v, label: t(locale, DATE_LABEL_KEYS[i]) }))
  const statusOptions = [
    { value: '全部', label: t(locale, 'home.filter.all_status') },
    ...STATUS_KEYS.map((k) => ({ value: k, label: t(locale, `status.${k}`) })),
  ]
  const ageOptions = [
    { value: '全部', label: t(locale, 'home.filter.all_ages') },
    ...AGE_KEYS.map((k) => ({ value: k, label: t(locale, `age.${k}`) })),
  ]
  const teamOptions = [
    { value: '全部', label: locale === 'en' ? 'All Sizes' : locale === 'zh-HK' ? '所有人數' : '所有人数' },
    ...TEAM_SIZE_OPTIONS.map((k) => ({ value: k, label: t(locale, `team_size.${k}`) as string })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPopover
        label={t(locale, 'home.filter.type')}
        value={filters.type ?? '全部'}
        options={typeOptions}
        onChange={(v) => onFilterChange('type', v)}
      />
      <FilterPopover
        label={t(locale, 'home.filter.location')}
        value={filters.location ?? '全部'}
        options={locOptions}
        onChange={(v) => onFilterChange('location', v)}
      />
      <FilterPopover
        label={t(locale, 'home.filter.fee')}
        value={filters.fee_type ?? '全部'}
        options={feeOptions}
        onChange={(v) => onFilterChange('fee_type', v)}
      />
      <FilterPopover
        label={t(locale, 'home.filter.date')}
        value={filters.date_range ?? '全部'}
        options={dateOptions}
        onChange={(v) => onFilterChange('date_range', v)}
      />
      <FilterPopover
        label={t(locale, 'home.filter.status')}
        value={filters.status ?? '全部'}
        options={statusOptions}
        onChange={(v) => onFilterChange('status', v)}
      />
      <FilterPopover
        label={t(locale, 'home.filter.age')}
        value={filters.age_group ?? '全部'}
        options={ageOptions}
        onChange={(v) => onFilterChange('age_group', v)}
      />
      <FilterPopover
        label={locale === 'en' ? 'Team' : locale === 'zh-HK' ? '人數' : '人数'}
        value={filters.team_size ?? '全部'}
        options={teamOptions}
        onChange={(v) => onFilterChange('team_size', v)}
      />
      {hasActive && (
        <Button variant="ghost" size="sm" onClick={resetAll}>
          {t(locale, 'home.filter.reset')}
        </Button>
      )}
    </div>
  )
}

function FilterPopover({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const selected = options.find((o) => o.value === value)
  const isActive = value !== '全部'

  return (
    <Popover>
      <PopoverTrigger
        className={`${btnBase} ${isActive ? btnActive : btnInactive}`}
      >
        {selected?.label ?? label}
        <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
              opt.value === value ? 'bg-accent font-medium' : ''
            }`}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

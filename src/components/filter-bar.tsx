'use client'

import type { CompetitionFilters } from '@/lib/types'
import { TYPE_LABELS, LOCATION_LABELS, FEE_LABELS, STATUS_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'

interface Props {
  filters: CompetitionFilters
  onFilterChange: (key: keyof CompetitionFilters, value: string) => void
}

const DATE_OPTIONS = [
  { value: '全部', label: '全部时间' },
  { value: '本周', label: '本周' },
  { value: '本月', label: '本月' },
  { value: '下月', label: '下月' },
]

const btnBase = 'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border text-sm font-medium whitespace-nowrap transition-all outline-none h-7 px-2.5'
const btnActive = 'bg-primary text-primary-foreground border-transparent hover:bg-primary/80'
const btnInactive = 'border-border bg-background hover:bg-muted hover:text-foreground'

export function FilterBar({ filters, onFilterChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPopover
        label="类型"
        value={filters.type ?? '全部'}
        options={[
          { value: '全部', label: '全部类型' },
          ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
        ]}
        onChange={(v) => onFilterChange('type', v)}
      />
      <FilterPopover
        label="地点"
        value={filters.location ?? '全部'}
        options={[
          { value: '全部', label: '全部地点' },
          ...Object.entries(LOCATION_LABELS).map(([k, v]) => ({ value: k, label: v })),
        ]}
        onChange={(v) => onFilterChange('location', v)}
      />
      <FilterPopover
        label="费用"
        value={filters.fee_type ?? '全部'}
        options={[
          { value: '全部', label: '全部费用' },
          ...Object.entries(FEE_LABELS).map(([k, v]) => ({ value: k, label: v })),
        ]}
        onChange={(v) => onFilterChange('fee_type', v)}
      />
      <FilterPopover
        label="时间"
        value={filters.date_range ?? '全部'}
        options={DATE_OPTIONS}
        onChange={(v) => onFilterChange('date_range', v)}
      />
      <FilterPopover
        label="状态"
        value={filters.status ?? '全部'}
        options={[
          { value: '全部', label: '全部状态' },
          ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
        ]}
        onChange={(v) => onFilterChange('status', v)}
      />
      {(filters.type !== '全部' ||
        filters.location !== '全部' ||
        filters.fee_type !== '全部' ||
        filters.date_range !== '全部' ||
        filters.status !== '全部') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onFilterChange('type', '全部')
            onFilterChange('location', '全部')
            onFilterChange('fee_type', '全部')
            onFilterChange('date_range', '全部')
            onFilterChange('status', '全部')
          }}
        >
          重置筛选
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

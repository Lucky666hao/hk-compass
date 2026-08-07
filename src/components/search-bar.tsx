'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface Props {
  onSearch: (keyword: string) => void
  defaultValue?: string
}

export function SearchBar({ onSearch, defaultValue = '' }: Props) {
  const [value, setValue] = useState(defaultValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索比赛名称、类型、主办方..."
        className="h-11 pl-9 pr-20 text-base"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" size="sm" className="h-8">
          搜索
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const MIGRATIONS = [
  { name: 'Team Size 回填 (NULL→不限)', key: 'backfill_team_size' },
  { name: 'Team Competitions 插入7个团体赛', key: 'insert_team_competitions' },
]

type Status = 'idle' | 'running' | 'success' | 'error'

export default function SetupPage() {
  const [results, setResults] = useState<Record<string, Status>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [allDone, setAllDone] = useState(false)

  const runAll = async () => {
    setAllDone(false)
    for (const m of MIGRATIONS) {
      setResults((prev) => ({ ...prev, [m.key]: 'running' }))
      try {
        const res = await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ migration: m.key }),
        })
        const data = await res.json()
        if (data.success) {
          setResults((prev) => ({ ...prev, [m.key]: 'success' }))
          const msg = data.updated != null
            ? `已更新 ${data.updated} 条记录`
            : data.inserted != null
            ? `已插入 ${data.inserted} 条记录`
            : data.message || '完成'
          setMessages((prev) => ({ ...prev, [m.key]: msg }))
        } else {
          setResults((prev) => ({ ...prev, [m.key]: 'error' }))
          setMessages((prev) => ({ ...prev, [m.key]: data.error || '失败' }))
        }
      } catch (err: any) {
        setResults((prev) => ({ ...prev, [m.key]: 'error' }))
        setMessages((prev) => ({ ...prev, [m.key]: err.message || '网络错误' }))
      }
    }
    setAllDone(true)
  }

  const statusIcon = (s: Status) => {
    if (s === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (s === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (s === 'error') return <XCircle className="h-4 w-4 text-red-500" />
    return <span className="w-4 h-4 rounded-full border border-muted-foreground/30" />
  }

  const isRunning = Object.values(results).some((s) => s === 'running')

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-2xl font-bold mb-2 text-center">🛠 Database Setup</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        一键执行数据迁移，无需手动运行 SQL
      </p>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          {MIGRATIONS.map((m) => (
            <div key={m.key} className="flex items-center gap-3 py-1.5">
              {statusIcon(results[m.key] || 'idle')}
              <span className="text-sm flex-1">{m.name}</span>
              {messages[m.key] && (
                <span className="text-xs text-muted-foreground">{messages[m.key]}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={runAll}
        disabled={isRunning}
      >
        {isRunning ? 'Running...' : allDone ? '✅ 完成！可再次执行' : 'Run All Migrations'}
      </Button>

      {/* 补充说明：DDL 迁移（建表/加列）仍需 SQL Editor */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        如遇 team_size 列不存在等错误，请先在{' '}
        <a
          href="https://supabase.com/dashboard/project/kjqcnxrebdrnmhtwyyhw/sql/new"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Supabase SQL Editor
        </a>{' '}
        中手动执行 <code className="bg-muted px-1 rounded">supabase/migrations/20250808_add_team_size.sql</code>
      </p>
    </div>
  )
}

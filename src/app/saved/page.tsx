'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { CompetitionCard } from '@/components/competition-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Heart, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SavedPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
      else setUserId(null)
    })
  }, [])

  const { data: competitions, isLoading } = useQuery({
    queryKey: ['saved-competitions', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data: saved } = await supabase
        .from('saved_competitions')
        .select('competition_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!saved?.length) return []

      const ids = saved.map((s) => s.competition_id)
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .in('id', ids)

      return (data as Competition[]) ?? []
    },
    enabled: !!userId,
  })

  // 未登录引导
  if (userId === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">收藏你感兴趣的比赛</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            登录后即可收藏比赛、设置提醒、发表评论。免费注册，无需手机验证。
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/auth/login?redirect=/saved')}>登录 / 注册</Button>
            <Button variant="outline" onClick={() => router.push('/')}>先看看比赛</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold">已收藏的比赛</h1>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !competitions?.length ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Heart className="mb-4 h-12 w-12" />
          <p className="text-lg">还没有收藏任何比赛</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
            去发现比赛
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {competitions.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      )}
    </div>
  )
}

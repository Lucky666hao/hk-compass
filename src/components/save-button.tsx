'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SaveButtonProps {
  postId: string
  userId?: string | null
  className?: string
}

export function SaveButton({ postId, userId, className }: SaveButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [postId, userId])

  const toggle = async () => {
    if (!userId) { toast.error('请先登录'); return }
    if (loading) return
    setLoading(true)
    if (saved) {
      await supabase.from('saved_posts').delete().match({ user_id: userId, post_id: postId })
      setSaved(false)
    } else {
      await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={loading}
      className={saved ? 'text-yellow-500' : 'text-muted-foreground'}
      title={saved ? '已收藏' : '收藏'}
    >
      <svg className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </Button>
  )
}

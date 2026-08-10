'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      // Initial count
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0))
    })
  }, [])

  if (unread === 0) return null

  return (
    <Link
      href="/account/notifications"
      className="relative inline-flex items-center justify-center"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      <span className={cn(
        'absolute -top-1 -right-1 flex items-center justify-center',
        'min-w-[18px] h-[18px] px-1 rounded-full',
        'bg-red-500 text-white text-[10px] font-bold'
      )}>
        {unread > 99 ? '99+' : unread}
      </span>
    </Link>
  )
}

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import type { AnonymousPost } from '@/lib/types'
import { ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { VoteButtons } from '@/components/vote-buttons'

interface AnonymousPostCardProps {
  post: AnonymousPost
  userId?: string | null
}

export function AnonymousPostCard({ post, userId }: AnonymousPostCardProps) {
  const { locale } = useLocale()
  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d' : 'M月d日'

  const catLabel = ANONYMOUS_CATEGORY_LABELS[post.category] || post.category
  const timeAgo = format(new Date(post.created_at), dateFormat, { locale: dateLocale })

  return (
    <div className="group relative rounded-xl border border-purple-500/10 bg-[#1a1a2e] shadow-[0_0_15px_rgba(124,58,237,0.03)] transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(124,58,237,0.08)]">
      <Link href={`/posts/anonymous/${post.id}`} className="block py-3 px-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs text-purple-400 font-medium">{post.display_name}</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-500/10 text-purple-400/70 border border-purple-500/20">
            {catLabel}
          </span>
          <span className="text-[10px] text-gray-600 ml-auto">{timeAgo}</span>
        </div>
        <h3 className="font-medium line-clamp-1 text-gray-200 group-hover:text-purple-300 transition-colors">
          {post.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
          {post.content}
        </p>

        {/* 赞/踩 */}
        <div className="mt-2.5 pt-2 border-t border-purple-500/10 flex items-center justify-between">
          <VoteButtons postId={post.id} table="anonymous_posts" userId={userId} size="sm" />
        </div>
      </Link>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Post } from '@/lib/types'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { MessageSquare } from 'lucide-react'

export function PostCard({ post }: { post: Post }) {
  const { locale } = useLocale()

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy' : 'M月d日'

  const catLabel = t(locale, `posts.cat.${post.category}`) as string
  const timeAgo = format(new Date(post.created_at), dateFormat, { locale: dateLocale })

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className="hover:border-primary/40 transition-colors cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs shrink-0">
                  {catLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
              <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {post.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

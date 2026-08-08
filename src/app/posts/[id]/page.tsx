'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy HH:mm' : 'M月d日 HH:mm'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()
      return data as Post | null
    },
  })

  const handleDelete = async () => {
    if (!post) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      toast.error(locale === 'en' ? 'Delete failed' : '删除失败')
    } else {
      toast.success(t(locale, 'posts.delete_success'))
      router.push('/posts')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-muted-foreground py-20">
        <p className="text-lg">{locale === 'en' ? 'Post not found' : locale === 'zh-HK' ? '找不到帖子' : '找不到帖子'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/posts')}>
          {t(locale, 'posts.back_to_list')}
        </Button>
      </div>
    )
  }

  const isAuthor = userId && userId === post.user_id
  const catLabel = t(locale, `posts.cat.${post.category}`) as string

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'posts.back_to_list')}
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <Badge variant="secondary">{catLabel}</Badge>
            {isAuthor && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-muted-foreground hover:text-destructive"
                title={t(locale, 'posts.delete_confirm') as string}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          <div className="text-sm text-muted-foreground mb-6">
            {post.author_email && (
              <span className="mr-3">{post.author_email.split('@')[0]}</span>
            )}
            <span>
              {format(new Date(post.created_at), dateFormat, {
                locale: dateLocale,
              })}
            </span>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
            {post.content}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

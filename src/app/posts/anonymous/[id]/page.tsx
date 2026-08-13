'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AnonymousPost } from '@/lib/types'
import { ANONYMOUS_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { ArrowLeft, Trash2, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { toast } from 'sonner'
import { VoteButtons } from '@/components/vote-buttons'
import { ForceDark } from '@/components/force-dark'
import { CommentSection } from '@/components/comment-section'

export default function AnonymousPostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locale } = useLocale()
  const [userId, setUserId] = useState<string | null>(null)

  const dateLocale = locale === 'en' ? undefined : zhHK
  const dateFormat = locale === 'en' ? 'MMM d, yyyy HH:mm' : 'M月d日 HH:mm'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  const { data: post, isLoading } = useQuery({
    queryKey: ['anonymous_post', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('anonymous_posts')
        .select('*')
        .eq('id', id)
        .single()
      return data as AnonymousPost | null
    },
  })

  const handleDelete = async () => {
    if (!post) return
    const { error } = await supabase.from('anonymous_posts').delete().eq('id', post.id)
    if (error) {
      toast.error(locale === 'en' ? 'Delete failed' : '刪除失敗')
    } else {
      toast.success(locale === 'en' ? 'Deleted.' : '已刪除。')
      router.push('/posts/anonymous')
    }
  }

  if (isLoading) {
    return (
      <ForceDark>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6 bg-[#1a1a2e]" />
          <Skeleton className="h-48 rounded-xl bg-[#1a1a2e]" />
        </div>
      </div>
      </ForceDark>
    )
  }

  if (!post) {
    return (
      <ForceDark>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center py-20">
          <EyeOff className="h-12 w-12 mx-auto mb-3 text-gray-700" />
          <p className="text-lg text-gray-600">{locale === 'en' ? 'Post not found' : '找不到帖子'}</p>
          <Button
            className="mt-4 bg-[#1a1a2e] text-gray-400 border-purple-500/10"
            onClick={() => router.push('/posts/anonymous')}
          >
            {locale === 'en' ? 'Back' : '返回'}
          </Button>
        </div>
      </div>
      </ForceDark>
    )
  }

  const isAuthor = userId && userId === post.user_id
  const catLabel = ANONYMOUS_CATEGORY_LABELS[post.category] || post.category

  return (
    <ForceDark>
    <div className="min-h-screen bg-background text-gray-200">
      {/* 微妙发光背景 */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.05),transparent_50%)]" />

      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => router.push('/posts/anonymous')}
          className="mb-6 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Back to Underground' : '返回地下頻道'}
        </button>

        <div className="rounded-xl border border-purple-500/10 bg-[#1a1a2e] p-6 shadow-[0_0_15px_rgba(124,58,237,0.04)]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-purple-400 font-bold">{post.display_name}</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-500/10 text-purple-400/70 border border-purple-500/20">
                {catLabel}
              </span>
            </div>
            {isAuthor && (
              <button
                onClick={handleDelete}
                className="text-gray-700 hover:text-rose-500 transition-colors p-1"
                title={locale === 'en' ? 'Delete' : '刪除'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4 text-gray-100">{post.title}</h1>

          <div className="text-xs text-gray-600 mb-6">
            {format(new Date(post.created_at), dateFormat, { locale: dateLocale })}
          </div>

          <div className="whitespace-pre-wrap text-gray-400 leading-relaxed">
            {post.content}
          </div>

          {/* 赞/踩 */}
          <div className="mt-6 pt-4 border-t border-purple-500/10">
            <VoteButtons postId={post.id} table="anonymous_posts" userId={userId} size="lg" />
          </div>
        </div>
      </div>

      {/* 匿名评论区 */}
      <div className="mt-6">
        <CommentSection targetType="anonymous_post" targetId={id} />
      </div>
    </div>
    </ForceDark>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeaturedSlide {
  id: string
  competition_id: string | null
  title: string | null
  subtitle: string | null
  image_url: string | null
  link_url: string | null
  competition_title?: string | null
  poster_url?: string | null
}

export function FeaturedCarousel() {
  const { locale } = useLocale()
  const { data: slides } = useQuery({
    queryKey: ['featured-carousel'],
    queryFn: async () => {
      const { data } = await supabase
        .from('featured_items')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      const list = (data as FeaturedSlide[]) ?? []
      const ids = list.filter((i) => i.competition_id).map((i) => i.competition_id as string)
      const compMap: Record<string, { title: string; poster_url: string | null }> = {}
      if (ids.length) {
        const { data: comps } = await supabase
          .from('competitions')
          .select('id, title, poster_url')
          .in('id', ids)
        ;(comps ?? []).forEach((c: any) => { compMap[c.id] = { title: c.title, poster_url: c.poster_url } })
      }
      return list.map((i) => ({
        ...i,
        competition_title: compMap[i.competition_id as string]?.title ?? null,
        poster_url: compMap[i.competition_id as string]?.poster_url ?? null,
      }))
    },
  })

  const list = slides ?? []
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, list.length - 1)))
    if (list.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 5000)
    return () => clearInterval(t)
  }, [list.length])

  if (list.length === 0) return null

  const item = list[index]
  const image = item.image_url || item.poster_url || null
  const title = item.title || item.competition_title || ''
  const href = item.link_url || (item.competition_id ? `/competition/${item.competition_id}` : null)
  const isExternal = !!href && /^https?:\/\//.test(href)
  const badgeLabel = locale === 'en' ? 'Featured' : locale === 'zh-HK' ? '推薦' : '推荐'

  const bannerInner = (
    <div
      key={index}
      className={cn(
        'relative h-44 sm:h-56 w-full overflow-hidden rounded-2xl border animate-in fade-in duration-500',
        !image && 'bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500'
      )}
    >
      {image && (
        <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950 mb-2">
          <Sparkles className="h-3 w-3" />
          {badgeLabel}
        </span>
        <h2 className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm">{title}</h2>
        {item.subtitle && <p className="text-xs sm:text-sm text-white/80 mt-1">{item.subtitle}</p>}
      </div>
    </div>
  )

  const linkContent = !href
    ? bannerInner
    : isExternal
      ? <a href={href} target="_blank" rel="noreferrer" className="block">{bannerInner}</a>
      : <Link href={href} className="block">{bannerInner}</Link>

  return (
    <div className="relative mb-6 group">
      {linkContent}
      {list.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % list.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

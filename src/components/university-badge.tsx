'use client'

import { HK_UNIVERSITIES, getUniBySlug } from '@/lib/university-data'
import { cn } from '@/lib/utils'

interface UniversityBadgeProps {
  slug: string | null | undefined
  size?: 'sm' | 'md'
}

export function UniversityBadge({ slug, size = 'sm' }: UniversityBadgeProps) {
  if (!slug) return null

  const uni = getUniBySlug(slug)
  if (!uni) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        uni.bgClass,
      )}
      title={uni.fullName}
    >
      <span>{uni.logo}</span>
      <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', uni.color)}>
        {uni.shortName}
      </span>
    </span>
  )
}

/** Get university slug from a profile's university field */
export function getUniSlug(profile: { university?: string | null } | null): string | null {
  return profile?.university || null
}

/** Get display name for anonymous user */
export function generateAnonymousName(): string {
  const adjectives = ['匿名', '地下', '隐藏', '神秘', '无声', '暗影', '夜行', '流浪', '孤独', '沉默', '深潜', '隐世']
  const nouns = ['犀牛', '猫', '狐狸', '乌鸦', '蝙蝠', '章鱼', '狼', '鲨鱼', '鹰', '蛇', '兔子', '熊猫', '企鹅', '龙', '凤凰', '独角兽']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}#${num}`
}

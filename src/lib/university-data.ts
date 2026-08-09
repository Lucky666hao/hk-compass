/**
 * 香港大学数据 — 中英文名、缩写、颜色标识、匹配关键词
 * 用于大学板块的分类和展示
 */

export interface UniversityInfo {
  slug: string        // e.g. "hku"
  shortName: string   // e.g. "香港大学"
  fullName: string    // e.g. "香港大學 (The University of Hong Kong)"
  enName: string      // e.g. "University of Hong Kong"
  color: string       // Tailwind gradient classes e.g. "from-emerald-500 to-teal-600"
  bgClass: string     // 卡片背景
  keywords: string[]  // 用于匹配 title/organizer
  logo?: string       // emoji/图标
}

export const HK_UNIVERSITIES: UniversityInfo[] = [
  {
    slug: 'hku',
    shortName: '香港大学',
    fullName: '香港大學 (The University of Hong Kong)',
    enName: 'University of Hong Kong',
    color: 'from-emerald-600 to-teal-700',
    bgClass: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    keywords: ['HKU', '港大', '香港大學', '香港大学', 'University of Hong Kong'],
    logo: '🏛️',
  },
  {
    slug: 'cuhk',
    shortName: '香港中文大学',
    fullName: '香港中文大學 (The Chinese University of Hong Kong)',
    enName: 'Chinese University of Hong Kong',
    color: 'from-violet-600 to-purple-700',
    bgClass: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800',
    keywords: ['CUHK', '港中大', '香港中文大學', '香港中文大学', 'Chinese University'],
    logo: '🏯',
  },
  {
    slug: 'hkust',
    shortName: '香港科技大学',
    fullName: '香港科技大學 (The Hong Kong University of Science and Technology)',
    enName: 'HKUST',
    color: 'from-blue-600 to-cyan-700',
    bgClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    keywords: ['HKUST', '港科大', '香港科技大學', '香港科技大学'],
    logo: '🚀',
  },
  {
    slug: 'cityu',
    shortName: '香港城市大学',
    fullName: '香港城市大學 (City University of Hong Kong)',
    enName: 'City University of Hong Kong',
    color: 'from-red-600 to-rose-700',
    bgClass: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    keywords: ['CityU', '城大', '香港城市大學', '香港城市大学', 'City University of Hong Kong'],
    logo: '🏙️',
  },
  {
    slug: 'polyu',
    shortName: '香港理工大学',
    fullName: '香港理工大學 (The Hong Kong Polytechnic University)',
    enName: 'PolyU',
    color: 'from-amber-600 to-orange-700',
    bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    keywords: ['PolyU', '理大', '香港理工大學', '香港理工大学', 'Polytechnic'],
    logo: '⚙️',
  },
  {
    slug: 'hkbu',
    shortName: '香港浸会大学',
    fullName: '香港浸會大學 (Hong Kong Baptist University)',
    enName: 'HKBU',
    color: 'from-green-600 to-lime-700',
    bgClass: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    keywords: ['HKBU', '浸大', '香港浸會大學', '香港浸会大学', 'Baptist'],
    logo: '📖',
  },
  {
    slug: 'lingnan',
    shortName: '岭南大学',
    fullName: '嶺南大學 (Lingnan University)',
    enName: 'Lingnan University',
    color: 'from-pink-600 to-fuchsia-700',
    bgClass: 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800',
    keywords: ['Lingnan', '嶺南', '岭南大学', '嶺南大學'],
    logo: '🌸',
  },
  {
    slug: 'eduhk',
    shortName: '香港教育大学',
    fullName: '香港教育大學 (The Education University of Hong Kong)',
    enName: 'EdUHK',
    color: 'from-indigo-600 to-blue-700',
    bgClass: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800',
    keywords: ['EdUHK', '教大', '香港教育大學', '香港教育大学', 'Education University'],
    logo: '🎓',
  },
]

/** 根据 slug 查找大学 */
export function getUniBySlug(slug: string): UniversityInfo | undefined {
  return HK_UNIVERSITIES.find((u) => u.slug === slug)
}

/** 判断一条比赛是否属于某大学 */
export function matchUniversity(
  title: string,
  organizer: string | null,
  uni: UniversityInfo
): boolean {
  const text = (title + ' ' + (organizer || '')).toLowerCase()
  return uni.keywords.some((kw) => text.includes(kw.toLowerCase()))
}

/** 获取比赛所属的所有大学列表 */
export function getMatchedUniversities(
  title: string,
  organizer: string | null
): string[] {
  return HK_UNIVERSITIES
    .filter((uni) => matchUniversity(title, organizer, uni))
    .map((uni) => uni.slug)
}

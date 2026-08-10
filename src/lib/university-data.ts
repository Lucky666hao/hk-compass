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

  // === 其他香港高等院校 ===
  {
    slug: 'hsuhk',
    shortName: '香港恒生大学',
    fullName: '香港恒生大學 (The Hang Seng University of Hong Kong)',
    enName: 'HSUHK',
    color: 'from-slate-600 to-gray-700',
    bgClass: 'bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800',
    keywords: ['HSUHK', '恒生', '香港恒生大學', '香港恒生大学', 'Hang Seng University'],
    logo: '🏦',
  },
  {
    slug: 'hkmu',
    shortName: '香港都会大学',
    fullName: '香港都會大學 (Hong Kong Metropolitan University)',
    enName: 'HKMU',
    color: 'from-cyan-600 to-teal-700',
    bgClass: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800',
    keywords: ['HKMU', '都大', '香港都會大學', '香港都会大学', 'Metropolitan University', 'OUHK', '公開大學'],
    logo: '🏫',
  },
  {
    slug: 'hkapa',
    shortName: '香港演艺学院',
    fullName: '香港演藝學院 (The Hong Kong Academy for Performing Arts)',
    enName: 'HKAPA',
    color: 'from-purple-600 to-violet-700',
    bgClass: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    keywords: ['HKAPA', '演藝學院', '演艺学院', 'Academy for Performing Arts'],
    logo: '🎭',
  },
  {
    slug: 'hksyu',
    shortName: '香港树仁大学',
    fullName: '香港樹仁大學 (Hong Kong Shue Yan University)',
    enName: 'HKSYU',
    color: 'from-orange-600 to-amber-700',
    bgClass: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    keywords: ['HKSYU', '樹仁', '树仁', 'Shue Yan'],
    logo: '🌳',
  },
  {
    slug: 'chuhai',
    shortName: '香港珠海学院',
    fullName: '香港珠海學院 (Hong Kong Chu Hai College)',
    enName: 'Chu Hai',
    color: 'from-teal-600 to-emerald-700',
    bgClass: 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800',
    keywords: ['ChuHai', '珠海學院', '珠海学院', 'Chu Hai College'],
    logo: '🔱',
  },
  {
    slug: 'thei',
    shortName: '高科院 (THEi)',
    fullName: '香港高等教育科技學院 (Technological and Higher Education Institute of Hong Kong)',
    enName: 'THEi',
    color: 'from-lime-600 to-green-700',
    bgClass: 'bg-lime-50 border-lime-200 dark:bg-lime-950/30 dark:border-lime-800',
    keywords: ['THEi', '高科院', '高等教育科技學院', '高等教育科技学院'],
    logo: '🔧',
  },
  {
    slug: 'cihe',
    shortName: '圣方济各大学',
    fullName: '聖方濟各大學 (Saint Francis University)',
    enName: 'SFU',
    color: 'from-yellow-600 to-amber-700',
    bgClass: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
    keywords: ['CIHE', '明愛', '明爱', '聖方濟各', '圣方济各', 'Caritas', 'Saint Francis'],
    logo: '✝️',
  },
  {
    slug: 'twc',
    shortName: '东华学院',
    fullName: '東華學院 (Tung Wah College)',
    enName: 'TWC',
    color: 'from-rose-600 to-pink-700',
    bgClass: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
    keywords: ['Tung Wah', '東華學院', '东华学院'],
    logo: '🏥',
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

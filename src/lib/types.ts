// ============================================
// HK Compass — 数据库类型定义
// ============================================

export type CompetitionType =
  | '运动'
  | '电竞'
  | '创意摄影设计'
  | 'AI创作'
  | '创业路演'
  | '音乐表演'
  | '其他'

export type CompetitionLocation = '港岛' | '九龙' | '新界' | '线上'

export type FeeType = '免费' | '付费' | '有奖金'

export type CompetitionStatus = '报名中' | '即将开始' | '进行中' | '已结束'

export type RemindBefore = '1小时前' | '1天前' | '3天前' | '1周前'

export type AgeGroup = '儿童' | '青少年' | '成人/公开' | '不限'

export interface Competition {
  id: string
  title: string
  title_en: string | null
  type: CompetitionType
  description: string | null
  date_start: string
  date_end: string | null
  registration_deadline: string | null
  location: CompetitionLocation
  venue: string | null
  fee_type: FeeType
  fee_amount: string | null
  prize: string | null
  organizer: string | null
  registration_link: string | null
  age_group: AgeGroup | null
  source_url: string | null
  poster_url: string | null
  source: string | null
  status: CompetitionStatus
  view_count: number
  created_at: string
  updated_at: string
  // 虚拟字段（JOIN）
  is_saved?: boolean
  is_reminded?: boolean
}

export interface SavedCompetition {
  id: string
  user_id: string
  competition_id: string
  created_at: string
}

export interface Reminder {
  id: string
  user_id: string
  competition_id: string
  remind_before: RemindBefore
  notified: boolean
  created_at: string
}

// 搜索筛选参数
export interface CompetitionFilters {
  keyword?: string
  type?: CompetitionType | '全部'
  location?: CompetitionLocation | '全部'
  age_group?: AgeGroup | '全部'
  fee_type?: FeeType | '全部'
  date_range?: '本周' | '本月' | '下月' | '全部'
  status?: CompetitionStatus | '全部'
}

// 类型/地点/费用的中文标签映射
export const TYPE_LABELS: Record<CompetitionType, string> = {
  '运动': '🏃 运动',
  '电竞': '🎮 电竞',
  '创意摄影设计': '🎨 创意·摄影·设计',
  'AI创作': '🤖 AI创作',
  '创业路演': '💼 创业·路演',
  '音乐表演': '🎵 音乐·表演',
  '其他': '📌 其他',
}

export const LOCATION_LABELS: Record<CompetitionLocation, string> = {
  '港岛': '🏝️ 港岛',
  '九龙': '🏙️ 九龙',
  '新界': '🏔️ 新界',
  '线上': '💻 线上',
}

export const FEE_LABELS: Record<FeeType, string> = {
  '免费': '🆓 免费',
  '付费': '💰 付费',
  '有奖金': '🏆 有奖金',
}

export const STATUS_LABELS: Record<CompetitionStatus, string> = {
  '报名中': '报名中',
  '即将开始': '即将开始',
  '进行中': '进行中',
  '已结束': '已结束',
}

export const AGE_LABELS: Record<AgeGroup, string> = {
  '儿童': '👶 儿童',
  '青少年': '🧑 青少年',
  '成人/公开': '👤 成人/公开',
  '不限': '🌐 不限年龄',
}

export const REMIND_LABELS: Record<RemindBefore, string> = {
  '1小时前': '1小时前提醒',
  '1天前': '1天前提醒',
  '3天前': '3天前提醒',
  '1周前': '1周前提醒',
}

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

export type TeamSize = '个人赛' | '2-3人' | '4-6人' | '7人以上' | '不限'

export type EligibilityType = '个人报名' | '学校提名' | '两者皆可' | '不限'

export const ELIGIBILITY_OPTIONS: EligibilityType[] = ['个人报名', '学校提名', '两者皆可', '不限']

export const ELIGIBILITY_LABELS: Record<EligibilityType, string> = {
  '个人报名': '🧑 个人报名',
  '学校提名': '🏫 学校提名',
  '两者皆可': '🔄 两者皆可',
  '不限': '🌐 不限',
}

export const TEAM_SIZE_OPTIONS: TeamSize[] = ['个人赛', '2-3人', '4-6人', '7人以上', '不限']

export const TEAM_SIZE_LABELS: Record<TeamSize, string> = {
  '个人赛': '🧑 个人赛',
  '2-3人': '👥 2-3人',
  '4-6人': '👥 4-6人',
  '7人以上': '👥 7人以上',
  '不限': '🌐 不限人数',
}

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
  venue_en: string | null
  fee_type: FeeType
  fee_amount: string | null
  prize: string | null
  prize_en: string | null
  description_en: string | null
  organizer: string | null
  registration_link: string | null
  age_group: AgeGroup | null
  team_size: TeamSize | null
  eligibility: EligibilityType | null
  source_url: string | null
  poster_url: string | null
  source: string | null
  status: CompetitionStatus
  view_count: number
  created_at: string
  updated_at: string
  // 审核状态（community 提交）
  review_status?: ReviewStatus
  review_note?: string | null
  submitted_at?: string | null
  submitted_by?: string | null
  // 虚拟字段（JOIN）
  is_saved?: boolean
  is_reminded?: boolean
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes'

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  needs_changes: '需补充材料',
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
  team_size?: TeamSize | '全部'
  status?: CompetitionStatus | '全部'
  student_only?: boolean
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

// ============================================
// 社区帖子
// ============================================

export type PostCategory = '赛事讨论' | '赛后复盘' | '赛前热身' | '经验分享' | '备赛攻略' | '求组队' | '闲聊' | '求助' | '大学专区'

export const POST_CATEGORIES: PostCategory[] = [
  '赛事讨论', '赛后复盘', '赛前热身',
  '经验分享', '备赛攻略',
  '求组队',
  '闲聊', '求助',
  '大学专区',
]

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  '赛事讨论': '🏆 赛事讨论',
  '赛后复盘': '📊 赛后复盘',
  '赛前热身': '🎯 赛前热身',
  '经验分享': '💡 经验分享',
  '备赛攻略': '📚 备赛攻略',
  '求组队': '🤝 求组队',
  '闲聊': '💬 闲聊',
  '求助': '❓ 求助',
  '大学专区': '🎓 大学专区',
}

export interface Post {
  id: string
  user_id: string
  title: string
  content: string
  category: PostCategory
  vote_score: number
  created_at: string
  updated_at: string
  // 虚拟字段（JOIN）
  author_email?: string
  author_university?: string | null
  user_vote?: number | null  // 当前用户的投票: 1 | -1 | null
  image_urls?: string[]       // 帖子配图URL列表
}

// ============================================
// 投票 / 表情 / 收藏 / 评论（社区帖子升级）
// ============================================

export interface PostVote {
  id: string
  post_id: string
  user_id: string
  vote: number  // 1 or -1
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  /** 评论者显示名（enriched from profiles） */
  author_name?: string
  /** 评论者是否会员（enriched from profiles） */
  is_member?: boolean
  /** 当前用户是否为该评论作者 */
  is_author?: boolean
}

export interface SavedPost {
  user_id: string
  post_id: string
  created_at: string
}

// ============================================
// 匿名地下板块
// ============================================

export type AnonymousCategory = '吐槽' | '八卦' | '争议' | '深夜'

export const ANONYMOUS_CATEGORIES: AnonymousCategory[] = ['吐槽', '八卦', '争议', '深夜']

export const ANONYMOUS_CATEGORY_LABELS: Record<AnonymousCategory, string> = {
  '吐槽': '🤫 吐槽',
  '八卦': '🍵 八卦',
  '争议': '💣 争议',
  '深夜': '🌙 深夜',
}

export interface AnonymousPost {
  id: string
  user_id: string  // 后台存储，前端不展示
  display_name: string
  title: string
  content: string
  category: AnonymousCategory
  vote_score: number
  created_at: string
  updated_at: string
  // 虚拟字段
  user_vote?: number | null
}

export const ANONYMOUS_DISPLAY_NAMES = {
  adjectives: ['匿名', '地下', '隐藏', '神秘', '无声', '暗影', '夜行', '流浪', '孤独', '沉默', '深潜', '隐世'],
  nouns: ['犀牛', '猫', '狐狸', '乌鸦', '蝙蝠', '章鱼', '狼', '鲨鱼', '鹰', '蛇', '兔子', '熊猫', '企鹅', '龙', '凤凰', '独角兽'],
}

// ============================================
// 组队招募
// ============================================

export type RecruitmentStatus = 'open' | 'closed'

export interface Recruitment {
  id: string
  user_id: string
  competition_id: string | null
  title: string
  description: string
  team_size: string | null
  current_count: number
  requirements: string | null
  contact: string | null
  status: RecruitmentStatus
  created_at: string
  updated_at: string
  /** joined field from recruitments+competitions join */
  competition_title?: string | null
  /** joined field */
  author_email?: string | null
}

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  open: '招募中',
  closed: '已截止',
}

// ============================================
// 用户资料
// ============================================

export interface Profile {
  id: string
  user_id: string
  display_name: string
  bio: string
  avatar_url: string | null
  university?: string | null
  show_university?: boolean
  skills?: string[]
  github?: string | null
  website?: string | null
  instagram?: string | null
  created_at: string
  updated_at: string
}

// ============================================
// 聊天系统
// ============================================

export type ConversationType = 'direct' | 'group'

export interface Conversation {
  id: string
  type: ConversationType
  name: string | null
  created_at: string
  owner_id?: string | null
  avatar_url?: string | null
  // 虚拟字段（前端 JOIN 填充）
  last_message?: string | null
  last_message_at?: string | null
  other_user_id?: string | null
  other_user_name?: string | null
  other_user_avatar?: string | null
  member_count?: number
  member_avatars?: string[]
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string
  created_at: string
  image_url?: string | null
  // 虚拟字段
  user_email?: string
}

/** 表情回应（按 message_id 聚合） */
export interface MessageReaction {
  message_id: string
  emoji: string
  user_ids: string[]
}

export const REMIND_LABELS: Record<RemindBefore, string> = {
  '1小时前': '1小时前提醒',
  '1天前': '1天前提醒',
  '3天前': '3天前提醒',
  '1周前': '1周前提醒',
}

// ============================================
// 管理员后台
// ============================================

export type AnnouncementType = 'info' | 'warning' | 'success'

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PageView {
  id: string
  path: string
  timestamp: string
  user_agent: string | null
  session_id: string | null
}

export interface AnalyticsSummary {
  totalViews: number
  todayViews: number
  totalUsers: number
  totalCompetitions: number
  totalPosts: number
  totalReminders: number
  dailyViews: { date: string; count: number }[]
  hourlyHeatmap: { hour: number; count: number }[]
  topPaths: { path: string; count: number }[]
}

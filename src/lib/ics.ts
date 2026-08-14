// ============================================
// ICS 日历文件生成（添加到日历 / Google Calendar / Apple Calendar）
// ============================================

import type { Competition } from '@/lib/types'

// 转义 ICS 文本字段中的特殊字符
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// ISO 时间 → ICS UTC 格式：20260901T090000Z
function toICSDT(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildCompetitionICS(c: Competition): string {
  const start = new Date(c.date_start)
  // 无结束日期时，默认持续 2 小时
  const end = c.date_end
    ? new Date(c.date_end)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const title = c.title_en ? `${c.title} (${c.title_en})` : c.title

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HK Compass//Competition//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${c.id}@hk-compass`,
    `DTSTAMP:${toICSDT(new Date())}`,
    `DTSTART:${toICSDT(start)}`,
    `DTEND:${toICSDT(end)}`,
    `SUMMARY:${escapeICS(title)}`,
  ]

  if (c.venue) lines.push(`LOCATION:${escapeICS(c.venue)}`)
  if (c.description) lines.push(`DESCRIPTION:${escapeICS(c.description.slice(0, 500))}`)
  if (c.source_url) lines.push(`URL:${c.source_url}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadCompetitionICS(c: Competition): void {
  const ics = buildCompetitionICS(c)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${c.title || 'competition'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

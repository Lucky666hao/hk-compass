/**
 * Vercel Cron 端点 — 每日自动发现新比赛
 *
 * Vercel Dashboard → Settings → Cron Jobs:
 *   路径: /api/cron/discover
 *   调度: 0 8 * * * (每天早上8点 HKT)
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 动态导入 pipeline (相对路径，避免打包进每个路由)
    const { discover } = await import('../../../../../scripts/pipeline')

    const result = await discover(false) // 静默模式

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Cron discover error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

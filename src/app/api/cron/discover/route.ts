/**
 * Vercel Cron 端点 — 每日自动发现新比赛
 *
 * Vercel Dashboard → Settings → Cron Jobs:
 *   路径: /api/cron/discover
 *   调度: 0 8 * * * (每天早上8点 HKT)
 *
 * TODO: 重建 pipeline — 当前 4 个爬虫 (scrape-fitz/arts/real/saikr)
 * 需要重构为可导入模块，然后在此路由中调用
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Cron discover paused — pipeline needs refactoring after cleanup',
    scrapers_available: ['scrape-fitz', 'scrape-arts', 'scrape-real', 'scrape-saikr'],
    plan: 'Refactor scrapers to export discover(), then re-enable cron',
    timestamp: new Date().toISOString(),
  })
}

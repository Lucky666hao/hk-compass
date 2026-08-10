import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Result {
  id: string
  title: string
  source: string
  source_url: string
  registration_link: string | null
  status_code: number | null
  error: string | null
  final_url: string | null        // after redirects
  content_type: string | null
  verdict: 'OK' | 'REDIRECT' | 'BROKEN' | 'TIMEOUT' | 'ERROR' | 'SUSPICIOUS'
  suspicion_reason?: string
}

async function checkUrl(url: string): Promise<{ status: number | null; error: string | null; finalUrl: string | null; contentType: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HK-Compass/1.0; +https://hkcompass.app)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    })
    clearTimeout(timeout)
    return {
      status: resp.status,
      error: null,
      finalUrl: resp.url,
      contentType: resp.headers.get('content-type') || null,
    }
  } catch (e: any) {
    clearTimeout(timeout)
    return {
      status: null,
      error: e.name === 'AbortError' ? 'TIMEOUT' : e.message,
      finalUrl: null,
      contentType: null,
    }
  }
}

// Check if a URL is likely just a generic homepage (not a competition page)
function isSuspiciousHomepage(url: string, sourceUrl: string, finalUrl: string): { suspicious: boolean; reason?: string } {
  const finalClean = finalUrl.replace(/\/$/, '').split('?')[0].split('#')[0]
  const sourceClean = sourceUrl.replace(/\/$/, '').split('?')[0].split('#')[0]

  // If redirected to homepage (only domain, no path)
  try {
    const parsed = new URL(finalClean)
    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    if (pathSegments.length === 0) {
      return { suspicious: true, reason: `重定向到首页: ${finalClean}` }
    }
    if (pathSegments.length === 1 && ['en', 'zh', 'tc', 'sc', 'hk', 'cn', 'tw'].includes(pathSegments[0].toLowerCase())) {
      return { suspicious: true, reason: `重定向到语言选择首页: ${finalClean}` }
    }
  } catch {}

  // Check known non-competition domains
  const homepagesOnly = [
    'midjourney.com', 'openai.com', 'stability.ai', 'runwayml.com',
    'google.com', 'facebook.com', 'instagram.com', 'youtube.com',
    'wikipedia.org', 'baidu.com', 'weixin.qq.com',
    'apple.com', 'microsoft.com', 'amazon.com',
    'adobe.com', 'canva.com', 'figma.com',
  ]
  try {
    const host = new URL(finalClean).hostname.replace('www.', '')
    if (homepagesOnly.some(h => host === h)) {
      return { suspicious: true, reason: `非比赛通用网站首页: ${host}` }
    }
  } catch {}

  return { suspicious: false }
}

async function main() {
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('id, title, source, source_url, registration_link, status, type')
    .order('id', { ascending: true })

  if (error) { console.error(error); return }

  console.log(`Checking ${competitions.length} URLs...\n`)

  const results: Result[] = []
  const BATCH = 10
  const DELAY = 500

  for (let i = 0; i < competitions.length; i += BATCH) {
    const batch = competitions.slice(i, i + BATCH)
    const batchResults = await Promise.all(batch.map(async (c) => {
      const r = await checkUrl(c.source_url)
      let verdict: Result['verdict'] = 'OK'
      let suspicion_reason: string | undefined

      if (r.error) {
        verdict = r.error === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR'
      } else if (r.status && r.status >= 500) {
        verdict = 'ERROR'
      } else if (r.status && r.status >= 400) {
        verdict = 'BROKEN'
      } else if (r.status && r.status >= 300) {
        verdict = 'REDIRECT'
      } else if (r.status === 200) {
        const check = isSuspiciousHomepage(c.source_url, c.source_url, r.finalUrl || c.source_url)
        if (check.suspicious) {
          verdict = 'SUSPICIOUS'
          suspicion_reason = check.reason
        }
      }

      return {
        id: c.id,
        title: c.title,
        source: c.source,
        source_url: c.source_url,
        registration_link: c.registration_link,
        status_code: r.status,
        error: r.error,
        final_url: r.finalUrl,
        content_type: r.contentType,
        verdict,
        suspicion_reason,
      } as Result
    }))

    results.push(...batchResults)

    // Progress
    const done = Math.min(i + BATCH, competitions.length)
    const ok = results.filter(r => r.verdict === 'OK').length
    const broken = results.filter(r => r.verdict === 'BROKEN').length
    const err = results.filter(r => r.verdict === 'ERROR' || r.verdict === 'TIMEOUT').length
    const susp = results.filter(r => r.verdict === 'SUSPICIOUS').length
    console.log(`  ${done}/${competitions.length} | ✅ ${ok} | 🔗 ${susp} suspicious | ❌ ${broken} broken | ⚠️ ${err} error`)

    if (i + BATCH < competitions.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY))
    }
  }

  // Save results
  fs.writeFileSync('scripts/url-check-results.json', JSON.stringify(results, null, 2), 'utf-8')

  console.log(`\n======= SUMMARY =======`)
  console.log(`Total: ${results.length}`)
  console.log(`✅ OK (valid competition pages): ${results.filter(r => r.verdict === 'OK').length}`)
  console.log(`🔗 SUSPICIOUS (homepage/generic): ${results.filter(r => r.verdict === 'SUSPICIOUS').length}`)
  console.log(`❌ BROKEN (404/etc): ${results.filter(r => r.verdict === 'BROKEN').length}`)
  console.log(`⚠️ ERROR/TIMEOUT: ${results.filter(r => r.verdict === 'ERROR' || r.verdict === 'TIMEOUT').length}`)

  console.log(`\n=== SUSPICIOUS (first 30) ===`)
  for (const r of results.filter(r => r.verdict === 'SUSPICIOUS').slice(0, 30)) {
    console.log(`  ${r.title}`)
    console.log(`    source_url: ${r.source_url}`)
    console.log(`    final_url:  ${r.final_url}`)
    console.log(`    reason: ${r.suspicion_reason}`)
  }

  console.log(`\n=== BROKEN ===`)
  for (const r of results.filter(r => r.verdict === 'BROKEN')) {
    console.log(`  [${r.status_code}] ${r.title}`)
    console.log(`    ${r.source_url}`)
  }

  console.log(`\n=== ERROR/TIMEOUT ===`)
  for (const r of results.filter(r => r.verdict === 'ERROR' || r.verdict === 'TIMEOUT')) {
    console.log(`  [${r.error}] ${r.title}`)
    console.log(`    ${r.source_url}`)
  }

  // By source
  console.log(`\n=== By Source ===`)
  const bySource: Record<string, { total: number; ok: number; suspicious: number; broken: number; error: number }> = {}
  for (const r of results) {
    const s = r.source
    if (!bySource[s]) bySource[s] = { total: 0, ok: 0, suspicious: 0, broken: 0, error: 0 }
    bySource[s].total++
    if (r.verdict === 'OK') bySource[s].ok++
    else if (r.verdict === 'SUSPICIOUS') bySource[s].suspicious++
    else if (r.verdict === 'BROKEN') bySource[s].broken++
    else bySource[s].error++
  }
  for (const [s, stats] of Object.entries(bySource).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${s}: ${stats.total} total | ${stats.ok} OK | ${stats.suspicious} SUS | ${stats.broken} BRK | ${stats.error} ERR`)
  }
}

main()

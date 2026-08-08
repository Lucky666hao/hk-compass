/**
 * 来源验证脚本 — 检查 source_url 是否可访问、是否为香港本地网站
 * 用法: node scripts/verify-sources.mjs [--sample N] [--check-links]
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 大陆域名 — 香港用户打不开或访问慢
const CN_DOMAINS = [
  '.cn', 'baidu.com', 'douyin.com', 'zhihu.com', 'weixin.qq.com',
  'xiaohongshu.com', 'bilibili.com', '163.com', 'sina.com',
  'sohu.com', 'qq.com', 'csdn.net', 'jianshu.com', 'ctrip.com',
  'paobaodao.com', 'dotdotnews.com', 'zijing.com.cn',
]

function isCnDomain(url) {
  try {
    const host = new URL(url).hostname
    return CN_DOMAINS.some(d => host.includes(d))
  } catch { return false }
}

function isHkDomain(url) {
  try {
    const host = new URL(url).hostname
    return host.endsWith('.hk') || host.endsWith('.org.hk') || host.endsWith('.edu.hk') || host.endsWith('.gov.hk')
  } catch { return false }
}

async function checkLink(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timeout)
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, error: e.message }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const doSample = args.includes('--sample')
  const doCheckLinks = args.includes('--check-links')
  const sampleSize = doSample ? parseInt(args[args.indexOf('--sample') + 1] || '20') : null

  // 获取所有有 source_url 的记录
  let query = supabase.from('competitions').select('id,title,source_url').not('source_url', 'is', null)
  if (sampleSize) query = query.limit(sampleSize)

  const { data: comps, error } = await query
  if (error) { console.error('Query error:', error); return }

  console.log(`\n📊 共 ${comps.length} 条有待验证\n`)

  const cnUrls = []
  const hkUrls = []
  const otherUrls = []
  const brokenLinks = []

  for (const c of comps) {
    if (isCnDomain(c.source_url)) {
      cnUrls.push(c)
    } else if (isHkDomain(c.source_url)) {
      hkUrls.push(c)
    } else {
      otherUrls.push(c)
    }

    if (doCheckLinks) {
      const result = await checkLink(c.source_url)
      if (!result.ok) {
        brokenLinks.push({ ...c, ...result })
      }
      // 进度显示
      if ((cnUrls.length + hkUrls.length + otherUrls.length) % 10 === 0) {
        process.stdout.write('.')
      }
    }
  }

  console.log(`\n🇭🇰 .hk 域名: ${hkUrls.length} 条 (${((hkUrls.length/comps.length)*100).toFixed(1)}%)`)
  console.log(`🇨🇳 大陆域名: ${cnUrls.length} 条 (${((cnUrls.length/comps.length)*100).toFixed(1)}%)`)
  console.log(`🌐 其他域名: ${otherUrls.length} 条 (${((otherUrls.length/comps.length)*100).toFixed(1)}%)`)

  if (cnUrls.length > 0) {
    console.log(`\n⚠️ 大陆域名列表（香港用户可能打不开）:`)
    cnUrls.slice(0, 30).forEach(c => console.log(`  - ${c.title}`))
    console.log(`  ${c.source_url}`)
    if (cnUrls.length > 30) console.log(`  ...还有 ${cnUrls.length - 30} 条`)
  }

  if (brokenLinks.length > 0) {
    console.log(`\n❌ 无法访问的链接:`)
    brokenLinks.forEach(c => console.log(`  - ${c.title} (${c.status}): ${c.source_url}`))
  }

  // 总结
  console.log(`\n===== 总结 =====`)
  console.log(`总记录: ${comps.length}`)
  console.log(`香港可信域名: ${hkUrls.length} (${((hkUrls.length/comps.length)*100).toFixed(1)}%)`)
  console.log(`大陆域名需替换: ${cnUrls.length} (${((cnUrls.length/comps.length)*100).toFixed(1)}%)`)
  if (doCheckLinks) console.log(`无法访问: ${brokenLinks.length}`)
}

main().catch(console.error)

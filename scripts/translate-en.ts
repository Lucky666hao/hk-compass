// @ts-nocheck
/**
 * 翻译脚本 — 为缺失英文字段的比赛数据补充翻译
 *
 * 用法: npx tsx scripts/translate-en.ts
 *
 * 特性:
 *   - 幂等: 已有英文字段的记录自动跳过
 *   - 可重复使用: 新增比赛后直接再跑一次即可
 *   - 批量: 每次处理 5 条，避免 API 超时
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const BATCH_SIZE = 5 // 每批翻译条数
const DELAY_MS = 2000 // 批次间等待

interface Competition {
  id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  venue: string | null
  venue_en: string | null
  prize: string | null
  prize_en: string | null
  type: string
}

async function translateViaDeepSeek(chineseTexts: Record<string, string>): Promise<Record<string, string>> {
  const entries = Object.entries(chineseTexts).filter(([_, v]) => v && v.trim())

  if (entries.length === 0) return {}

  const fieldsDesc = entries
    .map(([key, val]) => `<field name="${key}">\n${val.substring(0, 2000)}\n</field>`)
    .join('\n\n')

  const prompt = `You are a professional translator. Translate the following Chinese text to natural English.
Context: These are Hong Kong competition/sports event details. Keep proper nouns (names, brands, organizations) as-is or use official English names if known. Keep numbers, currency (HK$), and dates unchanged.

Rules:
- venue: Translate venue/location names naturally (e.g. "香港体育馆" → "Hong Kong Coliseum")
- prize: Translate prize/prize money descriptions naturally (e.g. "总奖金港币50万元" → "Total prize HK$500,000")
- description: Translate full descriptions naturally, keep URLs unchanged

Return ONLY a JSON object with the translated values, no other text:
{
${entries.map(([key]) => `  "${key}": "<English translation>"`).join(',\n')}
}

Fields to translate:
${fieldsDesc}`

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: 'You are a professional translator. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 1,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API error ${response.status}: ${errText.substring(0, 200)}`)
  }

  const data = await response.json() as any
  const content = data.choices?.[0]?.message?.content || ''

  // 尝试从回复中提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('  ⚠️ 无法解析 Kimi 返回:', content.substring(0, 200))
    return {}
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    console.error('  ⚠️ JSON 解析失败:', jsonMatch[0].substring(0, 200))
    return {}
  }
}

async function main() {
  console.log('🔍 查询需要翻译的比赛...\n')

  // 动态导入 supabase 避免编译时依赖问题
  const { createClient } = await import('@supabase/supabase-js')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 查询所有缺失英文字段的记录
  const { data: all, error } = await supabase
    .from('competitions')
    .select('id, title, title_en, description, description_en, venue, venue_en, prize, prize_en, type')

  if (error) {
    console.error('❌ 查询失败:', error.message)
    process.exit(1)
  }

  // 筛选需要翻译的记录
  const needTranslation = (all || []).filter((c: Competition) => {
    const needsVenue = c.venue && !c.venue_en
    const needsPrize = c.prize && !c.prize_en
    const needsDesc = c.description && !c.description_en
    return needsVenue || needsPrize || needsDesc
  })

  console.log(`总记录: ${(all || []).length}`)
  console.log(`需要翻译: ${needTranslation.length}`)
  console.log(`已有完整翻译: ${(all || []).length - needTranslation.length}\n`)

  if (needTranslation.length === 0) {
    console.log('✅ 所有记录已翻译完毕，无需处理。')
    process.exit(0)
  }

  let translated = 0
  let failed = 0

  // 分批处理
  for (let i = 0; i < needTranslation.length; i += BATCH_SIZE) {
    const batch = needTranslation.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(needTranslation.length / BATCH_SIZE)
    console.log(`\n📦 批次 ${batchNum}/${totalBatches} (${batch.length} 条)...`)

    for (const comp of batch) {
      const toTranslate: Record<string, string> = {}

      if (comp.venue && !comp.venue_en) {
        toTranslate['venue_en'] = comp.venue
      }
      if (comp.prize && !comp.prize_en) {
        toTranslate['prize_en'] = comp.prize
      }
      if (comp.description && !comp.description_en) {
        toTranslate['description_en'] = comp.description
      }

      if (Object.keys(toTranslate).length === 0) continue

      const shortTitle = comp.title.substring(0, 40)
      console.log(`  📝 [${comp.id}] ${shortTitle}... (${Object.keys(toTranslate).length} 字段)`)

      try {
        const translations = await translateViaDeepSeek(toTranslate)

        if (Object.keys(translations).length === 0) {
          console.log(`    ⚠️ 翻译返回为空，跳过`)
          failed++
          continue
        }

        // 更新数据库
        const updateData: Record<string, string> = {}
        for (const [key, val] of Object.entries(translations)) {
          if (val && val.trim()) {
            updateData[key] = val.trim()
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateErr } = await supabase
            .from('competitions')
            .update(updateData)
            .eq('id', comp.id)

          if (updateErr) {
            console.log(`    ❌ 更新失败: ${updateErr.message}`)
            failed++
          } else {
            console.log(`    ✅ 已翻译: ${Object.keys(updateData).join(', ')}`)
            translated++
          }
        }
      } catch (err: any) {
        console.log(`    ❌ 错误: ${err.message}`)
        failed++
      }

      // API 频率控制
      await new Promise((r) => setTimeout(r, 500))
    }

    if (i + BATCH_SIZE < needTranslation.length) {
      console.log(`  ⏳ 等待 ${DELAY_MS / 1000}s...`)
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n\n===== 完成 =====`)
  console.log(`✅ 翻译成功: ${translated}`)
  console.log(`❌ 失败: ${failed}`)
  console.log(`📊 剩余待翻译: ${needTranslation.length - translated}`)
  console.log(`\n💡 提示: 以后新增比赛数据后，再运行 npx tsx scripts/translate-en.ts 即可自动补翻译。`)
}

main().catch((err) => {
  console.error('脚本异常:', err)
  process.exit(1)
})

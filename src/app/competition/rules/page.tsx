'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/i18n/LanguageContext'
import type { Locale } from '@/i18n/translations'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShieldCheck, Clock, MapPin, FileCheck, BadgeCheck, Scale } from 'lucide-react'

// 规则内容（按 locale 返回，用户后续可在此直接改文案）
function getRules(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Submission Guidelines',
      subtitle: 'Please read carefully before publishing. Your competition will appear publicly only after approval.',
      items: [
        { icon: Clock, title: 'Manual review', desc: 'Every submission is reviewed by a human. Approval usually takes about 3–5 working days. Please be patient.' },
        { icon: ShieldCheck, title: 'Truthful information', desc: 'All details (title, dates, venue, fees, prizes, organizer) must be accurate and verifiable. False or exaggerated claims will be rejected.' },
        { icon: MapPin, title: 'Venue verification', desc: 'Offline competitions must list a real, confirmed venue. We may verify the venue, so please ensure it is bookable and correct.' },
        { icon: FileCheck, title: 'Verification & check-in', desc: 'Registration links and on-site check-in / redemption processes must be traceable and auditable.' },
        { icon: BadgeCheck, title: 'Legitimate organizer', desc: 'The organizer must hold valid qualifications. No scams, illegal activities, or misleading promotions.' },
        { icon: Scale, title: 'Liability', desc: 'Violations will result in removal from the platform and may be subject to legal liability.' },
      ],
      agree: 'I have read and agree to the above guidelines',
      continue: 'Continue to fill in',
      back: 'Back',
    }
  }
  if (locale === 'zh-HK') {
    return {
      title: '發佈須知',
      subtitle: '請仔細閱讀以下規則，審核通過後你的比賽才會公開展示。',
      items: [
        { icon: Clock, title: '人工審核', desc: '所有提交都會經人工審核，通常約需 3–5 個工作日，請耐心等候。' },
        { icon: ShieldCheck, title: '信息真實', desc: '名稱、日期、場地、費用、獎項、主辦方等資訊必須真實可查，虛假或誇大將被駁回。' },
        { icon: MapPin, title: '場地驗證', desc: '線下比賽須填寫真實已確認場地，平台或會核驗場地，請確保可預訂且準確。' },
        { icon: FileCheck, title: '查驗核銷', desc: '報名連結及現場簽到／核銷流程須可追溯、可核驗。' },
        { icon: BadgeCheck, title: '主辦方資質', desc: '主辦方須具備合法資質，禁止詐騙、違法或誤導性推廣。' },
        { icon: Scale, title: '法律責任', desc: '違規將被下架，並可能承擔相應法律責任。' },
      ],
      agree: '我已閱讀並同意以上規則',
      continue: '繼續填寫',
      back: '返回',
    }
  }
  return {
    title: '发布须知',
    subtitle: '请仔细阅读以下规则，审核通过后你的比赛才会公开展示。',
    items: [
      { icon: Clock, title: '人工审核', desc: '所有提交都会经人工审核，通常约需 3–5 个工作日，请耐心等候。' },
      { icon: ShieldCheck, title: '信息真实', desc: '名称、日期、场地、费用、奖项、主办方等信息必须真实可查，虚假或夸大将被驳回。' },
      { icon: MapPin, title: '场地验证', desc: '线下比赛须填写真实已确认场地，平台可能会核验场地，请确保可预订且准确。' },
      { icon: FileCheck, title: '查验核销', desc: '报名链接及现场签到／核销流程须可追溯、可核验。' },
      { icon: BadgeCheck, title: '主办方资质', desc: '主办方须具备合法资质，禁止诈骗、违法或误导性推广。' },
      { icon: Scale, title: '法律责任', desc: '违规将被下架，并可能承担相应法律责任。' },
    ],
    agree: '我已阅读并同意以上规则',
    continue: '继续填写',
    back: '返回',
  }
}

export default function RulesPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const [agreed, setAgreed] = useState(false)
  const rules = getRules(locale)

  const handleContinue = () => {
    if (!agreed) return
    localStorage.setItem('comp-rules-agreed', '1')
    router.push('/competition/new')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {rules.back}
      </button>

      <h1 className="text-2xl font-bold mb-1">{rules.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{rules.subtitle}</p>

      <div className="space-y-3">
        {rules.items.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="flex gap-3 p-4 rounded-xl border bg-background">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                  <h3 className="font-medium text-sm">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 同意 + 继续 */}
      <div className="mt-6 p-4 rounded-xl border bg-muted/40">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-sm font-medium">{rules.agree}</span>
        </label>
        <Button className="w-full mt-4" disabled={!agreed} onClick={handleContinue}>
          {rules.continue}
        </Button>
      </div>
    </div>
  )
}

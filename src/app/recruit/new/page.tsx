'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Competition, TeamSize } from '@/lib/types'
import { TEAM_SIZE_OPTIONS, TEAM_SIZE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Send, X, Search, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

export default function NewRecruitmentPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamSize, setTeamSize] = useState<string>('')
  const [currentCount, setCurrentCount] = useState(0)
  const [requirements, setRequirements] = useState('')
  const [contact, setContact] = useState('')
  const [competitionId, setCompetitionId] = useState<string | null>(null)
  const [competitionSearchOpen, setCompetitionSearchOpen] = useState(false)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [submitting, setSubmitting] = useState(false)

  // 加载所有比赛（用于搜索选择）
  useEffect(() => {
    supabase
      .from('competitions')
      .select('id, title, title_en')
      .order('title')
      .then(({ data }) => {
        setCompetitions((data as Competition[]) ?? [])
      })
  }, [])

  const selectedComp = competitions.find((c) => c.id === competitionId)

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t(locale, 'recruit.no_title'))
      return
    }
    if (!description.trim()) {
      toast.error(t(locale, 'recruit.no_desc'))
      return
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(t(locale, 'recruit.login_prompt'))
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('recruitments').insert({
      title: title.trim(),
      description: description.trim(),
      team_size: (teamSize && teamSize !== '_any') ? teamSize : null,
      current_count: currentCount,
      requirements: requirements.trim() || null,
      contact: contact.trim() || null,
      competition_id: competitionId,
      user_id: session.user.id,
    })

    setSubmitting(false)

    if (error) {
      toast.error(t(locale, 'recruit.publish_error'))
    } else {
      toast.success(t(locale, 'recruit.publish_success'))
      router.push('/recruit')
    }
  }

  const cancelText = t(locale, 'recruit.cancel') as string

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'recruit.back_to_list')}
      </button>

      <h1 className="text-2xl font-bold mb-6">{t(locale, 'recruit.create')}</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* 关联比赛 — 搜索选择器 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t(locale, 'recruit.link_competition')}</label>
            {competitionId && selectedComp ? (
              /* 已选中 — 显示标签 + 可清除 */
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <span className="text-sm flex-1 truncate">
                  🏆 {locale === 'en' && selectedComp.title_en ? selectedComp.title_en : selectedComp.title}
                </span>
                <button
                  onClick={() => setCompetitionId(null)}
                  className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* 未选中 — 搜索型下拉 */
              <Popover open={competitionSearchOpen} onOpenChange={setCompetitionSearchOpen}>
                <PopoverTrigger>
                  <button
                    role="combobox"
                    className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-muted-foreground">
                      {t(locale, 'recruit.search_placeholder') as string}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t(locale, 'recruit.type_to_search') as string}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {t(locale, 'recruit.no_comp_found') as string}
                      </CommandEmpty>
                      <CommandGroup heading={t(locale, 'recruit.competitions_heading') as string}>
                        {/* 不关联选项 */}
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setCompetitionId(null)
                            setCompetitionSearchOpen(false)
                          }}
                          className="text-muted-foreground"
                        >
                          🚫 {t(locale, 'recruit.no_competition')}
                        </CommandItem>
                        {competitions.map((comp) => (
                          <CommandItem
                            key={comp.id}
                            value={`${comp.title} ${comp.title_en || ''}`}
                            onSelect={() => {
                              setCompetitionId(comp.id)
                              setCompetitionSearchOpen(false)
                            }}
                          >
                            {locale === 'en' && comp.title_en ? comp.title_en : comp.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* 标题 */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(locale, 'recruit.title_placeholder')}
              maxLength={200}
              className="text-lg"
            />
          </div>

          {/* 详情描述 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t(locale, 'recruit.description')}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(locale, 'recruit.desc_placeholder')}
              rows={5}
              className="resize-y min-h-[100px]"
            />
          </div>

          {/* 队伍人数 — 下拉选择 + 当前人数 + 联系方式 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t(locale, 'recruit.team_size')}</label>
              <Select value={teamSize || ''} onValueChange={(v) => setTeamSize(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder={t(locale, 'recruit.team_size_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">
                    {t(locale, 'recruit.any') as string}
                  </SelectItem>
                  {TEAM_SIZE_OPTIONS.map((ts) => (
                    <SelectItem key={ts} value={ts}>
                      {TEAM_SIZE_LABELS[ts]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {locale === 'en' ? 'Current Members' : locale === 'zh-HK' ? '現有人數' : '现有人数'}
              </label>
              <Input
                type="number"
                min={0}
                max={99}
                value={currentCount}
                onChange={(e) => setCurrentCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t(locale, 'recruit.contact')}</label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t(locale, 'recruit.contact_placeholder')}
              />
            </div>
          </div>

          {/* 要求 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t(locale, 'recruit.requirements')}</label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={t(locale, 'recruit.req_placeholder')}
              rows={3}
              className="resize-y min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => router.back()}>{cancelText}</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
              <Send className="h-4 w-4 mr-1.5" />
              {submitting ? t(locale, 'recruit.publishing') as string : t(locale, 'recruit.publish') as string}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

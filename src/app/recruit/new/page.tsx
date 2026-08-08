'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Competition } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Send, Search, X } from 'lucide-react'
import { toast } from 'sonner'

export default function NewRecruitmentPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [requirements, setRequirements] = useState('')
  const [contact, setContact] = useState('')
  const [competitionId, setCompetitionId] = useState<string | null>(null)
  const [competitionTitle, setCompetitionTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Competition[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 搜索比赛
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('competitions')
        .select('id, title, title_en')
        .ilike('title', `%${searchQuery}%`)
        .limit(5)
      setSearchResults((data as Competition[]) ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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
      team_size: teamSize.trim() || null,
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

  const cancelText =
    locale === 'en' ? 'Cancel' : locale === 'zh-HK' ? '取消' : '取消'

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
          {/* 关联比赛 */}
          <div>
            <label className="block text-sm font-medium mb-2">{t(locale, 'recruit.link_competition')}</label>
            {competitionTitle ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border">
                <span className="text-sm flex-1">🏆 {competitionTitle}</span>
                <button
                  onClick={() => { setCompetitionId(null); setCompetitionTitle('') }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(!showSearch)}
                    className="text-xs"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    {locale === 'en' ? 'Search competitions' : locale === 'zh-HK' ? '搜尋比賽' : '搜索比赛'}
                  </Button>
                  <span className="text-xs text-muted-foreground">{t(locale, 'recruit.no_competition')}</span>
                </div>
                {showSearch && (
                  <div className="mt-2 border rounded-md p-2 space-y-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={locale === 'en' ? 'Type to search...' : locale === 'zh-HK' ? '輸入搜尋...' : '输入搜索...'}
                      className="text-sm h-8"
                      autoFocus
                    />
                    {searchResults.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => {
                          setCompetitionId(comp.id)
                          setCompetitionTitle(locale === 'en' && comp.title_en ? comp.title_en : comp.title)
                          setSearchQuery('')
                          setSearchResults([])
                          setShowSearch(false)
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                      >
                        {locale === 'en' && comp.title_en ? comp.title_en : comp.title}
                      </button>
                    ))}
                    {searchQuery && searchResults.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">
                        {locale === 'en' ? 'No results' : locale === 'zh-HK' ? '無結果' : '无结果'}
                      </p>
                    )}
                  </div>
                )}
              </div>
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

          {/* 队伍人数 + 要求 并排 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t(locale, 'recruit.team_size')}</label>
              <Input
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder={t(locale, 'recruit.team_size_placeholder')}
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
              {submitting
                ? locale === 'en' ? 'Publishing...' : locale === 'zh-HK' ? '發布中...' : '发布中...'
                : t(locale, 'recruit.publish')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

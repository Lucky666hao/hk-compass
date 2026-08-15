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
import { ArrowLeft, Send, X, Search, ChevronDown, Image } from 'lucide-react'
import { toast } from 'sonner'
import { HK_UNIVERSITIES, getUniBySlug } from '@/lib/university-data'
import { getFaculties } from '@/lib/faculty-data'

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
  const [universitySlug, setUniversitySlug] = useState<string>('')
  const [faculty, setFaculty] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // 读取 ?uni=slug 预填学校（从学生社区进入）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uniParam = params.get('uni')
    if (uniParam && getUniBySlug(uniParam)) {
      setUniversitySlug(uniParam)
    }
  }, [])

  // 加载所有比赛（用于搜索选择）
  useEffect(() => {
    supabase
      .from('competitions')
      .select('id, title, title_en')
      .eq('review_status', 'approved')
      .order('title')
      .then(({ data }) => {
        setCompetitions((data as Competition[]) ?? [])
      })
  }, [])

  const selectedComp = competitions.find((c) => c.id === competitionId)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + imageFiles.length > 4) {
      toast.error(locale === 'en' ? 'Max 4 images' : locale === 'zh-HK' ? '最多4張圖' : '最多4张图')
      return
    }
    setImageFiles(prev => [...prev, ...files])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = () => setImagePreviews(prev => [...prev, reader.result as string])
      reader.readAsDataURL(f)
    })
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

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

    // 上传图片
    let imageUrls: string[] = []
    if (imageFiles.length > 0) {
      setUploading(true)
      for (const file of imageFiles) {
        const path = `recruit/${session.user.id}/${Date.now()}_${file.name}`
        const { error: uploadErr } = await supabase.storage
          .from('post-images')
          .upload(path, file, { upsert: true })
        if (uploadErr) {
          console.error('Upload error:', uploadErr)
          continue
        }
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
        if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl)
      }
      setUploading(false)
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
      university_slug: universitySlug || null,
      faculty: faculty.trim() || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
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

          {/* 归属学校（可选，不选=比赛组队） */}
          <div>
            <label className="block text-sm font-medium mb-2">{t(locale, 'campus.post_uni')}</label>
            <Select value={universitySlug || '_all'} onValueChange={(v) => setUniversitySlug(v && v !== '_all' ? v : '')}>
              <SelectTrigger>
                <SelectValue placeholder={t(locale, 'campus.post_uni_all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">{t(locale, 'campus.post_uni_all')}</SelectItem>
                {HK_UNIVERSITIES.map((u) => (
                  <SelectItem key={u.slug} value={u.slug}>
                    {u.logo} {locale === 'en' ? u.enName : u.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 学院（选学校后显示） */}
          {universitySlug && (
            <div>
              <label className="block text-sm font-medium mb-2">{t(locale, 'campus.faculty')}</label>
              {getFaculties(universitySlug).length > 0 ? (
                <Select value={faculty || '_any'} onValueChange={(v) => setFaculty(v && v !== '_any' ? v : '')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t(locale, 'campus.faculty_any')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">{t(locale, 'campus.faculty_any')}</SelectItem>
                    {getFaculties(universitySlug).map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder={t(locale, 'campus.faculty_placeholder')}
                />
              )}
            </div>
          )}

          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Image className="h-4 w-4 inline mr-1" />
              {locale === 'en' ? 'Images (optional, max 4)' : locale === 'zh-HK' ? '圖片（可選，最多4張）' : '图片（可选，最多4张）'}
            </label>
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageFiles.length < 4 && (
              <label className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                <Image className="h-4 w-4" />
                {locale === 'en' ? 'Add image' : locale === 'zh-HK' ? '添加圖片' : '添加图片'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              </label>
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
            <Button onClick={handleSubmit} disabled={submitting || uploading} className="bg-amber-500 hover:bg-amber-600">
              <Send className="h-4 w-4 mr-1.5" />
              {uploading ? (locale === 'en' ? 'Uploading...' : '上传中...')
                : submitting ? t(locale, 'recruit.publishing') as string : t(locale, 'recruit.publish') as string}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

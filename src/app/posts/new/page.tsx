'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { PostCategory } from '@/lib/types'
import { POST_CATEGORIES, POST_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, Send, Image, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { HK_UNIVERSITIES, getUniBySlug } from '@/lib/university-data'
import { getFaculties } from '@/lib/faculty-data'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function NewPostPage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<PostCategory>(POST_CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authorUni, setAuthorUni] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [universitySlug, setUniversitySlug] = useState<string>('')
  const [faculty, setFaculty] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      // Load profile for university preview
      if (session?.user) {
        supabase.from('profiles')
          .select('university, show_university')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.show_university && data?.university) {
              setAuthorUni(data.university)
            }
          })
      }
    })
  }, [])

  // 读取 ?uni=slug 预填归属学校（从学生社区进入）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uniParam = params.get('uni')
    if (uniParam && getUniBySlug(uniParam)) {
      setUniversitySlug(uniParam)
    }
  }, [])

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
      toast.error(t(locale, 'posts.no_title'))
      return
    }
    if (!content.trim()) {
      toast.error(t(locale, 'posts.no_content'))
      return
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast.error(t(locale, 'posts.login_prompt'))
      setSubmitting(false)
      return
    }

    // 上传图片
    let imageUrls: string[] = []
    if (imageFiles.length > 0) {
      setUploading(true)
      let failed = 0
      for (const file of imageFiles) {
        const path = `posts/${session.user.id}/${Date.now()}_${file.name}`
        const { error: uploadErr } = await supabase.storage
          .from('post-images')
          .upload(path, file, { upsert: true })
        if (uploadErr) {
          console.error('Upload error:', uploadErr)
          failed++
          continue
        }
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
        if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl)
      }
      setUploading(false)
      if (failed > 0) {
        toast.error(locale === 'en' ? `${failed} image(s) failed to upload` : locale === 'zh-HK' ? `${failed} 張圖片上傳失敗` : `${failed} 张图片上传失败`)
      }
    }

    const { error } = await supabase.from('posts').insert({
      title: title.trim(),
      content: content.trim(),
      category,
      user_id: session.user.id,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      university_slug: universitySlug || null,
      faculty: faculty.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      toast.error(t(locale, 'posts.publish_error'))
    } else {
      toast.success(t(locale, 'posts.publish_success'))
      router.push(universitySlug ? `/campus/${universitySlug}` : '/posts')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'posts.back_to_list')}
      </button>

      <h1 className="text-2xl font-bold mb-6">{t(locale, 'posts.create')}</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* 身份预览 */}
          {authorUni && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span>{locale === 'en' ? 'Posting as' : '发布身份'}:</span>
              <span className="text-foreground font-medium">🎓 {t(locale, 'profile.university')} {locale === 'en' ? 'Student' : '学生'}</span>
            </div>
          )}

          {/* 分类选择 Chip */}
          <div>
            <label className="block text-sm font-medium mb-2">{t(locale, 'posts.category')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {POST_CATEGORIES.map((cat) => {
                const label = POST_CATEGORY_LABELS[cat]
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all',
                      category === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 归属学校（可选，从学生社区进入时自动带） */}
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
            {/* 预览 */}
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
              placeholder={t(locale, 'posts.title_placeholder')}
              maxLength={200}
              className="text-lg"
            />
          </div>

          {/* 内容 */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t(locale, 'posts.content_placeholder')}
              rows={8}
              className="resize-y min-h-[160px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              {t(locale, 'posts.cancel') as string}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || uploading}>
              <Send className="h-4 w-4 mr-1.5" />
              {uploading ? (locale === 'en' ? 'Uploading...' : '上传中...')
                : submitting ? t(locale, 'posts.publishing') as string
                : t(locale, 'posts.publish') as string}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

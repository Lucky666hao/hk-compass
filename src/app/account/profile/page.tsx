'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import {
  ArrowLeft, User, Search, UserPlus, X, Users, GraduationCap, Eye, EyeOff,
  Camera, Code2, Globe, AtSign, FileText, MessageSquare, ThumbsUp, XCircle, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { HK_UNIVERSITIES } from '@/lib/university-data'
import { cn } from '@/lib/utils'

const MAX_AVATAR_SIZE = 200 // px
const AVATAR_QUALITY = 0.7

/** Canvas 压缩图片到指定尺寸 */
function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = MAX_AVATAR_SIZE
      canvas.height = MAX_AVATAR_SIZE
      const ctx = canvas.getContext('2d')!
      // 取最小边做 crop
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_AVATAR_SIZE, MAX_AVATAR_SIZE)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/jpeg', AVATAR_QUALITY)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function ProfilePage() {
  const router = useRouter()
  const { locale } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // 编辑状态
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [university, setUniversity] = useState<string>('')
  const [showUniversity, setShowUniversity] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [github, setGithub] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [saving, setSaving] = useState(false)

  // 头像上传
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // 好友
  const [friends, setFriends] = useState<Profile[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

  // 统计
  const [stats, setStats] = useState({ posts: 0, comments: 0, votes: 0, comps: 0 })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  // 加载 profile + 统计
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      // 统计
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('post_votes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('competitions').select('id', { count: 'exact', head: true }).eq('submitted_by', userId),
    ]).then(([{ data }, postsRes, commentsRes, votesRes, compsRes]) => {
      if (data) {
        const p = data as any
        setProfile(data as Profile)
        setDisplayName(p.display_name || '')
        setBio(p.bio || '')
        setUniversity(p.university || '')
        setShowUniversity(p.show_university || false)
        setSkills(p.skills || [])
        setGithub(p.github || '')
        setWebsite(p.website || '')
        setInstagram(p.instagram || '')
        setAvatarUrl(p.avatar_url || null)
      }
      setStats({
        posts: postsRes.count ?? 0,
        comments: commentsRes.count ?? 0,
        votes: votesRes.count ?? 0,
        comps: compsRes.count ?? 0,
      })
      setLoading(false)
    })
  }, [userId])

  // 加载好友列表
  useEffect(() => {
    if (!userId) return
    supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')
      .then(async ({ data }) => {
        if (!data?.length) return
        const ids = new Set<string>()
        const fidSet = new Set<string>()
        data.forEach((f) => {
          const fid = f.user_id === userId ? f.friend_id : f.user_id
          ids.add(fid)
          fidSet.add(fid)
        })
        setFriendIds(fidSet)
        if (ids.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', Array.from(ids))
          setFriends((profiles as Profile[]) ?? [])
        }
      })
  }, [userId])

  // 头像上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingAvatar(true)
    try {
      const resized = await resizeImage(file)
      const path = `${userId}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, resized, { contentType: 'image/jpeg', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', userId)
      setAvatarUrl(publicUrl)
      toast.success(locale === 'en' ? 'Avatar updated!' : locale === 'zh-HK' ? '頭像已更新！' : '头像已更新！')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!userId || !profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        university: university || null,
        show_university: showUniversity,
        skills,
        github: github.trim() || null,
        website: website.trim() || null,
        instagram: instagram.trim() || null,
      })
      .eq('user_id', userId)

    setSaving(false)
    if (error) {
      toast.error(locale === 'en' ? 'Update failed' : '更新失败')
    } else {
      setProfile({ ...profile, display_name: displayName.trim(), bio: bio.trim() })
      setEditMode(false)
      toast.success(t(locale, 'profile.saved'))
    }
  }

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', userId)
      .ilike('display_name', `%${searchQuery.trim()}%`)
      .limit(10)
    setSearchResults((data as Profile[]) ?? [])
    setSearching(false)
  }

  const addFriend = async (friendUserId: string) => {
    if (!userId) return
    const { error } = await supabase.from('friendships').insert({
      user_id: userId,
      friend_id: friendUserId,
      status: 'accepted',
    })
    if (error) {
      if (error.code === '23505') toast.error(t(locale, 'profile.already_friends'))
      else toast.error(locale === 'en' ? 'Failed' : '失败')
    } else {
      toast.success(t(locale, 'profile.friend_added'))
      setFriendIds((prev) => new Set([...prev, friendUserId]))
      const { data: p } = await supabase.from('profiles').select('*').eq('user_id', friendUserId).single()
      if (p) setFriends((prev) => [...prev, p as Profile])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const removeFriend = async (friendUserId: string) => {
    if (!userId) return
    await supabase
      .from('friendships')
      .delete()
      .or(`(user_id.eq.${userId},friend_id.eq.${friendUserId}),(user_id.eq.${friendUserId},friend_id.eq.${userId})`)
      .eq('status', 'accepted')
    setFriendIds((prev) => { const next = new Set(prev); next.delete(friendUserId); return next })
    setFriends((prev) => prev.filter((f) => f.user_id !== friendUserId))
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || skills.includes(s)) return
    setSkills([...skills, s])
    setSkillInput('')
  }

  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s))

  // ====== RENDER ======
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-8 w-24 mb-6" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground py-20">
        <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg">{locale === 'en' ? 'Please log in first' : '请先登录'}</p>
        <Button className="mt-4" onClick={() => router.push('/auth/login')}>
          {locale === 'en' ? 'Log In' : '登录'}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t(locale, 'back')}
      </button>

      <h1 className="text-2xl font-bold mb-6">{t(locale, 'profile.title')}</h1>

      {/* ====== 统计卡片 ====== */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: FileText, label: locale === 'en' ? 'Posts' : '帖子', value: stats.posts, color: 'text-blue-500' },
          { icon: MessageSquare, label: locale === 'en' ? 'Comments' : '评论', value: stats.comments, color: 'text-emerald-500' },
          { icon: ThumbsUp, label: locale === 'en' ? 'Votes' : '投票', value: stats.votes, color: 'text-amber-500' },
          { icon: Globe, label: locale === 'en' ? 'Published' : '发布比赛', value: stats.comps, color: 'text-sky-500' },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <CardContent className="p-3">
              <s.icon className={cn('h-5 w-5 mx-auto mb-1', s.color)} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ====== 编辑资料 ====== */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-5">
            {/* 可点击上传的头像 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group shrink-0"
              title={locale === 'en' ? 'Change avatar' : locale === 'zh-HK' ? '更換頭像' : '更换头像'}
            >
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs">...</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div>
              <h2 className="font-semibold text-lg">{profile?.display_name}</h2>
              <p className="text-sm text-muted-foreground">
                {editMode ? (
                  <span className="text-primary">{locale === 'en' ? 'Editing...' : '编辑中...'}</span>
                ) : (
                  <button onClick={() => setEditMode(true)} className="text-primary hover:underline">
                    {t(locale, 'profile.edit')}
                  </button>
                )}
              </p>
            </div>
          </div>

          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'profile.display_name')}</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t(locale, 'profile.display_name_placeholder')}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t(locale, 'profile.bio')}</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t(locale, 'profile.bio_placeholder')}
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* 大学选择 */}
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  {t(locale, 'profile.university')}
                </label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t(locale, 'profile.university_none')}</option>
                  {HK_UNIVERSITIES.map((uni) => (
                    <option key={uni.slug} value={uni.slug}>
                      {uni.logo} {uni.shortName} ({uni.enName})
                    </option>
                  ))}
                </select>
              </div>

              {university && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    {t(locale, 'profile.show_university_label')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUniversity(!showUniversity)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs border transition-all',
                      showUniversity
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {showUniversity ? <><Eye className="h-3 w-3" /> {locale === 'en' ? 'Showing' : '显示中'}</>
                      : <><EyeOff className="h-3 w-3" /> {locale === 'en' ? 'Hidden' : '已隐藏'}</>}
                  </button>
                </div>
              )}

              {/* 技能标签 */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {locale === 'en' ? 'Skills' : locale === 'zh-HK' ? '技能標籤' : '技能标签'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map(s => (
                    <Badge key={s} variant="secondary" className="gap-1 pr-1">
                      {s}
                      <button onClick={() => removeSkill(s)} className="hover:text-destructive">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    placeholder={locale === 'en' ? 'e.g. Unity, React, AI...' : '例如：Unity, React, AI...'}
                    className="h-8 text-sm"
                    maxLength={30}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  />
                  <Button size="sm" variant="outline" className="h-8" onClick={addSkill}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* 社交链接 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {locale === 'en' ? 'Social Links' : locale === 'zh-HK' ? '社交連結' : '社交链接'}
                </label>
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={github} onChange={e => setGithub(e.target.value)}
                    placeholder="github.com/..." className="h-8 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={website} onChange={e => setWebsite(e.target.value)}
                    placeholder="https://..." className="h-8 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={instagram} onChange={e => setInstagram(e.target.value)}
                    placeholder="instagram.com/..." className="h-8 text-sm" />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  {locale === 'en' ? 'Cancel' : locale === 'zh-HK' ? '取消' : '取消'}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !displayName.trim()}>
                  {t(locale, 'profile.save')}
                </Button>
              </div>
            </div>
          ) : (
            /* 查看模式 */
            <div className="space-y-3">
              {profile?.bio ? (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {locale === 'en' ? 'No bio yet.' : locale === 'zh-HK' ? '未有簡介。' : '暂无简介。'}
                </p>
              )}

              {/* 技能标签 */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
              )}

              {/* 社交链接 */}
              {(github || website || instagram) && (
                <div className="flex items-center gap-3 pt-1">
                  {github && (
                    <a href={github.startsWith('http') ? github : `https://${github}`} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
                      <Code2 className="h-4 w-4" />
                    </a>
                  )}
                  {website && (
                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors" title="Website">
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  {instagram && (
                    <a href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors" title="Instagram">
                      <AtSign className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== 好友 ====== */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Users className="h-5 w-5" />
        {t(locale, 'profile.my_friends')}
        <span className="text-muted-foreground font-normal text-sm">({friends.length})</span>
      </h2>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(locale, 'profile.search_users') as string}
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="sm" variant="outline" className="h-9" onClick={handleSearch} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{p.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{p.display_name}</span>
                  </div>
                  {friendIds.has(p.user_id) ? (
                    <span className="text-xs text-muted-foreground">{t(locale, 'profile.already_friends')}</span>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addFriend(p.user_id)}>
                      <UserPlus className="h-3 w-3 mr-1" />
                      {t(locale, 'profile.add_friend')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(locale, 'profile.no_friends')}</p>
      ) : (
        <div className="space-y-1">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{f.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{f.display_name}</span>
                  {f.bio && <p className="text-xs text-muted-foreground line-clamp-1">{f.bio}</p>}
                </div>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => removeFriend(f.user_id)}
              >
                <X className="h-3 w-3 mr-1" />
                {t(locale, 'profile.remove_friend')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

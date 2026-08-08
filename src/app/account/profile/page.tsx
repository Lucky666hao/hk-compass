'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/i18n/LanguageContext'
import { t } from '@/i18n/translations'
import { ArrowLeft, User, Search, UserPlus, X, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // 编辑状态
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  // 好友
  const [friends, setFriends] = useState<Profile[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
  }, [])

  // 加载自己的 profile
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile)
          setDisplayName(data.display_name)
          setBio(data.bio || '')
        }
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

  const handleSave = async () => {
    if (!userId || !profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), bio: bio.trim() })
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

  // 添加好友
  const addFriend = async (friendUserId: string) => {
    if (!userId) return
    const { error } = await supabase.from('friendships').insert({
      user_id: userId,
      friend_id: friendUserId,
      status: 'accepted',
    })
    if (error) {
      if (error.code === '23505') {
        toast.error(t(locale, 'profile.already_friends'))
      } else {
        toast.error(locale === 'en' ? 'Failed' : '失败')
      }
    } else {
      toast.success(t(locale, 'profile.friend_added'))
      setFriendIds((prev) => new Set([...prev, friendUserId]))
      // Refresh friend list
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', friendUserId)
        .single()
      if (p) setFriends((prev) => [...prev, p as Profile])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  // 移除好友
  const removeFriend = async (friendUserId: string) => {
    if (!userId) return
    await supabase
      .from('friendships')
      .delete()
      .or(`(user_id.eq.${userId},friend_id.eq.${friendUserId}),(user_id.eq.${friendUserId},friend_id.eq.${userId})`)
      .eq('status', 'accepted')
    setFriendIds((prev) => {
      const next = new Set(prev)
      next.delete(friendUserId)
      return next
    })
    setFriends((prev) => prev.filter((f) => f.user_id !== friendUserId))
  }

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

      {/* 编辑资料 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-lg">{profile?.display_name}</h2>
              <p className="text-sm text-muted-foreground">
                {editMode ? t(locale, 'profile.edit') : (
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
            <p className="text-sm text-muted-foreground">{profile?.bio || (locale === 'en' ? 'No bio yet.' : locale === 'zh-HK' ? '未有簡介。' : '暂无简介。')}</p>
          )}
        </CardContent>
      </Card>

      {/* 好友 / 搜索用户 */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Users className="h-5 w-5" />
        {t(locale, 'profile.my_friends')}
        <span className="text-muted-foreground font-normal text-sm">({friends.length})</span>
      </h2>

      {/* 搜索添加好友 */}
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

      {/* 好友列表 */}
      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(locale, 'profile.no_friends')}</p>
      ) : (
        <div className="space-y-1">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{f.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{f.display_name}</span>
                  {f.bio && <p className="text-xs text-muted-foreground line-clamp-1">{f.bio}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
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

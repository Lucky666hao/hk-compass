'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/i18n/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trash2, ArrowUp, ArrowDown, Plus, Pencil, Sparkles, X, Upload, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminFeaturedPage() {
  const { locale } = useLocale()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({ competition_id: '', title: '', subtitle: '', image_url: '', link_url: '' })
  const [compSearch, setCompSearch] = useState('')
  const [comps, setComps] = useState<any[]>([])
  const [compOpen, setCompOpen] = useState(false)

  const L = (en: string, hk: string, cn: string) => (locale === 'en' ? en : locale === 'zh-HK' ? hk : cn)

  const fetchItems = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/admin/featured', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.items) setItems(d.items) })
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    supabase.from('competitions').select('id, title').eq('review_status', 'approved').order('title')
      .then(({ data }) => setComps((data as any[]) ?? []))
  }, [])

  const selectedComp = comps.find((c) => c.id === form.competition_id)
  const filteredComps = comps.filter((c) => !compSearch || c.title.toLowerCase().includes(compSearch.toLowerCase()))

  const resetForm = () => {
    setForm({ competition_id: '', title: '', subtitle: '', image_url: '', link_url: '' })
    setEditingId(null)
    setShowForm(false)
    setCompSearch('')
    setCompOpen(false)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploading(false); return }
    const path = `featured/${session.user.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true })
    if (error) {
      toast.error(L('Upload failed', '上傳失敗', '上传失败'))
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }))
    setUploading(false)
  }

  const save = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const payload = {
      competition_id: form.competition_id || null,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
    }
    const body = editingId ? { id: editingId, ...payload } : payload
    const res = await fetch('/api/admin/featured', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success(L('Saved', '已保存', '已保存'))
      resetForm()
      fetchItems()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || L('Failed', '操作失敗', '操作失败'))
    }
  }

  const move = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === id)
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const a = items[idx]
    const b = items[target]
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const patch = (body: any) => fetch('/api/admin/featured', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    await patch({ id: a.id, sort_order: b.sort_order })
    await patch({ id: b.id, sort_order: a.sort_order })
    fetchItems()
  }

  const toggleActive = async (item: any) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/featured', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    })
    fetchItems()
  }

  const remove = async (id: string) => {
    if (!window.confirm(L('Delete this featured item?', '確定刪除這個推薦位？', '确定删除这个推荐位？'))) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/featured', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id }),
    })
    fetchItems()
  }

  const edit = (item: any) => {
    setEditingId(item.id)
    setForm({
      competition_id: item.competition_id || '',
      title: item.title || '',
      subtitle: item.subtitle || '',
      image_url: item.image_url || '',
      link_url: item.link_url || '',
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-medium text-foreground">{items.length}</span>
          {L('featured slots', '個推薦位', '个推荐位')}
        </div>
        <Button
          size="sm"
          variant={showForm ? 'outline' : 'default'}
          onClick={() => { if (showForm) resetForm(); else setShowForm(true) }}
        >
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? L('Cancel', '取消', '取消') : L('Add', '添加推薦', '添加推荐')}
        </Button>
      </div>

      {/* 表单 */}
      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            {/* 关联比赛 */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1.5">
                {L('Link competition (optional)', '關聯比賽（可選）', '关联比赛（可选）')}
              </label>
              {form.competition_id && selectedComp ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border">
                  <span className="text-sm flex-1 truncate">🏆 {selectedComp.title}</span>
                  <button onClick={() => setForm((f) => ({ ...f, competition_id: '' }))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={compSearch}
                      onChange={(e) => { setCompSearch(e.target.value); setCompOpen(true) }}
                      onFocus={() => setCompOpen(true)}
                      placeholder={L('Search competition...', '搜尋比賽...', '搜索比赛...')}
                      className="pl-9"
                    />
                  </div>
                  {compOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-background shadow-lg">
                      <button
                        onClick={() => { setForm((f) => ({ ...f, competition_id: '' })); setCompOpen(false); setCompSearch('') }}
                        className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                      >
                        {L('No competition (pure ad)', '不關聯（純廣告位）', '不关联（纯广告位）')}
                      </button>
                      {filteredComps.slice(0, 50).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setForm((f) => ({ ...f, competition_id: c.id })); setCompOpen(false); setCompSearch('') }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent truncate"
                        >
                          🏆 {c.title}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{L('Title', '標題', '标题')}</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={L('Override title (empty = competition title)', '覆蓋標題（空=比賽標題）', '覆盖标题（空=比赛标题）')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{L('Subtitle', '副標題', '副标题')}</label>
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder={L('Ad slogan...', '廣告語...', '广告语...')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{L('Banner image', '橫幅圖片', '横幅图片')}</label>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? L('Uploading...', '上傳中...', '上传中...') : L('Upload', '上傳', '上传')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}
                  />
                </label>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder={L('or paste image URL', '或粘貼圖片URL', '或粘贴图片URL')}
                  className="flex-1"
                />
              </div>
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{L('Link URL (optional)', '跳轉鏈接（可選）', '跳转链接（可选）')}</label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>{L('Cancel', '取消', '取消')}</Button>
              <Button onClick={save}>{editingId ? L('Update', '更新', '更新') : L('Add', '添加', '添加')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-10 text-center">
          {L('No featured items yet.', '暫無推薦位。', '暂无推荐位。')}
        </p>
      ) : (
        items.map((item, idx) => (
          <Card key={item.id} className={!item.active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-16 w-28 shrink-0 rounded-lg overflow-hidden border bg-muted">
                  {item.image_url || item.competition_poster ? (
                    <img src={item.image_url || item.competition_poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-sky-500 to-purple-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {item.title || item.competition_title || L('(No title)', '（無標題）', '（无标题）')}
                    </span>
                    {item.competition_title && item.title && (
                      <span className="text-xs text-muted-foreground">→ 🏆 {item.competition_title}</span>
                    )}
                    {!item.active && (
                      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {L('Hidden', '已停用', '已停用')}
                      </Badge>
                    )}
                  </div>
                  {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>#{idx + 1}</span>
                    {item.link_url && <span className="truncate max-w-[260px]">🔗 {item.link_url}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(item.id, -1)} disabled={idx === 0} className="p-1.5 rounded border hover:bg-muted disabled:opacity-30" title={L('Move up', '上移', '上移')}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(item.id, 1)} disabled={idx === items.length - 1} className="p-1.5 rounded border hover:bg-muted disabled:opacity-30" title={L('Move down', '下移', '下移')}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => edit(item)} className="p-1.5 rounded border hover:bg-muted" title={L('Edit', '編輯', '编辑')}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toggleActive(item)} className="p-1.5 rounded border hover:bg-muted" title={L('Toggle', '啟用/停用', '启用/停用')}>
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(item.id)} className="p-1.5 rounded border hover:bg-red-50 text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import { Plus, Search, Edit, Trash2, Eye, BookOpen, GraduationCap, FileText, Tag, X } from "lucide-react"
import { educationApi } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogOverlay,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

const CARD = "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const CATEGORIES = [
  "general", "cardiology", "endocrinology", "preventive", "surgery",
  "nutrition", "pediatrics", "dermatology", "other",
]

const CAT_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  cardiology: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  endocrinology: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  preventive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  surgery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  nutrition: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  pediatrics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  dermatology: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
}

interface Article {
  id: number
  title: string
  content: string | null
  category: string
  tags: string | null
  author_id: number | null
  author_name: string | null
  is_published: number
  views: number
  created_at: string
  updated_at: string
}

const emptyForm = { title: "", content: "", category: "general", tags: "", is_published: false }

export default function EducationPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<Article | null>(null)
  const [editing, setEditing] = useState<Article | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchArticles = useCallback(async () => {
    try {
      const { data } = await educationApi.list()
      setArticles(data.data ?? data)
    } catch { toast("Failed to load articles", "error") }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const filtered = articles.filter(a => {
    if (filterCat !== "all" && a.category !== filterCat) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const publishedCount = articles.filter(a => a.is_published).length
  const totalViews = articles.reduce((a, b) => a + b.views, 0)
  const cats = new Set(articles.map(a => a.category))

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(a: Article) {
    setEditing(a)
    setForm({ title: a.title, content: a.content ?? "", category: a.category, tags: a.tags ?? "", is_published: !!a.is_published })
    setDialogOpen(true)
  }

  async function openView(a: Article) {
    try {
      const { data } = await educationApi.get(a.id)
      setViewing(data.data ?? data)
      setViewOpen(true)
    } catch { toast("Failed to load article", "error") }
  }

  async function handleSave() {
    if (!form.title.trim()) { toast("Title is required", "error"); return }
    setSaving(true)
    try {
      const payload = { ...form, is_published: form.is_published ? 1 : 0 }
      if (editing) {
        await educationApi.update(editing.id, payload)
        toast("Article updated")
      } else {
        await educationApi.create(payload)
        toast("Article created")
      }
      setDialogOpen(false)
      fetchArticles()
    } catch { toast("Failed to save", "error") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try {
      await educationApi.delete(id)
      toast("Article deleted")
      fetchArticles()
    } catch { toast("Failed to delete", "error") }
  }

  async function togglePublish(a: Article) {
    try {
      await educationApi.update(a.id, { ...a, is_published: a.is_published ? 0 : 1 })
      fetchArticles()
    } catch { toast("Failed to update", "error") }
  }

  const parseTags = (tags: string | null) => tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.education")}</h1>
          <p className="text-sm text-muted-foreground">Health articles and patient care resources</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 size-4" />New Article</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Articles", value: articles.length, icon: BookOpen, color: "text-blue-500" },
          { label: "Published", value: publishedCount, icon: GraduationCap, color: "text-green-500" },
          { label: "Total Views", value: totalViews, icon: Eye, color: "text-purple-500" },
          { label: "Categories", value: cats.size, icon: Tag, color: "text-teal-500" },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={CARD}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl bg-muted/50 p-2.5 ${c.color}`}><c.icon className="size-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-xl font-bold">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={v => v && setFilterCat(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library"><BookOpen className="mr-1.5 size-4" />Library</TabsTrigger>
          <TabsTrigger value="manage"><FileText className="mr-1.5 size-4" />Manage</TabsTrigger>
        </TabsList>

        {/* Library - Card Grid */}
        <TabsContent value="library" className="pt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className={CARD}><CardContent className="p-6"><div className="space-y-3"><div className="h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-full animate-pulse rounded bg-muted" /><div className="h-3 w-2/3 animate-pulse rounded bg-muted" /></div></CardContent></Card>
              ))}
            </div>
          ) : filtered.filter(a => a.is_published).length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No published articles found</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.filter(a => a.is_published).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={`${CARD} cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20`} onClick={() => openView(a)}>
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <Badge className={`${CAT_COLORS[a.category] ?? CAT_COLORS.other} border-0 capitalize text-xs`}>{a.category}</Badge>
                        {!a.is_published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                      </div>
                      <h3 className="mb-2 font-semibold leading-snug line-clamp-2">{a.title}</h3>
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-3">{a.content ?? "No content"}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {parseTags(a.tags).slice(0, 3).map(tag => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="size-3" />{a.views}</span>
                        <span>{a.author_name ?? "Staff"}</span>
                        <span>{format(parseISO(a.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manage - Table */}
        <TabsContent value="manage" className="pt-4">
          <Card className={CARD}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Category</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Author</th>
                      <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">Views</th>
                      <th className="px-4 py-3 text-center font-medium">Published</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b"><td colSpan={6} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td></tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No articles found</td></tr>
                    ) : filtered.map((a, i) => (
                      <motion.tr key={a.id} className="border-b hover:bg-muted/20 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                        <td className="px-4 py-3 font-medium max-w-[250px] truncate">{a.title}</td>
                        <td className="px-4 py-3 hidden sm:table-cell"><Badge className={`${CAT_COLORS[a.category] ?? CAT_COLORS.other} border-0 capitalize`}>{a.category}</Badge></td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a.author_name ?? "—"}</td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">{a.views}</td>
                        <td className="px-4 py-3 text-center"><Switch checked={!!a.is_published} onCheckedChange={() => togglePublish(a)} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openView(a)}><Eye className="size-4" /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)}><Edit className="size-4" /></Button>
                            <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(a.id)}><Trash2 className="size-4" /></Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Article Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogTitle>{viewing.title}</DialogTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className={`${CAT_COLORS[viewing.category] ?? CAT_COLORS.other} border-0 capitalize`}>{viewing.category}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="size-3" />{viewing.views} views</span>
                <span className="text-xs text-muted-foreground">{viewing.author_name ?? "Staff"}</span>
                <span className="text-xs text-muted-foreground">{format(parseISO(viewing.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{viewing.content ?? "No content available."}</div>
              {viewing.tags && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {parseTags(viewing.tags).map(tag => (
                    <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <DialogClose render={<Button variant="outline">Close</Button>} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>{editing ? "Edit Article" : "New Article"}</DialogTitle>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <input className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={form.category} onValueChange={v => v && setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <input className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. heart, prevention, health" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
              <span className="text-sm">Published</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

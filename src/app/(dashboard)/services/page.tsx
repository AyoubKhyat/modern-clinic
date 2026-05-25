"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Plus, Search, Edit, Trash2, ShoppingCart, Clock, DollarSign, LayoutGrid, X } from "lucide-react"
import { servicesApi } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogTrigger,
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
  "consultation", "laboratory", "imaging", "cardiology",
  "preventive", "surgery", "therapy", "dental", "other",
]

const CAT_COLORS: Record<string, string> = {
  consultation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  laboratory: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  imaging: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  cardiology: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  preventive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  surgery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  therapy: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  dental: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

function formatMAD(n: number) {
  return new Intl.NumberFormat("en-MA", { minimumFractionDigits: 2 }).format(n) + " MAD"
}

interface Service {
  id: number
  name: string
  category: string
  description: string | null
  price: number
  duration_minutes: number
  is_active: number
  created_at: string
}

const emptyForm = { name: "", category: "consultation", description: "", price: 0, duration_minutes: 30, is_active: true }

export default function ServicesPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await servicesApi.list()
      setServices(data.data ?? data)
    } catch { toast("Failed to load services", "error") }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchServices() }, [fetchServices])

  const filtered = services.filter(s => {
    if (filterCat !== "all" && s.category !== filterCat) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = services.filter(s => s.is_active).length
  const avgPrice = services.length ? services.reduce((a, s) => a + s.price, 0) / services.length : 0
  const cats = new Set(services.map(s => s.category))

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({ name: s.name, category: s.category, description: s.description ?? "", price: s.price, duration_minutes: s.duration_minutes, is_active: !!s.is_active })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast("Name is required", "error"); return }
    setSaving(true)
    try {
      const payload = { ...form, is_active: form.is_active ? 1 : 0 }
      if (editing) {
        await servicesApi.update(editing.id, payload)
        toast("Service updated")
      } else {
        await servicesApi.create(payload)
        toast("Service created")
      }
      setDialogOpen(false)
      fetchServices()
    } catch { toast("Failed to save service", "error") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try {
      await servicesApi.delete(id)
      toast("Service deleted")
      fetchServices()
    } catch { toast("Failed to delete", "error") }
  }

  async function toggleActive(s: Service) {
    try {
      await servicesApi.update(s.id, { ...s, is_active: s.is_active ? 0 : 1 })
      fetchServices()
    } catch { toast("Failed to update", "error") }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.services")}</h1>
          <p className="text-sm text-muted-foreground">Manage clinic services and pricing</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 size-4" />Add Service</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Services", value: services.length, icon: ShoppingCart, color: "text-blue-500" },
          { label: "Active", value: activeCount, icon: LayoutGrid, color: "text-green-500" },
          { label: "Avg Price", value: formatMAD(avgPrice), icon: DollarSign, color: "text-teal-500" },
          { label: "Categories", value: cats.size, icon: Clock, color: "text-purple-500" },
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
          <input className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={v => v && setFilterCat(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className={CARD}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">Duration</th>
                  <th className="px-4 py-3 text-center font-medium">Active</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={7} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No services found</td></tr>
                ) : filtered.map((s, i) => (
                  <motion.tr key={s.id} className="border-b hover:bg-muted/20 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Badge className={`${CAT_COLORS[s.category] ?? CAT_COLORS.other} border-0 capitalize`}>{s.category}</Badge></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{s.description ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatMAD(s.price)}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">{s.duration_minutes} min</td>
                    <td className="px-4 py-3 text-center"><Switch checked={!!s.is_active} onCheckedChange={() => toggleActive(s)} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}><Edit className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(s.id)}><Trash2 className="size-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <input className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
              <label className="text-sm font-medium">Description</label>
              <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price (MAD)</label>
                <input type="number" min={0} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (min)</label>
                <input type="number" min={5} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <span className="text-sm">Active</span>
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

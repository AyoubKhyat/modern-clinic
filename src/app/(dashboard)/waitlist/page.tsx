"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { Plus, Search, Trash2, Bell, CalendarPlus, ListOrdered, AlertTriangle, CheckCircle, Clock, X } from "lucide-react"
import { waitlistApi, patientsApi, servicesApi } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  notified: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: "Normal", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  1: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  2: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

interface WaitlistEntry {
  id: number
  patient_id: number
  patient_name: string
  doctor_id: number | null
  doctor_name: string | null
  preferred_date: string | null
  preferred_time: string | null
  service_id: number | null
  service_name: string | null
  status: string
  priority: number
  notes: string | null
  notified_at: string | null
  created_at: string
}

const emptyForm = { patient_id: "", doctor_id: "", preferred_date: "", preferred_time: "", service_id: "", priority: "0", notes: "" }

export default function WaitlistPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertId, setConvertId] = useState<number | null>(null)
  const [convertDate, setConvertDate] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [wRes, pRes, sRes] = await Promise.all([
        waitlistApi.list(),
        patientsApi.list(),
        servicesApi.list(),
      ])
      setEntries(wRes.data.data ?? wRes.data)
      setPatients((pRes.data.data ?? pRes.data) || [])
      setServices((sRes.data.data ?? sRes.data) || [])
    } catch { toast("Failed to load data", "error") }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = entries.filter(e => filterStatus === "all" || e.status === filterStatus)

  const waitingCount = entries.filter(e => e.status === "waiting").length
  const highPriority = entries.filter(e => e.priority >= 1 && e.status === "waiting").length
  const convertedToday = entries.filter(e => {
    if (e.status !== "converted") return false
    return e.created_at?.startsWith(new Date().toISOString().slice(0, 10))
  }).length

  async function handleCreate() {
    if (!form.patient_id) { toast("Patient is required", "error"); return }
    setSaving(true)
    try {
      await waitlistApi.create({
        patient_id: Number(form.patient_id),
        doctor_id: form.doctor_id ? Number(form.doctor_id) : null,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        service_id: form.service_id ? Number(form.service_id) : null,
        priority: Number(form.priority),
        notes: form.notes || null,
      })
      toast("Added to waitlist")
      setDialogOpen(false)
      setForm(emptyForm)
      fetchData()
    } catch { toast("Failed to add", "error") }
    finally { setSaving(false) }
  }

  async function handleNotify(id: number) {
    try {
      await waitlistApi.update(id, { status: "notified", notified_at: new Date().toISOString() })
      toast("Patient notified")
      fetchData()
    } catch { toast("Failed to notify", "error") }
  }

  async function handleConvert() {
    if (!convertId || !convertDate) { toast("Date/time required", "error"); return }
    setSaving(true)
    try {
      await waitlistApi.convert(convertId, { scheduled_at: convertDate })
      toast("Converted to appointment")
      setConvertOpen(false)
      fetchData()
    } catch { toast("Failed to convert", "error") }
    finally { setSaving(false) }
  }

  async function handleCancel(id: number) {
    try {
      await waitlistApi.update(id, { status: "cancelled" })
      toast("Entry cancelled")
      fetchData()
    } catch { toast("Failed to cancel", "error") }
  }

  async function handleDelete(id: number) {
    try {
      await waitlistApi.delete(id)
      toast("Entry removed")
      fetchData()
    } catch { toast("Failed to delete", "error") }
  }

  function openConvert(id: number) {
    setConvertId(id)
    setConvertDate("")
    setConvertOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.waitlist")}</h1>
          <p className="text-sm text-muted-foreground">Manage appointment waitlist and priorities</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true) }}><Plus className="mr-2 size-4" />Add to Waitlist</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Waiting", value: waitingCount, icon: ListOrdered, color: "text-yellow-500" },
          { label: "High Priority", value: highPriority, icon: AlertTriangle, color: "text-orange-500" },
          { label: "Converted Today", value: convertedToday, icon: CheckCircle, color: "text-green-500" },
          { label: "Total Entries", value: entries.length, icon: Clock, color: "text-blue-500" },
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

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={v => v && setFilterStatus(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="notified">Notified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <th className="px-4 py-3 text-left font-medium">Patient</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Doctor</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Preferred Date</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Service</th>
                  <th className="px-4 py-3 text-center font-medium">Priority</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Wait Time</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={8} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No waitlist entries</td></tr>
                ) : filtered.map((e, i) => (
                  <motion.tr key={e.id} className="border-b hover:bg-muted/20 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <td className="px-4 py-3 font-medium">{e.patient_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{e.doctor_name ?? "Any"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {e.preferred_date ? format(parseISO(e.preferred_date), "MMM d, yyyy") : "—"}
                      {e.preferred_time ? ` ${e.preferred_time}` : ""}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{e.service_name ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${PRIORITY_CONFIG[e.priority]?.color ?? PRIORITY_CONFIG[0].color} border-0`}>
                        {PRIORITY_CONFIG[e.priority]?.label ?? "Normal"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${STATUS_COLORS[e.status] ?? STATUS_COLORS.waiting} border-0 capitalize`}>{e.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {formatDistanceToNow(parseISO(e.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {e.status === "waiting" && (
                          <>
                            <Button variant="ghost" size="icon-sm" title="Notify" onClick={() => handleNotify(e.id)}><Bell className="size-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="icon-sm" title="Convert" onClick={() => openConvert(e.id)}><CalendarPlus className="size-4 text-green-500" /></Button>
                            <Button variant="ghost" size="icon-sm" title="Cancel" onClick={() => handleCancel(e.id)}><X className="size-4 text-orange-500" /></Button>
                          </>
                        )}
                        {e.status === "notified" && (
                          <Button variant="ghost" size="icon-sm" title="Convert" onClick={() => openConvert(e.id)}><CalendarPlus className="size-4 text-green-500" /></Button>
                        )}
                        <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => handleDelete(e.id)}><Trash2 className="size-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add to Waitlist Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Add to Waitlist</DialogTitle>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Patient *</label>
              <Select value={form.patient_id} onValueChange={v => v && setForm(f => ({ ...f, patient_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.first_name} {p.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Preferred Doctor</label>
              <Select value={form.doctor_id} onValueChange={v => v && setForm(f => ({ ...f, doctor_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Any available" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Preferred Date</label>
                <input type="date" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Preferred Time</label>
                <input type="time" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Service</label>
              <Select value={form.service_id} onValueChange={v => v && setForm(f => ({ ...f, service_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {services.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={form.priority} onValueChange={v => v && setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Normal</SelectItem>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Adding..." : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Appointment Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Convert to Appointment</DialogTitle>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Appointment Date & Time *</label>
              <input type="datetime-local" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={convertDate} onChange={e => setConvertDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleConvert} disabled={saving}>{saving ? "Converting..." : "Convert"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

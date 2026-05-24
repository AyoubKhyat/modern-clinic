"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  CalendarClock,
  Play,
  RefreshCw,
} from "lucide-react"
import { recurringAppointmentsApi, patientsApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { TableSkeleton } from "@/components/ui/skeletons"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

/* ── Types ── */

interface RecurringAppointment {
  id: number
  patient_id: number
  patient_name: string
  doctor_id: number
  doctor_name: string
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  time: string
  duration_minutes: number
  type: string
  reason: string
  start_date: string
  end_date: string | null
  is_active: boolean
}

interface Patient {
  id: number
  first_name: string
  last_name: string
}

interface FormData {
  patient_id: string
  doctor_id: string
  frequency: string
  day_of_week: string
  day_of_month: string
  time: string
  duration_minutes: string
  type: string
  reason: string
  start_date: string
  end_date: string
}

const DOCTORS = [
  { value: "1", label: "Dr. Admin" },
  { value: "2", label: "Dr. Sarah Chen" },
]

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

const TYPES = ["Consultation", "Follow-up", "Checkup", "Therapy", "Lab Work"]
const DURATIONS = ["15", "30", "45", "60", "90"]

const emptyForm: FormData = {
  patient_id: "",
  doctor_id: "",
  frequency: "weekly",
  day_of_week: "1",
  day_of_month: "1",
  time: "09:00",
  duration_minutes: "30",
  type: "Consultation",
  reason: "",
  start_date: "",
  end_date: "",
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.04, type: "spring" as const },
  }),
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, type: "spring" as const },
  },
}

const frequencyColor: Record<string, string> = {
  daily: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  weekly: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  monthly: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
}

function dayOfWeekLabel(day: number | null): string {
  if (day === null || day === undefined) return "—"
  return DAYS_OF_WEEK.find((d) => d.value === String(day))?.label ?? "—"
}

export default function RecurringAppointmentsPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [appointments, setAppointments] = useState<RecurringAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringAppointment | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<RecurringAppointment | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatingItem, setGeneratingItem] = useState<RecurringAppointment | null>(null)
  const [generateUntil, setGenerateUntil] = useState("")
  const [generating, setGenerating] = useState(false)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await recurringAppointmentsApi.list()
      setAppointments(data.data ?? [])
    } catch {
      setAppointments([])
      toast("Failed to load recurring appointments", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const filtered = appointments.filter((apt) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      apt.patient_name?.toLowerCase().includes(q) ||
      apt.doctor_name?.toLowerCase().includes(q) ||
      apt.type?.toLowerCase().includes(q) ||
      apt.frequency?.toLowerCase().includes(q)
    )
  })

  function openCreate() {
    setEditingItem(null)
    setFormOpen(true)
  }

  function openEdit(item: RecurringAppointment) {
    setEditingItem(item)
    setFormOpen(true)
  }

  function openDelete(item: RecurringAppointment) {
    setDeletingItem(item)
    setDeleteOpen(true)
  }

  function openGenerate(item: RecurringAppointment) {
    setGeneratingItem(item)
    setGenerateUntil("")
    setGenerateOpen(true)
  }

  async function handleDelete() {
    if (!deletingItem) return
    try {
      await recurringAppointmentsApi.delete(deletingItem.id)
      toast("Recurring appointment deleted")
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchAppointments()
    } catch {
      toast("Failed to delete recurring appointment", "error")
    }
  }

  async function handleToggleActive(item: RecurringAppointment) {
    try {
      await recurringAppointmentsApi.update(item.id, {
        is_active: !item.is_active,
      })
      toast(item.is_active ? "Appointment deactivated" : "Appointment activated")
      fetchAppointments()
    } catch {
      toast("Failed to update status", "error")
    }
  }

  async function handleGenerate() {
    if (!generatingItem) return
    setGenerating(true)
    try {
      const { data } = await recurringAppointmentsApi.generate(
        generatingItem.id,
        generateUntil || undefined
      )
      const count = data.generated ?? 0
      toast(`${count} appointment${count !== 1 ? "s" : ""} generated`)
      setGenerateOpen(false)
      setGeneratingItem(null)
    } catch {
      toast("Failed to generate appointments", "error")
    } finally {
      setGenerating(false)
    }
  }

  function handleFormSuccess() {
    toast(editingItem ? "Recurring appointment updated" : "Recurring appointment created")
    setFormOpen(false)
    setEditingItem(null)
    fetchAppointments()
  }

  const activeCount = appointments.filter((a) => a.is_active).length
  const inactiveCount = appointments.filter((a) => !a.is_active).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recurring Appointments"
        description="Manage repeating appointment patterns and generate upcoming schedules"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Pattern
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <div className="rounded-xl border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-teal-500/10">
                <CalendarClock className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-xs text-muted-foreground">Total Patterns</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
        >
          <div className="rounded-xl border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                <Play className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-xl border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gray-500/10">
                <RefreshCw className="size-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, doctor, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={7} />
      ) : filtered.length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden md:table-cell">Doctor</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="hidden sm:table-cell">Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((apt, i) => (
                <motion.tr
                  key={apt.id}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{apt.patient_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {apt.doctor_name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={frequencyColor[apt.frequency] ?? ""}
                    >
                      {apt.frequency.charAt(0).toUpperCase() + apt.frequency.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {apt.frequency === "weekly"
                      ? dayOfWeekLabel(apt.day_of_week)
                      : apt.frequency === "monthly"
                        ? `Day ${apt.day_of_month ?? "—"}`
                        : "—"}
                  </TableCell>
                  <TableCell>{apt.time}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">{apt.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={apt.is_active}
                        onCheckedChange={() => handleToggleActive(apt)}
                        size="sm"
                      />
                      <Badge
                        variant={apt.is_active ? "default" : "secondary"}
                        className={
                          apt.is_active
                            ? "bg-teal-600 text-white"
                            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }
                      >
                        {apt.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Generate Appointments"
                        onClick={() => openGenerate(apt)}
                        disabled={!apt.is_active}
                      >
                        <CalendarClock className="size-4 text-teal-600 dark:text-teal-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        onClick={() => openEdit(apt)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete"
                        onClick={() => openDelete(apt)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Recurring Appointment" : "New Recurring Appointment"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the recurring appointment pattern below."
                : "Create a new repeating appointment pattern."}
            </DialogDescription>
          </DialogHeader>
          <RecurringForm
            item={editingItem}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recurring Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the recurring appointment for{" "}
              <span className="font-semibold">{deletingItem?.patient_name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Appointments</DialogTitle>
            <DialogDescription>
              Create upcoming appointments from the pattern for{" "}
              <span className="font-semibold">{generatingItem?.patient_name}</span>.
              Optionally set an end date.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg bg-teal-500/5 p-3 ring-1 ring-teal-500/10">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Frequency</span>
                  <p className="font-medium capitalize">{generatingItem?.frequency}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Time</span>
                  <p className="font-medium">{generatingItem?.time}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Doctor</span>
                  <p className="font-medium">{generatingItem?.doctor_name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Type</span>
                  <p className="font-medium">{generatingItem?.type}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Generate Until (optional)</Label>
              <Input
                type="date"
                value={generateUntil}
                onChange={(e) => setGenerateUntil(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the pattern end date or default range.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CalendarClock className="size-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Form Component ── */

function RecurringForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: RecurringAppointment | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const isEdit = !!item

  const [form, setForm] = useState<FormData>(() => {
    if (item) {
      return {
        patient_id: String(item.patient_id),
        doctor_id: String(item.doctor_id),
        frequency: item.frequency,
        day_of_week: String(item.day_of_week ?? "1"),
        day_of_month: String(item.day_of_month ?? "1"),
        time: item.time ?? "09:00",
        duration_minutes: String(item.duration_minutes),
        type: item.type ?? "Consultation",
        reason: item.reason ?? "",
        start_date: item.start_date ?? "",
        end_date: item.end_date ?? "",
      }
    }
    return { ...emptyForm }
  })

  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState("")
  const [patientLoading, setPatientLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Load patients for the dropdown
  useEffect(() => {
    setPatientLoading(true)
    patientsApi
      .list()
      .then(({ data }) => setPatients(data.data ?? []))
      .catch(() => setPatients([]))
      .finally(() => setPatientLoading(false))
  }, [])

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true
    const q = patientSearch.toLowerCase()
    const name = `${p.first_name} ${p.last_name}`.toLowerCase()
    return name.includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.patient_id) {
      setError("Please select a patient.")
      return
    }
    if (!form.doctor_id) {
      setError("Please select a doctor.")
      return
    }
    if (!form.start_date) {
      setError("Start date is required.")
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, any> = {
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        frequency: form.frequency,
        time: form.time,
        duration_minutes: Number(form.duration_minutes),
        type: form.type,
        reason: form.reason || undefined,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
      }

      if (form.frequency === "weekly") {
        payload.day_of_week = Number(form.day_of_week)
      }
      if (form.frequency === "monthly") {
        payload.day_of_month = Number(form.day_of_month)
      }

      if (isEdit) {
        await recurringAppointmentsApi.update(item.id, payload)
      } else {
        await recurringAppointmentsApi.create(payload)
      }
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : "Something went wrong. Please try again.")
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Generate day_of_month options (1-31)
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Patient select */}
        <div className="flex flex-col gap-1.5">
          <Label>Patient *</Label>
          <Select
            value={form.patient_id}
            onValueChange={(v) => update("patient_id", v ?? "")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={patientLoading ? "Loading..." : "Select patient"} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-1">
                <Input
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {filteredPatients.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
              {filteredPatients.length === 0 && (
                <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                  No patients found
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Doctor select */}
        <div className="flex flex-col gap-1.5">
          <Label>Doctor *</Label>
          <Select
            value={form.doctor_id}
            onValueChange={(v) => update("doctor_id", v ?? "")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {DOCTORS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Frequency */}
        <div className="flex flex-col gap-1.5">
          <Label>Frequency *</Label>
          <Select
            value={form.frequency}
            onValueChange={(v) => update("frequency", v ?? "weekly")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day of Week (shown when weekly) */}
        {form.frequency === "weekly" && (
          <div className="flex flex-col gap-1.5">
            <Label>Day of Week</Label>
            <Select
              value={form.day_of_week}
              onValueChange={(v) => update("day_of_week", v ?? "1")}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Day of Month (shown when monthly) */}
        {form.frequency === "monthly" && (
          <div className="flex flex-col gap-1.5">
            <Label>Day of Month</Label>
            <Select
              value={form.day_of_month}
              onValueChange={(v) => update("day_of_month", v ?? "1")}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfMonth.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Time */}
        <div className="flex flex-col gap-1.5">
          <Label>Time *</Label>
          <Input
            type="time"
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
            className="h-9"
            required
          />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5">
          <Label>Duration</Label>
          <Select
            value={form.duration_minutes}
            onValueChange={(v) => update("duration_minutes", v ?? "30")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select
            value={form.type}
            onValueChange={(v) => update("type", v ?? "Consultation")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => update("start_date", e.target.value)}
            className="h-9"
            required
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <Label>End Date (optional)</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => update("end_date", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Reason */}
      <div className="flex flex-col gap-1.5">
        <Label>Reason</Label>
        <Textarea
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
          rows={2}
          placeholder="Reason for recurring appointment..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Pattern"
          ) : (
            "Create Pattern"
          )}
        </Button>
      </div>
    </form>
  )
}

/* ── Empty State ── */

function EmptyState({
  search,
  onCreate,
}: {
  search: string
  onCreate: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <CalendarClock className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {search ? "No recurring appointments found" : "No recurring appointments yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try adjusting your search."
            : "Create your first recurring appointment pattern to get started."}
        </p>
      </div>
      {!search && (
        <Button onClick={onCreate} className="mt-2 bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="size-4" />
          New Pattern
        </Button>
      )}
    </motion.div>
  )
}

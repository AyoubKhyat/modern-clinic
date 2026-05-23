"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  Search,
  Plus,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react"
import { appointmentsApi, patientsApi } from "@/lib/api"
import type { Appointment, Patient, PaginatedResponse } from "@/types"
import {
  appointmentStatusConfig,
  statusColorMap,
  appointmentStatuses,
} from "@/lib/constants"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeletons"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

const DOCTORS = [
  { value: "2", label: "Dr. Amina Tazi" },
  { value: "3", label: "Dr. Youssef El Idrissi" },
]

const TYPES = ["Consultation", "Follow-up", "Emergency", "Checkup"]
const DURATIONS = ["15", "30", "45", "60"]

interface AppointmentFormData {
  patient_id: string
  doctor_id: string
  scheduled_at: string
  duration_minutes: string
  type: string
  reason: string
  notes: string
}

const emptyForm: AppointmentFormData = {
  patient_id: "",
  doctor_id: "",
  scheduled_at: "",
  duration_minutes: "30",
  type: "Consultation",
  reason: "",
  notes: "",
}

export default function AppointmentsPage() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Appointment>["meta"] | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page }
      if (dateFilter) params.date = dateFilter
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const { data } = await appointmentsApi.list(params)
      setAppointments(data.data ?? [])
      setMeta(data.meta ?? null)
    } catch {
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [page, dateFilter, statusFilter, search])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [search, dateFilter, statusFilter])

  function openCreate() {
    setEditingAppointment(null)
    setFormOpen(true)
  }

  function openEdit(apt: Appointment) {
    setEditingAppointment(apt)
    setFormOpen(true)
  }

  function openDetail(apt: Appointment) {
    setViewingAppointment(apt)
    setDetailOpen(true)
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await appointmentsApi.updateStatus(id, status)
      fetchAppointments()
      toast("Status updated")
    } catch {
      toast("Failed to update status", "error")
    }
  }

  function handleFormSuccess() {
    toast("Appointment saved successfully")
    setFormOpen(false)
    setEditingAppointment(null)
    fetchAppointments()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description="Schedule and manage patient appointments"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Appointment
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 w-40"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "")}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {appointmentStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {appointmentStatusConfig[s]?.label ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : appointments.length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Doctor</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((apt, i) => (
                  <motion.tr
                    key={apt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {format(parseISO(apt.scheduled_at), "MMM d, yyyy")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(apt.scheduled_at), "h:mm a")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {apt.patient?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {apt.doctor?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{apt.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusDropdown
                        currentStatus={apt.status}
                        onStatusChange={(s) => handleStatusChange(apt.id, s)}
                      />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {apt.duration_minutes} min
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDetail(apt)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(apt)}
                        >
                          <Edit className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {meta && meta.last_page > 1 && (
            <Pagination meta={meta} page={page} onPageChange={setPage} />
          )}
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Update the appointment details below."
                : "Schedule a new appointment for a patient."}
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            appointment={editingAppointment}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {viewingAppointment && (
            <AppointmentDetail appointment={viewingAppointment} />
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusDropdown({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: string
  onStatusChange: (status: string) => void
}) {
  const config = appointmentStatusConfig[currentStatus]
  return (
    <Select value={currentStatus} onValueChange={(v) => v && onStatusChange(v)}>
      <SelectTrigger className="h-7 w-32 text-xs">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[currentStatus] ?? ""}`}>
          {config?.label ?? currentStatus}
        </span>
      </SelectTrigger>
      <SelectContent>
        {appointmentStatuses.map((s) => (
          <SelectItem key={s} value={s}>
            <span className={`inline-block size-2 rounded-full ${statusColorMap[s]?.split(" ")[0] ?? "bg-muted-foreground/30"}`} />
            {appointmentStatusConfig[s]?.label ?? s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AppointmentDetail({ appointment }: { appointment: Appointment }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Patient</span>
          <span>{appointment.patient?.full_name ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Doctor</span>
          <span>{appointment.doctor?.name ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Date & Time</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            {format(parseISO(appointment.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Duration</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {appointment.duration_minutes} minutes
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <Badge variant="outline" className="w-fit">{appointment.type}</Badge>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <Badge
            variant={appointmentStatusConfig[appointment.status]?.variant ?? "outline"}
            className="w-fit capitalize"
          >
            {appointmentStatusConfig[appointment.status]?.label ?? appointment.status}
          </Badge>
        </div>
      </div>
      {appointment.reason && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Reason</span>
          <p className="text-muted-foreground">{appointment.reason}</p>
        </div>
      )}
      {appointment.notes && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <p className="text-muted-foreground">{appointment.notes}</p>
        </div>
      )}
    </div>
  )
}

function AppointmentForm({
  appointment,
  onSuccess,
  onCancel,
}: {
  appointment: Appointment | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!appointment

  const [form, setForm] = useState<AppointmentFormData>(() => {
    if (appointment) {
      return {
        patient_id: String(appointment.patient?.id ?? ""),
        doctor_id: String(appointment.doctor?.id ?? ""),
        scheduled_at: appointment.scheduled_at
          ? format(parseISO(appointment.scheduled_at), "yyyy-MM-dd'T'HH:mm")
          : "",
        duration_minutes: String(appointment.duration_minutes),
        type: appointment.type ?? "Consultation",
        reason: appointment.reason ?? "",
        notes: appointment.notes ?? "",
      }
    }
    return { ...emptyForm }
  })

  const [patientSearch, setPatientSearch] = useState(appointment?.patient?.full_name ?? "")
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [selectedPatientName, setSelectedPatientName] = useState(appointment?.patient?.full_name ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handlePatientSearch(query: string) {
    setPatientSearch(query)
    setSelectedPatientName("")
    update("patient_id", "")

    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (query.length < 2) {
      setPatientResults([])
      setShowPatientDropdown(false)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await patientsApi.list({ search: query })
        setPatientResults(data.data ?? [])
        setShowPatientDropdown(true)
      } catch {
        setPatientResults([])
      }
    }, 300)
  }

  function selectPatient(patient: Patient) {
    update("patient_id", String(patient.id))
    setPatientSearch(patient.full_name)
    setSelectedPatientName(patient.full_name)
    setShowPatientDropdown(false)
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.patient_id) {
      setError("Please select a patient.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        scheduled_at: form.scheduled_at,
        duration_minutes: Number(form.duration_minutes),
        type: form.type,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
      }

      if (isEdit) {
        await appointmentsApi.update(appointment.id, payload)
      } else {
        await appointmentsApi.create(payload)
      }
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : "Something went wrong. Please try again.")
      setError(msg || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
          <Label>Patient *</Label>
          <Input
            value={selectedPatientName || patientSearch}
            onChange={(e) => handlePatientSearch(e.target.value)}
            placeholder="Type to search patients..."
            className="h-9"
            required
          />
          {showPatientDropdown && patientResults.length > 0 && (
            <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => selectPatient(p)}
                >
                  <span className="font-medium">{p.full_name}</span>
                  <span className="text-xs text-muted-foreground">{p.phone}</span>
                </button>
              ))}
            </div>
          )}
          {showPatientDropdown && patientResults.length === 0 && patientSearch.length >= 2 && (
            <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
              No patients found
            </div>
          )}
        </div>

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

        <div className="flex flex-col gap-1.5">
          <Label>Date & Time *</Label>
          <Input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => update("scheduled_at", e.target.value)}
            className="h-9"
            required
          />
        </div>

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

        <div className="flex flex-col gap-1.5 sm:col-span-2">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Reason</Label>
        <Textarea
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
          rows={2}
          placeholder="Reason for the appointment..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Updating..." : "Scheduling..."}
            </>
          ) : isEdit ? (
            "Update Appointment"
          ) : (
            "Schedule Appointment"
          )}
        </Button>
      </div>
    </form>
  )
}

function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PaginatedResponse<Appointment>["meta"]
  page: number
  onPageChange: (p: number) => void
}) {
  const pages: number[] = []
  for (let i = 1; i <= meta.last_page; i++) {
    if (i === 1 || i === meta.last_page || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(page - 1) * meta.per_page + 1}–
        {Math.min(page * meta.per_page, meta.total)} of {meta.total}
      </p>
      <div className="inline-flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((p, idx) => {
          const prevPage = pages[idx - 1]
          const showEllipsis = prevPage !== undefined && p - prevPage > 1
          return (
            <span key={p} className="inline-flex items-center">
              {showEllipsis && (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              )}
              <Button
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </span>
          )
        })}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= meta.last_page}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

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
        <Calendar className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {search ? "No appointments found" : "No appointments yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try adjusting your search or filters."
            : "Schedule your first appointment to get started."}
        </p>
      </div>
      {!search && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          New Appointment
        </Button>
      )}
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { format, parseISO, differenceInMinutes } from "date-fns"
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Loader2,
  FileText,
} from "lucide-react"
import { visitsApi, patientsApi, visitTemplatesApi } from "@/lib/api"
import type { Visit, Patient, PaginatedResponse } from "@/types"
import {
  visitStatusConfig,
  statusColorMap,
  visitStatuses,
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

export default function VisitsPage() {
  const { toast } = useToast()
  const [visits, setVisits] = useState<Visit[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Visit>["meta"] | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [doctorFilter, setDoctorFilter] = useState("")

  const [formOpen, setFormOpen] = useState(false)

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page }
      if (dateFilter) params.date = dateFilter
      if (statusFilter) params.status = statusFilter
      if (doctorFilter) params.doctor_id = doctorFilter
      const { data } = await visitsApi.list(params)
      setVisits(data.data ?? [])
      setMeta(data.meta ?? null)
    } catch {
      setVisits([])
    } finally {
      setLoading(false)
    }
  }, [page, dateFilter, statusFilter, doctorFilter])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [dateFilter, statusFilter, doctorFilter])

  function handleFormSuccess() {
    toast("Visit created successfully")
    setFormOpen(false)
    fetchVisits()
  }

  function calcDuration(visit: Visit): string {
    if (!visit.started_at || !visit.completed_at) return "—"
    const mins = differenceInMinutes(parseISO(visit.completed_at), parseISO(visit.started_at))
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  function truncate(text: string | undefined, maxLen: number): string {
    if (!text) return "—"
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visits & Consultations"
        description="Track patient visits and consultations"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New Visit
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
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
            {visitStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {visitStatusConfig[s]?.label ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={doctorFilter}
          onValueChange={(v) => setDoctorFilter(v ?? "")}
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Doctors</SelectItem>
            {DOCTORS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton columns={5} />
      ) : visits.length === 0 ? (
        <EmptyState onCreate={() => setFormOpen(true)} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Chief Complaint</TableHead>
                  <TableHead className="hidden xl:table-cell">Diagnosis</TableHead>
                  <TableHead className="hidden sm:table-cell">Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit, i) => (
                  <motion.tr
                    key={visit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <span className="text-sm font-medium">
                        {format(parseISO(visit.created_at), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {visit.patient?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {visit.doctor?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={visitStatusConfig[visit.status]?.variant ?? "outline"}
                        className={`${statusColorMap[visit.status] ?? ""}`}
                      >
                        {visitStatusConfig[visit.status]?.label ?? visit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] text-muted-foreground lg:table-cell">
                      {truncate(visit.chief_complaint, 40)}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] text-muted-foreground xl:table-cell">
                      {truncate(visit.diagnosis, 40)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {calcDuration(visit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/visits/${visit.id}`} />}
                      >
                        <Eye className="size-4" />
                      </Button>
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
            <DialogTitle>New Visit</DialogTitle>
            <DialogDescription>
              Register a new patient visit or walk-in consultation.
            </DialogDescription>
          </DialogHeader>
          <VisitForm
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface VisitTemplate {
  id: number
  name: string
  category: string
  chief_complaint: string
  diagnosis: string
  notes: string
  vitals_defaults: {
    temperature?: number
    blood_pressure?: string
    heart_rate?: number
    weight?: number
  } | null
}

function VisitForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_id: "",
    chief_complaint: "",
    diagnosis: "",
    notes: "",
    temperature: "",
    blood_pressure: "",
    heart_rate: "",
    weight: "",
  })

  const [templates, setTemplates] = useState<VisitTemplate[]>([])
  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [selectedPatientName, setSelectedPatientName] = useState("")
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const { data } = await visitTemplatesApi.list()
        setTemplates(data.data ?? data ?? [])
      } catch {
        setTemplates([])
      }
    }
    fetchTemplates()
  }, [])

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

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => String(t.id) === templateId)
    if (!template) return

    setForm((prev) => ({
      ...prev,
      chief_complaint: template.chief_complaint || prev.chief_complaint,
      diagnosis: template.diagnosis || prev.diagnosis,
      notes: template.notes || prev.notes,
      temperature: template.vitals_defaults?.temperature
        ? String(template.vitals_defaults.temperature)
        : prev.temperature,
      blood_pressure: template.vitals_defaults?.blood_pressure || prev.blood_pressure,
      heart_rate: template.vitals_defaults?.heart_rate
        ? String(template.vitals_defaults.heart_rate)
        : prev.heart_rate,
      weight: template.vitals_defaults?.weight
        ? String(template.vitals_defaults.weight)
        : prev.weight,
    }))

    if (template.vitals_defaults) {
      setVitalsOpen(true)
    }
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
      const vitals: Record<string, any> = {}
      if (form.temperature) vitals.temperature = Number(form.temperature)
      if (form.blood_pressure) vitals.blood_pressure = form.blood_pressure
      if (form.heart_rate) vitals.heart_rate = Number(form.heart_rate)
      if (form.weight) vitals.weight = Number(form.weight)

      const payload: Record<string, any> = {
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        chief_complaint: form.chief_complaint || undefined,
        diagnosis: form.diagnosis || undefined,
        notes: form.notes || undefined,
      }
      if (form.appointment_id) payload.appointment_id = Number(form.appointment_id)
      if (Object.keys(vitals).length > 0) payload.vitals = vitals

      await visitsApi.create(payload)
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

      {templates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <FileText className="size-4 text-muted-foreground" />
            Template
          </Label>
          <Select onValueChange={(v) => v && typeof v === "string" && applyTemplate(v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Apply template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Appointment ID (optional)</Label>
          <Input
            type="number"
            value={form.appointment_id}
            onChange={(e) => update("appointment_id", e.target.value)}
            placeholder="Leave empty for walk-in"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Chief Complaint</Label>
        <Textarea
          value={form.chief_complaint}
          onChange={(e) => update("chief_complaint", e.target.value)}
          rows={3}
          placeholder="Describe the patient's main concern..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Diagnosis</Label>
        <Textarea
          value={form.diagnosis}
          onChange={(e) => update("diagnosis", e.target.value)}
          rows={2}
          placeholder="Diagnosis..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setVitalsOpen(!vitalsOpen)}
        >
          <motion.span
            animate={{ rotate: vitalsOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            &#9654;
          </motion.span>
          Vitals (optional)
        </button>
        {vitalsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Temperature (C)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => update("temperature", e.target.value)}
                placeholder="37.0"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Blood Pressure</Label>
              <Input
                value={form.blood_pressure}
                onChange={(e) => update("blood_pressure", e.target.value)}
                placeholder="120/80"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Heart Rate (bpm)</Label>
              <Input
                type="number"
                value={form.heart_rate}
                onChange={(e) => update("heart_rate", e.target.value)}
                placeholder="72"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => update("weight", e.target.value)}
                placeholder="70"
                className="h-9"
              />
            </div>
          </motion.div>
        )}
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
              Creating...
            </>
          ) : (
            "Create Visit"
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
  meta: PaginatedResponse<Visit>["meta"]
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <Stethoscope className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No visits recorded yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a new visit to begin documenting consultations.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        New Visit
      </Button>
    </motion.div>
  )
}

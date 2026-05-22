"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  Search,
  Plus,
  Eye,
  Edit,
  Printer,
  Pill,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  FileText,
} from "lucide-react"
import { prescriptionsApi, patientsApi } from "@/lib/api"
import { printPrescription } from "@/lib/print-prescription"
import { useAuthStore } from "@/stores/auth-store"
import type { Prescription, PrescriptionItem, Patient, PaginatedResponse } from "@/types"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CardGridSkeleton } from "@/components/ui/skeletons"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

interface PrescriptionFormItem {
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

const EMPTY_ITEM: PrescriptionFormItem = {
  medication_name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
}

const DOCTORS = [
  { value: "2", label: "Dr. Amina Tazi" },
  { value: "3", label: "Dr. Youssef El Idrissi" },
]

export default function PrescriptionsPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Prescription>["meta"] | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null)
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null)

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, search: search || undefined }
      if (statusFilter === "active") params.is_active = 1
      if (statusFilter === "inactive") params.is_active = 0
      const { data } = await prescriptionsApi.list(params)
      setPrescriptions(data.data)
      setMeta(data.meta)
    } catch {
      // empty state shown
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [search, statusFilter])

  function openCreate() {
    setEditingPrescription(null)
    setFormOpen(true)
  }

  function openEdit(prescription: Prescription) {
    setEditingPrescription(prescription)
    setFormOpen(true)
  }

  function openView(prescription: Prescription) {
    setViewingPrescription(prescription)
    setViewOpen(true)
  }

  function handleFormSuccess() {
    toast("Prescription saved successfully")
    setFormOpen(false)
    setEditingPrescription(null)
    fetchPrescriptions()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prescriptions"
        description="Manage patient prescriptions and medications"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Prescription
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : prescriptions.length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prescriptions.map((prescription, i) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Card className="h-full border-0 ring-1 ring-foreground/[0.06] shadow-sm transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {prescription.patient?.full_name ?? "Unknown Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prescription.doctor?.name
                            ? `Dr. ${prescription.doctor.name}`
                            : "Unknown Doctor"}{" "}
                          &middot; {format(parseISO(prescription.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant={prescription.is_active ? "default" : "outline"}>
                        {prescription.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {prescription.items && prescription.items.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {prescription.items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs"
                          >
                            <Pill className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <span className="font-medium">{item.medication_name}</span>
                              <span className="text-muted-foreground">
                                {" "}&mdash; {item.dosage}, {item.frequency}, {item.duration}
                              </span>
                            </div>
                          </div>
                        ))}
                        {prescription.items.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{prescription.items.length - 3} more medication
                            {prescription.items.length - 3 > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No medications listed</p>
                    )}
                    {prescription.notes && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {prescription.notes}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" size="sm" onClick={() => openView(prescription)}>
                      <Eye className="size-3.5" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(prescription)}>
                      <Edit className="size-3.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => printPrescription(prescription, user?.employee?.clinic?.name)}>
                      <Printer className="size-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>

          {meta && meta.last_page > 1 && (
            <Pagination meta={meta} page={page} onPageChange={setPage} />
          )}
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrescription ? "Edit Prescription" : "New Prescription"}
            </DialogTitle>
            <DialogDescription>
              {editingPrescription
                ? "Update the prescription details below."
                : "Fill in the details to create a new prescription."}
            </DialogDescription>
          </DialogHeader>
          <PrescriptionForm
            prescription={editingPrescription}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              {viewingPrescription?.patient?.full_name ?? "Patient"} &mdash;{" "}
              {viewingPrescription
                ? format(parseISO(viewingPrescription.created_at), "MMM d, yyyy")
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewingPrescription && <PrescriptionDetails prescription={viewingPrescription} />}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PrescriptionDetails({ prescription }: { prescription: Prescription }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Patient</span>
          <p className="font-medium">{prescription.patient?.full_name ?? "Unknown"}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Doctor</span>
          <p className="font-medium">
            {prescription.doctor?.name ? `Dr. ${prescription.doctor.name}` : "Unknown"}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Date</span>
          <p>{format(parseISO(prescription.created_at), "MMM d, yyyy")}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <div className="mt-0.5">
            <Badge variant={prescription.is_active ? "default" : "outline"}>
              {prescription.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      {prescription.notes && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <p className="mt-0.5 text-sm">{prescription.notes}</p>
        </div>
      )}

      <Separator />

      <div>
        <h4 className="mb-2 text-sm font-medium">Medications</h4>
        {prescription.items && prescription.items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {prescription.items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border bg-muted/30 p-3"
              >
                <p className="font-medium text-sm">{item.medication_name}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Dosage: {item.dosage}</span>
                  <span>Frequency: {item.frequency}</span>
                  <span>Duration: {item.duration}</span>
                </div>
                {item.instructions && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Instructions: {item.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No medications listed.</p>
        )}
      </div>
    </div>
  )
}

function PrescriptionForm({
  prescription,
  onSuccess,
  onCancel,
}: {
  prescription: Prescription | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!prescription

  const [patientId, setPatientId] = useState<number | null>(prescription?.patient?.id ?? null)
  const [patientSearch, setPatientSearch] = useState(prescription?.patient?.full_name ?? "")
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientDropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [doctorId, setDoctorId] = useState(
    prescription?.doctor?.id?.toString() ?? ""
  )
  const [visitId, setVisitId] = useState(prescription?.visit_id?.toString() ?? "")
  const [notes, setNotes] = useState(prescription?.notes ?? "")
  const [items, setItems] = useState<PrescriptionFormItem[]>(
    prescription?.items?.map((it) => ({
      medication_name: it.medication_name,
      dosage: it.dosage,
      frequency: it.frequency,
      duration: it.duration,
      instructions: it.instructions ?? "",
    })) ?? [{ ...EMPTY_ITEM }]
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handlePatientSearch(query: string) {
    setPatientSearch(query)
    setPatientId(null)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.trim().length < 2) {
      setPatientResults([])
      setShowPatientDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
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
    setPatientId(patient.id)
    setPatientSearch(patient.full_name)
    setShowPatientDropdown(false)
    setPatientResults([])
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof PrescriptionFormItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!patientId) {
      setError("Please select a patient.")
      return
    }
    if (!doctorId) {
      setError("Please select a doctor.")
      return
    }
    if (items.some((it) => !it.medication_name.trim())) {
      setError("Each medication must have a name.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        patient_id: patientId,
        doctor_id: Number(doctorId),
        visit_id: visitId ? Number(visitId) : undefined,
        notes: notes || undefined,
        items: items.map((it) => ({
          medication_name: it.medication_name,
          dosage: it.dosage,
          frequency: it.frequency,
          duration: it.duration,
          instructions: it.instructions || undefined,
        })),
      }

      if (isEdit) {
        await prescriptionsApi.update(prescription.id, payload)
      } else {
        await prescriptionsApi.create(payload)
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
        <div className="relative flex flex-col gap-1.5" ref={patientDropdownRef}>
          <Label htmlFor="patient_search">Patient *</Label>
          <Input
            id="patient_search"
            placeholder="Type to search patients..."
            value={patientSearch}
            onChange={(e) => handlePatientSearch(e.target.value)}
            onFocus={() => patientResults.length > 0 && setShowPatientDropdown(true)}
            className="h-9"
            autoComplete="off"
          />
          {patientId && (
            <span className="text-xs text-green-600">Patient selected</span>
          )}
          {showPatientDropdown && patientResults.length > 0 && (
            <div className="absolute top-[calc(100%+2px)] left-0 z-50 w-full rounded-lg border bg-popover shadow-md">
              {patientResults.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => selectPatient(p)}
                >
                  <span className="font-medium">{p.full_name}</span>
                  <span className="text-xs text-muted-foreground">{p.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Doctor *</Label>
          <Select value={doctorId} onValueChange={(v) => setDoctorId(v ?? "")}>
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
          <Label htmlFor="visit_id">Visit ID</Label>
          <Input
            id="visit_id"
            type="number"
            placeholder="Optional"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="prescription_notes">Notes</Label>
        <Textarea
          id="prescription_notes"
          placeholder="Additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Medications</h4>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3.5" />
            Add Medication
          </Button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="relative rounded-lg border bg-muted/20 p-3"
          >
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-2 right-2"
                onClick={() => removeItem(index)}
              >
                <X className="size-3" />
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 flex flex-col gap-1">
                <Label className="text-xs">Medication Name *</Label>
                <Input
                  placeholder="e.g. Amoxicillin"
                  value={item.medication_name}
                  onChange={(e) => updateItem(index, "medication_name", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Dosage</Label>
                <Input
                  placeholder="e.g. 500mg"
                  value={item.dosage}
                  onChange={(e) => updateItem(index, "dosage", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Frequency</Label>
                <Input
                  placeholder="e.g. 3x/day"
                  value={item.frequency}
                  onChange={(e) => updateItem(index, "frequency", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Duration</Label>
                <Input
                  placeholder="e.g. 7 days"
                  value={item.duration}
                  onChange={(e) => updateItem(index, "duration", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1 sm:col-span-3">
                <Label className="text-xs">Instructions</Label>
                <Input
                  placeholder="e.g. Take after meals"
                  value={item.instructions}
                  onChange={(e) => updateItem(index, "instructions", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Prescription"
          ) : (
            "Create Prescription"
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
  meta: PaginatedResponse<Prescription>["meta"]
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
        Showing {(page - 1) * meta.per_page + 1}
        &ndash;{Math.min(page * meta.per_page, meta.total)} of {meta.total}
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
        <FileText className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {search ? "No prescriptions found" : "No prescriptions yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try adjusting your search query."
            : "Get started by creating your first prescription."}
        </p>
      </div>
      {!search && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          New Prescription
        </Button>
      )}
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  X,
  FileText,
  DollarSign,
  Clock,
  Ban,
  Edit2,
} from "lucide-react"
import { insuranceClaimsApi, patientsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { TableSkeleton } from "@/components/ui/skeletons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { useI18n } from "@/lib/i18n"

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface InsuranceClaim {
  id: number
  patient_id: number
  patient_name: string
  insurance_provider: string
  policy_number: string
  claim_amount: number
  diagnosis_code: string
  treatment_description: string
  status: ClaimStatus
  submission_date: string
  notes: string
  created_at: string
}

interface ClaimsMeta {
  total: number
  page: number
  limit: number
  last_page: number
  per_page: number
}

interface Patient {
  id: number
  first_name: string
  last_name: string
}

const STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "denied",
  "paid",
] as const

type ClaimStatus = (typeof STATUSES)[number]

const STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  denied: "Denied",
  paid: "Paid",
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  submitted:
    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  under_review:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  approved:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  denied:
    "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  paid:
    "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400",
}

function formatMAD(amount: number): string {
  return (
    new Intl.NumberFormat("en-MA", {
      style: "decimal",
      minimumFractionDigits: 2,
    }).format(amount) + " MAD"
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InsuranceClaimsPage() {
  const { toast } = useToast()
  const { t } = useI18n()

  // Data
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [meta, setMeta] = useState<ClaimsMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{
    total_claims: number
    pending_amount: number
    approved_amount: number
    denied_count: number
  }>({ total_claims: 0, pending_amount: 0, approved_amount: 0, denied_count: 0 })

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingClaim, setDeletingClaim] = useState<InsuranceClaim | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingClaim, setEditingClaim] = useState<InsuranceClaim | null>(null)

  // ---------- Fetch ----------

  const fetchClaims = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page }
      if (search) params.search = search
      if (statusFilter !== "all") params.status = statusFilter
      const { data } = await insuranceClaimsApi.list(params)
      setClaims(data.data ?? [])
      setMeta({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 15,
        last_page: Math.ceil((data.total ?? 0) / (data.limit ?? 15)),
        per_page: data.limit ?? 15,
      })
    } catch {
      toast("Failed to load claims", "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await insuranceClaimsApi.summary()
      setSummary({
        total_claims: data.total_claims ?? 0,
        pending_amount: data.pending_amount ?? 0,
        approved_amount: data.approved_amount ?? 0,
        denied_count: data.denied_count ?? 0,
      })
    } catch {
      // summary is non-critical
    }
  }, [])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  // Debounce search / filter reset
  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [search, statusFilter])

  // ---------- Handlers ----------

  function openCreate() {
    setEditingClaim(null)
    setFormOpen(true)
  }

  function openDelete(claim: InsuranceClaim) {
    setDeletingClaim(claim)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deletingClaim) return
    setDeleting(true)
    try {
      await insuranceClaimsApi.delete(deletingClaim.id)
      setDeleteOpen(false)
      setDeletingClaim(null)
      fetchClaims()
      fetchSummary()
      toast("Claim deleted successfully")
    } catch {
      toast("Failed to delete claim", "error")
    } finally {
      setDeleting(false)
    }
  }

  async function handleStatusChange(claim: InsuranceClaim, newStatus: string) {
    if (!newStatus || newStatus === claim.status) return
    try {
      await insuranceClaimsApi.update(claim.id, { status: newStatus })
      toast("Claim status updated")
      fetchClaims()
      fetchSummary()
    } catch {
      toast("Failed to update status", "error")
    }
  }

  function handleFormSuccess() {
    toast(editingClaim ? "Claim updated successfully" : "Claim created successfully")
    setFormOpen(false)
    setEditingClaim(null)
    fetchClaims()
    fetchSummary()
  }

  const hasFilters = !!search || statusFilter !== "all"

  // ---------- Summary cards data ----------

  const summaryCards = [
    {
      label: "Total Claims",
      value: summary.total_claims.toString(),
      icon: FileText,
      gradient: "from-blue-500/10 to-indigo-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Amount",
      value: formatMAD(summary.pending_amount),
      icon: Clock,
      gradient: "from-yellow-500/10 to-amber-500/10",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Approved Amount",
      value: formatMAD(summary.approved_amount),
      icon: DollarSign,
      gradient: "from-emerald-500/10 to-green-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Denied Claims",
      value: summary.denied_count.toString(),
      icon: Ban,
      gradient: "from-red-500/10 to-rose-500/10",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ]

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insurance Claims"
        description="Manage insurance claims and track reimbursements"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New Claim
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-xl border-0 px-5 py-4 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
            >
              <div
                className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient}`}
              >
                <Icon className={`size-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={7} />
      ) : claims.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onCreate={openCreate} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Insurance Provider</TableHead>
                  <TableHead className="hidden md:table-cell">Policy Number</TableHead>
                  <TableHead className="text-right">Claim Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Submission Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim, i) => (
                  <motion.tr
                    key={claim.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {claim.patient_name || "---"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {claim.insurance_provider || "---"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell font-mono text-xs">
                      {claim.policy_number || "---"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMAD(Number(claim.claim_amount))}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={claim.status}
                        onValueChange={(v) => v && handleStatusChange(claim, v)}
                      >
                        <SelectTrigger className="h-7 w-36 border-0 bg-transparent p-0 shadow-none">
                          <StatusBadge status={claim.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {claim.submission_date
                        ? new Date(claim.submission_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingClaim(claim)
                            setFormOpen(true)
                          }}
                        >
                          <Edit2 className="size-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDelete(claim)}
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

          {meta && meta.last_page > 1 && (
            <Pagination meta={meta} page={page} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Create / Edit Claim Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClaim ? "Edit Claim" : "New Insurance Claim"}
            </DialogTitle>
            <DialogDescription>
              {editingClaim
                ? "Update the claim details below."
                : "Fill in the details to submit a new insurance claim."}
            </DialogDescription>
          </DialogHeader>
          <ClaimForm
            claim={editingClaim}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setFormOpen(false)
              setEditingClaim(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Claim</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this claim
              {deletingClaim?.patient_name && (
                <>
                  {" "}
                  for{" "}
                  <span className="font-medium text-foreground">
                    {deletingClaim.patient_name}
                  </span>
                </>
              )}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClaimForm
// ---------------------------------------------------------------------------

function ClaimForm({
  claim,
  onSuccess,
  onCancel,
}: {
  claim: InsuranceClaim | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)

  // Form fields
  const [patientId, setPatientId] = useState<string>(
    claim?.patient_id?.toString() ?? ""
  )
  const [insuranceProvider, setInsuranceProvider] = useState(
    claim?.insurance_provider ?? ""
  )
  const [policyNumber, setPolicyNumber] = useState(claim?.policy_number ?? "")
  const [claimAmount, setClaimAmount] = useState(
    claim?.claim_amount?.toString() ?? ""
  )
  const [diagnosisCode, setDiagnosisCode] = useState(
    claim?.diagnosis_code ?? ""
  )
  const [treatmentDescription, setTreatmentDescription] = useState(
    claim?.treatment_description ?? ""
  )
  const [submissionDate, setSubmissionDate] = useState(
    claim?.submission_date?.split("T")[0] ??
      new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState(claim?.notes ?? "")
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadPatients() {
      setLoadingPatients(true)
      try {
        const { data } = await patientsApi.list({ limit: 1000 })
        setPatients(data.data ?? data ?? [])
      } catch {
        toast("Failed to load patients", "error")
      } finally {
        setLoadingPatients(false)
      }
    }
    loadPatients()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!patientId) {
      setError("Please select a patient.")
      return
    }
    if (!insuranceProvider.trim()) {
      setError("Please enter an insurance provider.")
      return
    }
    if (!policyNumber.trim()) {
      setError("Please enter a policy number.")
      return
    }
    if (!claimAmount || Number(claimAmount) <= 0) {
      setError("Please enter a valid claim amount.")
      return
    }
    if (!submissionDate) {
      setError("Please select a submission date.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        patient_id: Number(patientId),
        insurance_provider: insuranceProvider.trim(),
        policy_number: policyNumber.trim(),
        claim_amount: Number(claimAmount),
        diagnosis_code: diagnosisCode.trim() || undefined,
        treatment_description: treatmentDescription.trim() || undefined,
        submission_date: submissionDate,
        notes: notes.trim() || undefined,
      }

      if (claim) {
        await insuranceClaimsApi.update(claim.id, payload)
      } else {
        await insuranceClaimsApi.create(payload)
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
      setSaving(false)
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
        {/* Patient */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Patient *</Label>
          {loadingPatients ? (
            <div className="flex h-9 items-center text-sm text-muted-foreground">
              Loading patients...
            </div>
          ) : (
            <Select
              value={patientId}
              onValueChange={(v) => v && setPatientId(v)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Insurance Provider */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_provider">Insurance Provider *</Label>
          <Input
            id="insurance_provider"
            placeholder="e.g. CNSS, CNOPS, Saham..."
            value={insuranceProvider}
            onChange={(e) => setInsuranceProvider(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Policy Number */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="policy_number">Policy Number *</Label>
          <Input
            id="policy_number"
            placeholder="POL-000000"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Claim Amount */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim_amount">Claim Amount (MAD) *</Label>
          <div className="relative">
            <Input
              id="claim_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              className="h-9 pr-14"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              MAD
            </span>
          </div>
        </div>

        {/* Diagnosis Code */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diagnosis_code">Diagnosis Code</Label>
          <Input
            id="diagnosis_code"
            placeholder="e.g. ICD-10 code"
            value={diagnosisCode}
            onChange={(e) => setDiagnosisCode(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Submission Date */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="submission_date">Submission Date *</Label>
          <Input
            id="submission_date"
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Treatment Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="treatment_description">Treatment Description</Label>
        <Textarea
          id="treatment_description"
          placeholder="Describe the treatment provided..."
          value={treatmentDescription}
          onChange={(e) => setTreatmentDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="claim_notes">Notes</Label>
        <Textarea
          id="claim_notes"
          placeholder="Additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {claim ? "Updating..." : "Creating..."}
            </>
          ) : claim ? (
            "Update Claim"
          ) : (
            "Create Claim"
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status as ClaimStatus] ??
    "bg-muted text-muted-foreground border-muted"

  return (
    <Badge className={`border ${color}`}>
      {STATUS_LABELS[status as ClaimStatus] ??
        status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta: ClaimsMeta
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

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean
  onCreate: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-teal-500/10">
        <ShieldCheck className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {hasFilters ? "No claims found" : "No insurance claims"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters or search query."
            : "Get started by submitting your first insurance claim."}
        </p>
      </div>
      {!hasFilters && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          New Claim
        </Button>
      )}
    </motion.div>
  )
}

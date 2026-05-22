"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  Search,
  Plus,
  Edit,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  X,
} from "lucide-react"
import { paymentsApi, patientsApi } from "@/lib/api"
import type { Payment, Patient, PaginatedResponse } from "@/types"
import {
  paymentStatusConfig,
  paymentTypeLabels,
  paymentMethodLabels,
  statusColorMap,
  paymentTypes,
  paymentMethods,
} from "@/lib/constants"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

export default function PaymentsPage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Payment>["meta"] | null>(null)
  const [page, setPage] = useState(1)
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [markingPaid, setMarkingPaid] = useState<number | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page }
      if (dateFilter) params.date = dateFilter
      if (statusFilter !== "all") params.status = statusFilter
      if (typeFilter !== "all") params.payment_type = typeFilter
      const { data } = await paymentsApi.list(params)
      setPayments(data.data)
      setMeta(data.meta)
    } catch {
      // empty state shown
    } finally {
      setLoading(false)
    }
  }, [page, dateFilter, statusFilter, typeFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [dateFilter, statusFilter, typeFilter])

  function openCreate() {
    setEditingPayment(null)
    setFormOpen(true)
  }

  function openEdit(payment: Payment) {
    setEditingPayment(payment)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    toast("Payment saved successfully")
    setFormOpen(false)
    setEditingPayment(null)
    fetchPayments()
  }

  async function handleMarkAsPaid(id: number) {
    setMarkingPaid(id)
    try {
      await paymentsApi.markAsPaid(id)
      fetchPayments()
      toast("Payment marked as paid")
    } catch {
      toast("Failed to mark as paid", "error")
    } finally {
      setMarkingPaid(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Track and manage patient payments"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Record Payment
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 w-44"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {paymentTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {paymentTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(dateFilter || statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFilter("")
              setStatusFilter("all")
              setTypeFilter("all")
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : payments.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Paid At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, i) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(payment.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.patient?.full_name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {payment.amount.toLocaleString()} MAD
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {paymentTypeLabels[payment.payment_type] ?? payment.payment_type}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {paymentMethodLabels[payment.payment_method] ?? payment.payment_method}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={paymentStatusConfig[payment.status]?.variant ?? "outline"}
                        className={statusColorMap[payment.status] ?? ""}
                      >
                        {paymentStatusConfig[payment.status]?.label ?? payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {payment.paid_at
                        ? format(parseISO(payment.paid_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {payment.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={markingPaid === payment.id}
                            onClick={() => handleMarkAsPaid(payment.id)}
                          >
                            {markingPaid === payment.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3.5" />
                            )}
                            <span className="hidden sm:inline">Pay</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(payment)}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? "Edit Payment" : "Record Payment"}
            </DialogTitle>
            <DialogDescription>
              {editingPayment
                ? "Update the payment details below."
                : "Fill in the details to record a new payment."}
            </DialogDescription>
          </DialogHeader>
          <PaymentForm
            payment={editingPayment}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PaymentForm({
  payment,
  onSuccess,
  onCancel,
}: {
  payment: Payment | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!payment

  const [patientId, setPatientId] = useState<number | null>(payment?.patient?.id ?? null)
  const [patientSearch, setPatientSearch] = useState(payment?.patient?.full_name ?? "")
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientDropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [visitId, setVisitId] = useState(payment?.visit_id?.toString() ?? "")
  const [amount, setAmount] = useState(payment?.amount?.toString() ?? "")
  const [paymentType, setPaymentType] = useState(payment?.payment_type ?? "")
  const [paymentMethod, setPaymentMethod] = useState(payment?.payment_method ?? "")
  const [status, setStatus] = useState(payment?.status ?? "pending")
  const [description, setDescription] = useState(payment?.description ?? "")

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!patientId) {
      setError("Please select a patient.")
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.")
      return
    }
    if (!paymentType) {
      setError("Please select a payment type.")
      return
    }
    if (!paymentMethod) {
      setError("Please select a payment method.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        patient_id: patientId,
        visit_id: visitId ? Number(visitId) : undefined,
        amount: Number(amount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        status,
        description: description || undefined,
      }

      if (isEdit) {
        await paymentsApi.update(payment.id, payload)
      } else {
        await paymentsApi.create(payload)
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

      <div className="relative flex flex-col gap-1.5" ref={patientDropdownRef}>
        <Label htmlFor="payment_patient_search">Patient *</Label>
        <Input
          id="payment_patient_search"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="visit_id_payment">Visit ID</Label>
          <Input
            id="visit_id_payment"
            type="number"
            placeholder="Optional"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount (MAD) *</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 pr-14"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              MAD
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Payment Type *</Label>
          <Select value={paymentType} onValueChange={(v) => setPaymentType(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {paymentTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {paymentTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Payment Method *</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m} value={m}>
                  {paymentMethodLabels[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "pending")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment_description">Description</Label>
        <Textarea
          id="payment_description"
          placeholder="Additional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
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
              {isEdit ? "Updating..." : "Recording..."}
            </>
          ) : isEdit ? (
            "Update Payment"
          ) : (
            "Record Payment"
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
  meta: PaginatedResponse<Payment>["meta"]
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <CreditCard className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No payments recorded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by recording your first payment.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        Record Payment
      </Button>
    </motion.div>
  )
}

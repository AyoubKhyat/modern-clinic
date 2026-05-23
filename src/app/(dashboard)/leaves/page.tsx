"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { format, parseISO, differenceInCalendarDays, isAfter, startOfMonth, endOfMonth } from "date-fns"
import {
  CalendarOff,
  Check,
  X,
  Plus,
  Clock,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { leavesApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableSkeleton } from "@/components/ui/skeletons"
import { Textarea } from "@/components/ui/textarea"
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

/* ── Types ── */

interface LeaveRecord {
  id: number
  user_id: number
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "rejected"
  approved_by: number | null
  created_at: string
}

const LEAVE_TYPES = ["annual", "sick", "personal", "maternity", "unpaid"] as const

const leaveTypeLabels: Record<string, string> = {
  annual: "Annual",
  sick: "Sick",
  personal: "Personal",
  maternity: "Maternity",
  unpaid: "Unpaid",
}

const leaveTypeBadgeColors: Record<string, string> = {
  annual: "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
  sick: "bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400",
  personal: "bg-purple-500/10 text-purple-700 border border-purple-500/20 dark:text-purple-400",
  maternity: "bg-pink-500/10 text-pink-700 border border-pink-500/20 dark:text-pink-400",
  unpaid: "bg-gray-500/10 text-gray-700 border border-gray-500/20 dark:text-gray-400",
}

const statusBadgeColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20 dark:text-yellow-400",
  approved: "bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400",
  rejected: "bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400",
}

function calcDays(start: string, end: string): number {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
}

/* ── Main Page ── */

export default function LeavesPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === "admin"

  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const [formOpen, setFormOpen] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, limit }
      if (statusFilter !== "all") params.status = statusFilter
      if (typeFilter !== "all") params.leave_type = typeFilter
      const { data } = await leavesApi.list(params)
      setLeaves(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setLeaves([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, typeFilter])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [statusFilter, typeFilter])

  async function handleApprove(id: number) {
    setApprovingId(id)
    try {
      await leavesApi.approve(id, "approved")
      toast("Leave request approved")
      fetchLeaves()
    } catch {
      toast("Failed to approve leave", "error")
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject(id: number) {
    setRejectingId(id)
    try {
      await leavesApi.approve(id, "rejected")
      toast("Leave request rejected")
      fetchLeaves()
    } catch {
      toast("Failed to reject leave", "error")
    } finally {
      setRejectingId(null)
    }
  }

  function handleFormSuccess() {
    toast("Leave request submitted successfully")
    setFormOpen(false)
    fetchLeaves()
  }

  /* ── Summary stats ── */

  const pendingCount = useMemo(
    () => leaves.filter((l) => l.status === "pending").length,
    [leaves]
  )

  const approvedThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    return leaves.filter(
      (l) =>
        l.status === "approved" &&
        isAfter(parseISO(l.start_date), monthStart) &&
        !isAfter(parseISO(l.start_date), monthEnd)
    ).length
  }, [leaves])

  const totalLeaveDays = useMemo(
    () =>
      leaves
        .filter((l) => l.status === "approved")
        .reduce((sum, l) => sum + calcDays(l.start_date, l.end_date), 0),
    [leaves]
  )

  const summaryCards = [
    {
      title: "Pending Requests",
      value: pendingCount,
      icon: Clock,
      gradient: "from-amber-500/10 to-yellow-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Approved This Month",
      value: approvedThisMonth,
      icon: CalendarCheck,
      gradient: "from-green-500/10 to-emerald-500/10",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Total Leave Days",
      value: totalLeaveDays,
      icon: CalendarDays,
      gradient: "from-teal-500/10 to-blue-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
  ]

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Management"
        description="Manage staff leave requests"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Request Leave
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Leave Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LEAVE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {leaveTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all")
              setTypeFilter("all")
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
                <CardHeader className="flex flex-row items-center justify-between pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient}`}
                  >
                    <Icon className={`size-4 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={8} />
      ) : leaves.length === 0 ? (
        <EmptyState onCreate={() => setFormOpen(true)} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave, i) => (
                  <motion.tr
                    key={leave.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {leave.employee_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={leaveTypeBadgeColors[leave.leave_type] ?? ""}>
                        {leaveTypeLabels[leave.leave_type] ?? leave.leave_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(leave.start_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(leave.end_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {calcDays(leave.start_date, leave.end_date)}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                      {leave.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeColors[leave.status] ?? ""}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && leave.status === "pending" ? (
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={approvingId === leave.id}
                            onClick={() => handleApprove(leave.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:text-green-400"
                          >
                            {approvingId === leave.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={rejectingId === leave.id}
                            onClick={() => handleReject(leave.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400"
                          >
                            {rejectingId === leave.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <X className="size-3.5" />
                            )}
                            <span className="hidden sm:inline">Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}
                &ndash;{Math.min(page * limit, total)} of {total}
              </p>
              <div className="inline-flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)
                  )
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev !== undefined && p - prev > 1
                    return (
                      <span key={p} className="inline-flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={p === page ? "default" : "outline"}
                          size="icon-sm"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      </span>
                    )
                  })}
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Request Leave Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Fill in the details to submit a leave request.
            </DialogDescription>
          </DialogHeader>
          <LeaveRequestForm
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Leave Request Form ── */

function LeaveRequestForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const [leaveType, setLeaveType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const days =
    startDate && endDate
      ? Math.max(calcDays(startDate, endDate), 0)
      : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!leaveType) {
      setError("Please select a leave type.")
      return
    }
    if (!startDate) {
      setError("Please select a start date.")
      return
    }
    if (!endDate) {
      setError("Please select an end date.")
      return
    }
    if (endDate < startDate) {
      setError("End date must be on or after start date.")
      return
    }

    setLoading(true)
    try {
      await leavesApi.create({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      })
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

      {/* Leave Type */}
      <div className="flex flex-col gap-1.5">
        <Label>Leave Type *</Label>
        <Select value={leaveType} onValueChange={(v) => setLeaveType(v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {LEAVE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {leaveTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave_start_date">Start Date *</Label>
          <Input
            id="leave_start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave_end_date">End Date *</Label>
          <Input
            id="leave_end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
            className="h-9"
          />
        </div>
      </div>

      {/* Days Preview */}
      {days > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium text-muted-foreground">Total Days</span>
          <span className="text-lg font-bold tabular-nums">{days}</span>
        </div>
      )}

      {/* Reason */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leave_reason">Reason</Label>
        <Textarea
          id="leave_reason"
          placeholder="Reason for leave request..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </Button>
      </div>
    </form>
  )
}

/* ── Empty State ── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <CalendarOff className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No leave requests found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by submitting your first leave request.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        Request Leave
      </Button>
    </motion.div>
  )
}

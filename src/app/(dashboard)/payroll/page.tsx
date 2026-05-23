"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Wallet,
  Plus,
  CheckCircle,
  Loader2,
  DollarSign,
  Users,
  Edit,
} from "lucide-react"
import { payrollApi } from "@/lib/api"
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

const EMPLOYEES = [
  { value: "1", label: "Dr. Admin" },
  { value: "2", label: "Dr. Sarah Chen" },
  { value: "3", label: "Fatima Zahra" },
  { value: "4", label: "Karim Bennani" },
]

interface PayrollRecord {
  id: number
  employee_id: number
  employee_name: string
  employee_role: string
  month: string
  base_salary: number
  bonus: number
  deductions: number
  net_salary: number
  status: "paid" | "pending"
  notes?: string
}

export default function PayrollPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null)
  const [markingPaid, setMarkingPaid] = useState<number | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (monthFilter) params.month = monthFilter
      const { data } = await payrollApi.list(params)
      setRecords(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [monthFilter])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  function openCreate() {
    setEditingRecord(null)
    setFormOpen(true)
  }

  function openEdit(record: PayrollRecord) {
    setEditingRecord(record)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    toast(editingRecord ? "Payslip updated successfully" : "Payslip created successfully")
    setFormOpen(false)
    setEditingRecord(null)
    fetchRecords()
  }

  async function handleMarkAsPaid(id: number) {
    setMarkingPaid(id)
    try {
      await payrollApi.markPaid(id)
      toast("Marked as paid")
      fetchRecords()
    } catch {
      toast("Failed to mark as paid", "error")
    } finally {
      setMarkingPaid(null)
    }
  }

  const totalPayroll = records.reduce((sum, r) => sum + r.net_salary, 0)
  const totalPaid = records
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.net_salary, 0)
  const totalPending = records
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.net_salary, 0)

  const summaryCards = [
    {
      title: "Total Payroll",
      value: totalPayroll,
      icon: Wallet,
      gradient: "from-teal-500/10 to-blue-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      title: "Total Paid",
      value: totalPaid,
      icon: DollarSign,
      gradient: "from-green-500/10 to-emerald-500/10",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Total Pending",
      value: totalPending,
      icon: Users,
      gradient: "from-amber-500/10 to-yellow-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        description="Employee salary management"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Create Payslip
          </Button>
        }
      />

      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <Label htmlFor="month-filter" className="text-sm font-medium">
          Month
        </Label>
        <Input
          id="month-filter"
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="h-9 w-48"
        />
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
              <Card className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
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
                  <p className="text-2xl font-bold tabular-nums">
                    {card.value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MAD</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={6} />
      ) : records.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right hidden md:table-cell">Bonus</TableHead>
                <TableHead className="text-right hidden md:table-cell">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, i) => (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{record.employee_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {record.employee_role}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.month}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {record.base_salary.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {record.bonus.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {record.deductions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {record.net_salary.toLocaleString()} MAD
                  </TableCell>
                  <TableCell>
                    {record.status === "paid" ? (
                      <Badge className="bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400">
                        Paid
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/10 text-yellow-700 border border-yellow-500/20 dark:text-yellow-400">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {record.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={markingPaid === record.id}
                          onClick={() => handleMarkAsPaid(record.id)}
                        >
                          {markingPaid === record.id ? (
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
                        onClick={() => openEdit(record)}
                        title="Edit payslip"
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
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Edit Payslip" : "Create Payslip"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord
                ? "Update the payslip details below."
                : "Fill in the details to create a new payslip."}
            </DialogDescription>
          </DialogHeader>
          <PayslipForm
            record={editingRecord}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Payslip Form ── */

function PayslipForm({
  record,
  onSuccess,
  onCancel,
}: {
  record: PayrollRecord | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!record

  const [employeeId, setEmployeeId] = useState(record?.employee_id?.toString() ?? "")
  const [month, setMonth] = useState(
    record?.month ??
      (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      })()
  )
  const [baseSalary, setBaseSalary] = useState(record?.base_salary?.toString() ?? "")
  const [bonus, setBonus] = useState(record?.bonus?.toString() ?? "0")
  const [deductions, setDeductions] = useState(record?.deductions?.toString() ?? "0")
  const [notes, setNotes] = useState(record?.notes ?? "")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const computedNet =
    (Number(baseSalary) || 0) + (Number(bonus) || 0) - (Number(deductions) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!employeeId) {
      setError("Please select an employee.")
      return
    }
    if (!month) {
      setError("Please select a month.")
      return
    }
    if (!baseSalary || Number(baseSalary) <= 0) {
      setError("Please enter a valid base salary.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        employee_id: Number(employeeId),
        month,
        base_salary: Number(baseSalary),
        bonus: Number(bonus) || 0,
        deductions: Number(deductions) || 0,
        notes: notes || undefined,
      }

      if (isEdit) {
        await payrollApi.update(record.id, payload)
      } else {
        await payrollApi.create(payload)
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

      {/* Employee Select */}
      <div className="flex flex-col gap-1.5">
        <Label>Employee *</Label>
        <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYEES.map((emp) => (
              <SelectItem key={emp.value} value={emp.value}>
                {emp.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Month */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payslip_month">Month *</Label>
          <Input
            id="payslip_month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Base Salary */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payslip_base">Base Salary (MAD) *</Label>
          <div className="relative">
            <Input
              id="payslip_base"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="h-9 pr-14"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              MAD
            </span>
          </div>
        </div>

        {/* Bonus */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payslip_bonus">Bonus (MAD)</Label>
          <Input
            id="payslip_bonus"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Deductions */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payslip_deductions">Deductions (MAD)</Label>
          <Input
            id="payslip_deductions"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={deductions}
            onChange={(e) => setDeductions(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Computed Net */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
        <span className="text-sm font-medium text-muted-foreground">Net Salary</span>
        <span className="text-lg font-bold tabular-nums">
          {computedNet.toLocaleString()} MAD
        </span>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payslip_notes">Notes</Label>
        <Textarea
          id="payslip_notes"
          placeholder="Additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Payslip"
          ) : (
            "Create Payslip"
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
        <Wallet className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No payroll records</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating your first payslip.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        Create Payslip
      </Button>
    </motion.div>
  )
}

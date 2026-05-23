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
  Receipt,
  X,
  DollarSign,
  Hash,
} from "lucide-react"
import { expensesApi } from "@/lib/api"
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

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Expense {
  id: number
  category: string
  amount: number
  description: string
  date: string
  created_by: number
  created_at: string
  creator_name: string
}

interface ExpenseMeta {
  total: number
  page: number
  limit: number
  last_page: number
  per_page: number
}

const CATEGORIES = [
  "rent",
  "utilities",
  "supplies",
  "salaries",
  "maintenance",
  "marketing",
  "other",
] as const

type Category = (typeof CATEGORIES)[number]

const CATEGORY_LABELS: Record<Category, string> = {
  rent: "Rent",
  utilities: "Utilities",
  supplies: "Supplies",
  salaries: "Salaries",
  maintenance: "Maintenance",
  marketing: "Marketing",
  other: "Other",
}

const CATEGORY_COLORS: Record<Category, string> = {
  rent: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  utilities: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  supplies: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  salaries: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  maintenance: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  marketing: "bg-pink-500/10 text-pink-700 border-pink-500/20 dark:text-pink-400",
  other: "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400",
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExpensesPage() {
  const { toast } = useToast()

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [meta, setMeta] = useState<ExpenseMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---------- Fetch ----------

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page }
      if (search) params.search = search
      if (categoryFilter !== "all") params.category = categoryFilter
      if (monthFilter) params.month = monthFilter
      const { data } = await expensesApi.list(params)
      setExpenses(data.data ?? [])
      setMeta({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 15,
        last_page: Math.ceil((data.total ?? 0) / (data.limit ?? 15)),
        per_page: data.limit ?? 15,
      })
    } catch {
      // empty state shown
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter, monthFilter])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Debounce search / filter reset
  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timeout)
  }, [search, categoryFilter, monthFilter])

  // ---------- Summary ----------

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const thisMonthExpenses = expenses.filter(
    (e) => e.date?.slice(0, 7) === (monthFilter || currentMonth)
  )
  const totalAmount = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalCount = thisMonthExpenses.length

  // ---------- Handlers ----------

  function openCreate() {
    setFormOpen(true)
  }

  function openDelete(expense: Expense) {
    setDeletingExpense(expense)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deletingExpense) return
    setDeleting(true)
    try {
      await expensesApi.delete(deletingExpense.id)
      setDeleteOpen(false)
      setDeletingExpense(null)
      fetchExpenses()
      toast("Expense deleted successfully")
    } catch {
      toast("Failed to delete expense", "error")
    } finally {
      setDeleting(false)
    }
  }

  function handleFormSuccess() {
    toast("Expense added successfully")
    setFormOpen(false)
    fetchExpenses()
  }

  const hasFilters = !!search || categoryFilter !== "all" || !!monthFilter

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        description="Track clinic expenditures"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Expense
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 rounded-xl border-0 px-5 py-4 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10">
            <DollarSign className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Total Expenses {monthFilter ? "" : "(This Month)"}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {totalAmount.toLocaleString("en-MA")} MAD
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex items-center gap-4 rounded-xl border-0 px-5 py-4 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
            <Hash className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Number of Expenses</p>
            <p className="text-2xl font-bold tabular-nums">{totalCount}</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value)
            setPage(1)
          }}
          className="h-9 w-44"
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setCategoryFilter("all")
              setMonthFilter("")
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={6} />
      ) : expenses.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onCreate={openCreate} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense, i) => (
                  <motion.tr
                    key={expense.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="text-muted-foreground">
                      {expense.date
                        ? new Date(expense.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={expense.category} />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {expense.description || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {Number(expense.amount).toLocaleString("en-MA")} MAD
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {expense.creator_name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDelete(expense)}
                      >
                        <Trash2 className="size-4 text-destructive" />
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

      {/* Add Expense Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Fill in the details to record a new expense.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense
              {deletingExpense?.description && (
                <>
                  {" "}
                  &mdash;{" "}
                  <span className="font-medium text-foreground">
                    {deletingExpense.description}
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
// ExpenseForm
// ---------------------------------------------------------------------------

function ExpenseForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!category) {
      setError("Please select a category.")
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.")
      return
    }
    if (!date) {
      setError("Please select a date.")
      return
    }

    setSaving(true)
    try {
      await expensesApi.create({
        category,
        amount: Number(amount),
        description: description || undefined,
        date,
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
        <div className="flex flex-col gap-1.5">
          <Label>Category *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense_amount">Amount (MAD) *</Label>
          <div className="relative">
            <Input
              id="expense_amount"
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

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="expense_date">Date *</Label>
          <Input
            id="expense_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense_description">Description</Label>
        <Textarea
          id="expense_description"
          placeholder="Additional details about this expense..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
              Adding...
            </>
          ) : (
            "Add Expense"
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// CategoryBadge
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category: string }) {
  const color =
    CATEGORY_COLORS[category as Category] ??
    "bg-muted text-muted-foreground border-muted"

  return (
    <Badge className={`border ${color}`}>
      {CATEGORY_LABELS[category as Category] ??
        category.charAt(0).toUpperCase() + category.slice(1)}
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
  meta: ExpenseMeta
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
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10">
        <Receipt className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {hasFilters ? "No expenses found" : "No expenses recorded"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters or search query."
            : "Get started by recording your first expense."}
        </p>
      </div>
      {!hasFilters && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Add Expense
        </Button>
      )}
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Trash2,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PiggyBank,
  Edit,
  DollarSign,
  Percent,
} from "lucide-react"
import { expenseBudgetsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Budget {
  id: number
  category: string
  month: string
  budget_amount: number
  notes: string
}

interface BudgetSummary {
  id: number
  category: string
  month: string
  budget_amount: number
  spent: number
  remaining: number
  percentage: number
}

const BUDGET_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Medical Supplies",
  "Equipment",
  "Marketing",
  "Insurance",
  "Maintenance",
  "Other",
] as const

type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

const CATEGORY_CHART_COLORS: Record<BudgetCategory, string> = {
  Rent: "#0d9488",
  Utilities: "#f59e0b",
  Salaries: "#8b5cf6",
  "Medical Supplies": "#10b981",
  Equipment: "#3b82f6",
  Marketing: "#ec4899",
  Insurance: "#6366f1",
  Maintenance: "#f97316",
  Other: "#6b7280",
}

const CATEGORY_BADGE_CLASSES: Record<BudgetCategory, string> = {
  Rent: "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400",
  Utilities: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  Salaries: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  "Medical Supplies": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  Equipment: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  Marketing: "bg-pink-500/10 text-pink-700 border-pink-500/20 dark:text-pink-400",
  Insurance: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-400",
  Maintenance: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  Other: "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400",
}

const cardGlass =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring" as const, stiffness: 300, damping: 24 },
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-MA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getStatusColor(percentage: number) {
  if (percentage > 90) return "red"
  if (percentage >= 70) return "yellow"
  return "green"
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BudgetingPage() {
  const { toast } = useToast()

  // Data state
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [summary, setSummary] = useState<BudgetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState<string>("")
  const [formMonth, setFormMonth] = useState(getCurrentMonth)
  const [formAmount, setFormAmount] = useState("")
  const [formNotes, setFormNotes] = useState("")

  // ---------- Fetch ----------

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [budgetsRes, summaryRes] = await Promise.all([
        expenseBudgetsApi.list({ month }),
        expenseBudgetsApi.summary(month),
      ])
      setBudgets(budgetsRes.data?.data ?? budgetsRes.data ?? [])
      setSummary(summaryRes.data?.data ?? summaryRes.data ?? [])
    } catch {
      toast("Failed to load budget data", "error")
    } finally {
      setLoading(false)
    }
  }, [month, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Computed ----------

  const totals = useMemo(() => {
    const totalBudget = summary.reduce((s, item) => s + Number(item.budget_amount), 0)
    const totalSpent = summary.reduce((s, item) => s + Number(item.spent), 0)
    const remaining = totalBudget - totalSpent
    const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
    return { totalBudget, totalSpent, remaining, percentUsed }
  }, [summary])

  const overspentCategories = useMemo(
    () => summary.filter((item) => Number(item.percentage) > 100),
    [summary]
  )

  const barChartData = useMemo(
    () =>
      summary.map((item) => ({
        category: item.category,
        Budget: Number(item.budget_amount),
        Spent: Number(item.spent),
      })),
    [summary]
  )

  // ---------- Handlers ----------

  function openCreate() {
    setEditingBudget(null)
    setFormCategory("")
    setFormMonth(month)
    setFormAmount("")
    setFormNotes("")
    setFormOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget)
    setFormCategory(budget.category)
    setFormMonth(budget.month)
    setFormAmount(String(budget.budget_amount))
    setFormNotes(budget.notes ?? "")
    setFormOpen(true)
  }

  function openDelete(budget: Budget) {
    setDeletingBudget(budget)
    setDeleteOpen(true)
  }

  async function handleSave() {
    if (!formCategory || !formMonth || !formAmount) {
      toast("Please fill in all required fields", "error")
      return
    }
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      toast("Please enter a valid budget amount", "error")
      return
    }
    setSaving(true)
    try {
      await expenseBudgetsApi.create({
        category: formCategory,
        month: formMonth,
        budget_amount: amount,
        notes: formNotes,
      })
      toast(editingBudget ? "Budget updated successfully" : "Budget created successfully")
      setFormOpen(false)
      fetchData()
    } catch {
      toast("Failed to save budget", "error")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deletingBudget) return
    setDeleting(true)
    try {
      await expenseBudgetsApi.delete(deletingBudget.id)
      toast("Budget deleted successfully")
      setDeleteOpen(false)
      setDeletingBudget(null)
      fetchData()
    } catch {
      toast("Failed to delete budget", "error")
    } finally {
      setDeleting(false)
    }
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expense Budgeting"
        description="Set monthly budgets and track spending by category"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Budget
          </Button>
        }
      />

      {/* Month Picker */}
      <div className="flex items-center gap-3">
        <Label htmlFor="month-picker" className="text-sm font-medium">
          Month
        </Label>
        <Input
          id="month-picker"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 w-48"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...fadeUp}>
          <Card className={cardGlass}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-600/20">
                <PiggyBank className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(totals.totalBudget)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <Card className={cardGlass}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/20">
                <DollarSign className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(totals.totalSpent)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
          <Card className={cardGlass}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/20">
                {totals.remaining >= 0 ? (
                  <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    totals.remaining < 0 ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  {formatCurrency(Math.abs(totals.remaining))}{" "}
                  <span className="text-sm font-normal text-muted-foreground">MAD</span>
                </p>
                {totals.remaining < 0 && (
                  <p className="text-xs text-red-500">Over budget</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
          <Card className={cardGlass}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${
                  totals.percentUsed > 90
                    ? "from-red-500/10 to-red-600/20"
                    : totals.percentUsed >= 70
                    ? "from-yellow-500/10 to-amber-500/20"
                    : "from-teal-500/10 to-teal-600/20"
                }`}
              >
                <Percent
                  className={`size-5 ${
                    totals.percentUsed > 90
                      ? "text-red-600 dark:text-red-400"
                      : totals.percentUsed >= 70
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-teal-600 dark:text-teal-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% Used</p>
                <p className="text-2xl font-bold tabular-nums">
                  {totals.percentUsed}%
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Overspend Alerts */}
      <AnimatePresence>
        {overspentCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 24 }}
          >
            <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="space-y-1">
                    <p className="font-semibold text-red-700 dark:text-red-400">
                      Overspend Alert
                    </p>
                    <ul className="space-y-0.5 text-sm text-red-600 dark:text-red-400/80">
                      {overspentCategories.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium">{item.category}</span> is at{" "}
                          {Math.round(Number(item.percentage))}% — overspent by{" "}
                          {formatCurrency(Math.abs(Number(item.remaining)))} MAD
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : summary.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <>
          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 24, delay: 0.1 }}
          >
            <Card className={cardGlass}>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold">Category Breakdown</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary.map((item, i) => {
                  const pct = Math.min(Number(item.percentage), 100)
                  const color = getStatusColor(Number(item.percentage))
                  const colorClasses = {
                    green: "bg-emerald-500",
                    yellow: "bg-yellow-500",
                    red: "bg-red-500",
                  }
                  const badgeClass =
                    CATEGORY_BADGE_CLASSES[item.category as BudgetCategory] ??
                    CATEGORY_BADGE_CLASSES.Other

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        type: "spring" as const,
                        stiffness: 300,
                        damping: 24,
                        delay: i * 0.04,
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={badgeClass}>
                            {item.category}
                          </Badge>
                          {Number(item.percentage) > 100 && (
                            <AlertTriangle className="size-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm tabular-nums">
                          <span className="text-muted-foreground">
                            {formatCurrency(Number(item.spent))} / {formatCurrency(Number(item.budget_amount))} MAD
                          </span>
                          <span
                            className={`font-semibold ${
                              color === "red"
                                ? "text-red-600 dark:text-red-400"
                                : color === "yellow"
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {Math.round(Number(item.percentage))}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={`h-full rounded-full ${colorClasses[color]}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{
                            type: "spring" as const,
                            stiffness: 100,
                            damping: 20,
                            delay: i * 0.04 + 0.2,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Remaining: {formatCurrency(Math.abs(Number(item.remaining)))} MAD
                          {Number(item.remaining) < 0 ? " (over)" : ""}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              const b = budgets.find(
                                (bb) => bb.category === item.category && bb.month === item.month
                              )
                              if (b) openEdit(b)
                            }}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400"
                            onClick={() => {
                              const b = budgets.find(
                                (bb) => bb.category === item.category && bb.month === item.month
                              )
                              if (b) openDelete(b)
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Bar Chart: Budget vs Spent */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 24, delay: 0.2 }}
          >
            <Card className={cardGlass}>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold">Budget vs Spent</h3>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 12 }}
                        className="fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        className="fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,.1)",
                          fontSize: 13,
                        }}
                        formatter={(value) => [`${formatCurrency(Number(value))} MAD`]}
                      />
                      <Bar
                        dataKey="Budget"
                        fill="#0d9488"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="Spent"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-sm bg-teal-600" />
                    Budget
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-sm bg-orange-500" />
                    Spent
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pie Chart: Spending Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 24, delay: 0.3 }}
          >
            <Card className={cardGlass}>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold">Spending Distribution</h3>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary
                          .filter((s) => Number(s.spent) > 0)
                          .map((s) => ({
                            name: s.category,
                            value: Number(s.spent),
                          }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={(props: import("recharts").PieLabelRenderProps) =>
                          `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {summary
                          .filter((s) => Number(s.spent) > 0)
                          .map((s) => (
                            <Cell
                              key={s.category}
                              fill={
                                CATEGORY_CHART_COLORS[s.category as BudgetCategory] ??
                                CATEGORY_CHART_COLORS.Other
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,.1)",
                          fontSize: 13,
                        }}
                        formatter={(value) => [`${formatCurrency(Number(value))} MAD`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Add/Edit Budget Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? "Edit Budget" : "Add Budget"}
            </DialogTitle>
            <DialogDescription>
              {editingBudget
                ? "Update the budget allocation for this category."
                : "Set a monthly budget for a category. If the same category and month already exists, it will be updated."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="budget-category">Category</Label>
              <Select value={formCategory} onValueChange={(v) => v && setFormCategory(v)}>
                <SelectTrigger id="budget-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-month">Month</Label>
              <Input
                id="budget-month"
                type="month"
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-amount">Budget Amount (MAD)</Label>
              <Input
                id="budget-amount"
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 50000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-notes">Notes (optional)</Label>
              <Input
                id="budget-notes"
                placeholder="Any additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingBudget ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the budget for{" "}
              <span className="font-semibold">{deletingBudget?.category}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring" as const, stiffness: 300, damping: 24 }}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted-foreground/20 py-20"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-teal-600/20">
        <Wallet className="size-7 text-teal-600 dark:text-teal-400" />
      </div>
      <div className="text-center">
        <p className="font-semibold">No budgets set for this month</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a budget to start tracking your spending by category.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="size-4" />
        Add Budget
      </Button>
    </motion.div>
  )
}

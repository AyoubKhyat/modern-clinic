"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
} from "date-fns"
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  Sun,
  Sunset,
  Moon,
  Phone,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  List,
  LayoutGrid,
  X,
} from "lucide-react"
import { shiftsApi, usersApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"

/* ── Types ── */

interface Shift {
  id: number
  employee_id: number
  employee_name: string
  shift_date: string
  start_time: string
  end_time: string
  shift_type: "morning" | "afternoon" | "night" | "on_call"
  status: "scheduled" | "completed" | "swap_requested" | "swapped"
  notes: string | null
  swap_requested_with?: number | null
  swap_requested_with_name?: string | null
}

interface StaffMember {
  id: number
  name: string
  role: string
}

/* ── Constants ── */

const SHIFT_TYPES = ["morning", "afternoon", "night", "on_call"] as const

const shiftTypeLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  on_call: "On Call",
}

const shiftTypeIcons: Record<string, typeof Sun> = {
  morning: Sun,
  afternoon: Sunset,
  night: Moon,
  on_call: Phone,
}

const shiftTypeBadgeColors: Record<string, string> = {
  morning:
    "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400",
  afternoon:
    "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
  night:
    "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 dark:text-indigo-400",
  on_call:
    "bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400",
}

const shiftTypeCalendarColors: Record<string, string> = {
  morning:
    "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
  afternoon:
    "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400",
  night:
    "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-400",
  on_call:
    "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400",
}

const statusBadgeColors: Record<string, string> = {
  scheduled:
    "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
  completed:
    "bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400",
  swap_requested:
    "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20 dark:text-yellow-400",
  swapped:
    "bg-purple-500/10 text-purple-700 border border-purple-500/20 dark:text-purple-400",
}

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  swap_requested: "Swap Requested",
  swapped: "Swapped",
}

/* ── Main Page ── */

export default function ShiftsPage() {
  const { toast } = useToast()

  const [shifts, setShifts] = useState<Shift[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // Week navigation
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [swapDialogShift, setSwapDialogShift] = useState<Shift | null>(null)

  /* ── Fetchers ── */

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await usersApi.list()
      setStaff(data.data ?? data ?? [])
    } catch {
      setStaff([])
    }
  }, [])

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        start_date: format(weekStart, "yyyy-MM-dd"),
        end_date: format(weekEnd, "yyyy-MM-dd"),
      }
      if (employeeFilter !== "all") params.employee_id = employeeFilter
      if (typeFilter !== "all") params.shift_type = typeFilter
      const { data } = await shiftsApi.list(params)
      setShifts(data.data ?? data ?? [])
    } catch {
      setShifts([])
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd, employeeFilter, typeFilter])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  /* ── Handlers ── */

  function openCreate() {
    setEditingShift(null)
    setFormOpen(true)
  }

  function openEdit(shift: Shift) {
    setEditingShift(shift)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    toast(editingShift ? "Shift updated successfully" : "Shift created successfully")
    setFormOpen(false)
    setEditingShift(null)
    fetchShifts()
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await shiftsApi.delete(id)
      toast("Shift deleted successfully")
      setDeleteConfirmId(null)
      fetchShifts()
    } catch {
      toast("Failed to delete shift", "error")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSwapRequest(shiftId: number, targetEmployeeId: number) {
    try {
      await shiftsApi.requestSwap(shiftId, {
        target_employee_id: targetEmployeeId,
      })
      toast("Swap request sent")
      setSwapDialogShift(null)
      fetchShifts()
    } catch {
      toast("Failed to send swap request", "error")
    }
  }

  /* ── Summary stats ── */

  const totalShifts = shifts.length

  const morningCount = useMemo(
    () => shifts.filter((s) => s.shift_type === "morning").length,
    [shifts]
  )
  const afternoonCount = useMemo(
    () => shifts.filter((s) => s.shift_type === "afternoon").length,
    [shifts]
  )
  const nightCount = useMemo(
    () => shifts.filter((s) => s.shift_type === "night").length,
    [shifts]
  )

  const summaryCards = [
    {
      title: "Total Shifts This Week",
      value: totalShifts,
      icon: CalendarDays,
      gradient: "from-teal-500/10 to-blue-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      title: "Morning Shifts",
      value: morningCount,
      icon: Sun,
      gradient: "from-amber-500/10 to-yellow-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Afternoon Shifts",
      value: afternoonCount,
      icon: Sunset,
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Night Shifts",
      value: nightCount,
      icon: Moon,
      gradient: "from-indigo-500/10 to-violet-500/10",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
  ]

  /* ── Helpers ── */

  function getShiftsForDay(date: Date): Shift[] {
    return shifts.filter((s) => isSameDay(parseISO(s.shift_date), date))
  }

  // Get unique employees in current shifts for calendar rows
  const employeesInShifts = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of shifts) {
      if (!map.has(s.employee_id)) {
        map.set(s.employee_id, s.employee_name)
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [shifts])

  const pendingSwaps = useMemo(
    () => shifts.filter((s) => s.status === "swap_requested"),
    [shifts]
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shift Management"
        description="Manage employee work shifts and swap requests"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Shift
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      {/* Week Navigation & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(weekStart, "MMM d")} &ndash; {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={employeeFilter}
            onValueChange={(v) => v && setEmployeeFilter(v)}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => v && setTypeFilter(v)}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Shift Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SHIFT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {shiftTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(employeeFilter !== "all" || typeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEmployeeFilter("all")
                setTypeFilter("all")
              }}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Pending Swaps Banner */}
      {pendingSwaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm ring-1 ring-yellow-500/20 bg-yellow-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="size-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium">
                  {pendingSwaps.length} pending swap{" "}
                  {pendingSwaps.length === 1 ? "request" : "requests"}
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {pendingSwaps.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-1.5 text-sm dark:bg-white/5"
                  >
                    <span>
                      <span className="font-medium">{s.employee_name}</span>
                      {" wants to swap "}
                      <span className="text-muted-foreground">
                        {format(parseISO(s.shift_date), "EEE, MMM d")}
                      </span>
                      {s.swap_requested_with_name && (
                        <>
                          {" with "}
                          <span className="font-medium">
                            {s.swap_requested_with_name}
                          </span>
                        </>
                      )}
                    </span>
                    <Badge className={statusBadgeColors.swap_requested}>
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs: List / Calendar */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <List className="size-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <LayoutGrid className="size-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        {/* ── List View ── */}
        <TabsContent value="list">
          {loading ? (
            <TableSkeleton columns={7} />
          ) : shifts.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift, i) => {
                    const TypeIcon = shiftTypeIcons[shift.shift_type] ?? Clock
                    return (
                      <motion.tr
                        key={shift.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-500/10">
                              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                                {shift.employee_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                            </div>
                            <span className="font-medium">
                              {shift.employee_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(parseISO(shift.shift_date), "EEE, MMM d")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {shift.start_time.slice(0, 5)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {shift.end_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              shiftTypeBadgeColors[shift.shift_type] ?? ""
                            }
                          >
                            <TypeIcon className="size-3" />
                            {shiftTypeLabels[shift.shift_type] ??
                              shift.shift_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={statusBadgeColors[shift.status] ?? ""}
                          >
                            {statusLabels[shift.status] ?? shift.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            {shift.status === "scheduled" && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setSwapDialogShift(shift)}
                                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400"
                                title="Request Swap"
                              >
                                <ArrowLeftRight className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(shift)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteConfirmId(shift.id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Calendar View ── */}
        <TabsContent value="calendar">
          {loading ? (
            <CalendarSkeleton />
          ) : shifts.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="sticky left-0 z-10 min-w-[140px] bg-muted/30 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            Employee
                          </th>
                          {weekDays.map((day) => (
                            <th
                              key={day.toISOString()}
                              className={`min-w-[130px] px-2 py-3 text-center text-sm font-medium ${
                                isSameDay(day, new Date())
                                  ? "text-teal-600 dark:text-teal-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <div>{format(day, "EEE")}</div>
                              <div
                                className={`text-xs ${
                                  isSameDay(day, new Date())
                                    ? "font-bold"
                                    : "font-normal"
                                }`}
                              >
                                {format(day, "MMM d")}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employeesInShifts.map((emp, idx) => (
                          <motion.tr
                            key={emp.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.2,
                              delay: idx * 0.05,
                            }}
                            className="border-b last:border-b-0 transition-colors hover:bg-muted/20"
                          >
                            <td className="sticky left-0 z-10 bg-popover px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-500/10">
                                  <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                                    {emp.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium whitespace-nowrap">
                                  {emp.name}
                                </span>
                              </div>
                            </td>
                            {weekDays.map((day) => {
                              const dayShifts = getShiftsForDay(day).filter(
                                (s) => s.employee_id === emp.id
                              )
                              return (
                                <td
                                  key={day.toISOString()}
                                  className={`px-1.5 py-2 align-top ${
                                    isSameDay(day, new Date())
                                      ? "bg-teal-500/[0.03]"
                                      : ""
                                  }`}
                                >
                                  <div className="flex flex-col gap-1">
                                    {dayShifts.length > 0 ? (
                                      dayShifts.map((shift) => {
                                        const TypeIcon =
                                          shiftTypeIcons[shift.shift_type] ??
                                          Clock
                                        return (
                                          <button
                                            key={shift.id}
                                            type="button"
                                            onClick={() => openEdit(shift)}
                                            className={`group relative flex flex-col gap-0.5 rounded-lg border px-2 py-1.5 text-left text-xs transition-all hover:ring-2 hover:ring-teal-500/30 ${
                                              shiftTypeCalendarColors[
                                                shift.shift_type
                                              ] ?? "bg-muted/40"
                                            }`}
                                          >
                                            <span className="flex items-center gap-1 font-medium">
                                              <TypeIcon className="size-3" />
                                              {shiftTypeLabels[
                                                shift.shift_type
                                              ] ?? shift.shift_type}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] opacity-80">
                                              <Clock className="size-2.5" />
                                              {shift.start_time.slice(0, 5)} -{" "}
                                              {shift.end_time.slice(0, 5)}
                                            </span>
                                            {shift.status ===
                                              "swap_requested" && (
                                              <span className="mt-0.5 flex items-center gap-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">
                                                <ArrowLeftRight className="size-2.5" />
                                                Swap
                                              </span>
                                            )}
                                            <span className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-foreground/10 group-hover:flex dark:bg-slate-800">
                                              <Edit className="size-3 text-muted-foreground" />
                                            </span>
                                          </button>
                                        )
                                      })
                                    ) : (
                                      <span className="py-2 text-center text-[10px] text-muted-foreground/50">
                                        &mdash;
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Shift Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Edit Shift" : "Create Shift"}
            </DialogTitle>
            <DialogDescription>
              {editingShift
                ? "Update the shift details below."
                : "Fill in the details to create a new shift."}
            </DialogDescription>
          </DialogHeader>
          <ShiftForm
            shift={editingShift}
            staff={staff}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setFormOpen(false)
              setEditingShift(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Shift</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this shift? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingId !== null}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {deletingId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Request Dialog */}
      <Dialog
        open={swapDialogShift !== null}
        onOpenChange={(open) => {
          if (!open) setSwapDialogShift(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Shift Swap</DialogTitle>
            <DialogDescription>
              {swapDialogShift && (
                <>
                  Request to swap{" "}
                  <span className="font-medium">
                    {swapDialogShift.employee_name}
                  </span>
                  {"'s "}
                  {shiftTypeLabels[swapDialogShift.shift_type]} shift on{" "}
                  {format(
                    parseISO(swapDialogShift.shift_date),
                    "EEE, MMM d"
                  )}
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <SwapForm
            shift={swapDialogShift}
            staff={staff}
            onSubmit={handleSwapRequest}
            onCancel={() => setSwapDialogShift(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Shift Form ── */

function ShiftForm({
  shift,
  staff,
  onSuccess,
  onCancel,
}: {
  shift: Shift | null
  staff: StaffMember[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!shift

  const [employeeId, setEmployeeId] = useState(
    shift ? String(shift.employee_id) : ""
  )
  const [shiftDate, setShiftDate] = useState(shift?.shift_date ?? "")
  const [startTime, setStartTime] = useState(
    shift ? shift.start_time.slice(0, 5) : "08:00"
  )
  const [endTime, setEndTime] = useState(
    shift ? shift.end_time.slice(0, 5) : "16:00"
  )
  const [shiftType, setShiftType] = useState(shift?.shift_type ?? "")
  const [notes, setNotes] = useState(shift?.notes ?? "")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Auto-fill times based on shift type
  function handleTypeChange(type: string) {
    setShiftType(type)
    switch (type) {
      case "morning":
        setStartTime("06:00")
        setEndTime("14:00")
        break
      case "afternoon":
        setStartTime("14:00")
        setEndTime("22:00")
        break
      case "night":
        setStartTime("22:00")
        setEndTime("06:00")
        break
      case "on_call":
        setStartTime("00:00")
        setEndTime("23:59")
        break
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!employeeId) {
      setError("Please select an employee.")
      return
    }
    if (!shiftDate) {
      setError("Please select a date.")
      return
    }
    if (!startTime || !endTime) {
      setError("Please set start and end times.")
      return
    }
    if (!shiftType) {
      setError("Please select a shift type.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        employee_id: Number(employeeId),
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        shift_type: shiftType,
        notes: notes || undefined,
      }

      if (isEdit) {
        await shiftsApi.update(shift.id, payload)
      } else {
        await shiftsApi.create(payload)
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Employee */}
      <div className="flex flex-col gap-1.5">
        <Label>Employee *</Label>
        <Select
          value={employeeId}
          onValueChange={(v) => v && setEmployeeId(v)}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shift_date">Date *</Label>
        <Input
          id="shift_date"
          type="date"
          value={shiftDate}
          onChange={(e) => setShiftDate(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Shift Type */}
      <div className="flex flex-col gap-1.5">
        <Label>Shift Type *</Label>
        <Select value={shiftType} onValueChange={(v) => v && handleTypeChange(v)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {SHIFT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {shiftTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift_start_time">Start Time *</Label>
          <Input
            id="shift_start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift_end_time">End Time *</Label>
          <Input
            id="shift_end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shift_notes">Notes</Label>
        <Textarea
          id="shift_notes"
          placeholder="Optional notes..."
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
            "Update Shift"
          ) : (
            "Create Shift"
          )}
        </Button>
      </div>
    </form>
  )
}

/* ── Swap Form ── */

function SwapForm({
  shift,
  staff,
  onSubmit,
  onCancel,
}: {
  shift: Shift | null
  staff: StaffMember[]
  onSubmit: (shiftId: number, targetEmployeeId: number) => void
  onCancel: () => void
}) {
  const [targetId, setTargetId] = useState("")
  const [loading, setLoading] = useState(false)

  if (!shift) return null

  const availableStaff = staff.filter((s) => s.id !== shift.employee_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetId || !shift) return
    setLoading(true)
    await onSubmit(shift.id, Number(targetId))
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Swap With *</Label>
        <Select value={targetId} onValueChange={(v) => v && setTargetId(v)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {availableStaff.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!targetId || loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <ArrowLeftRight className="size-4" />
              Request Swap
            </>
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
        <CalendarDays className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No shifts found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating a shift for this week.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        Add Shift
      </Button>
    </motion.div>
  )
}

/* ── Calendar Skeleton ── */

function CalendarSkeleton() {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </th>
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="px-3 py-3 text-center">
                    <div className="mx-auto h-4 w-10 animate-pulse rounded bg-muted" />
                    <div className="mx-auto mt-1 h-3 w-12 animate-pulse rounded bg-muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, row) => (
                <tr key={row} className="border-b">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-7 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    </div>
                  </td>
                  {Array.from({ length: 7 }).map((_, col) => (
                    <td key={col} className="px-2 py-3">
                      <div className="mx-auto h-10 w-24 animate-pulse rounded-lg bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

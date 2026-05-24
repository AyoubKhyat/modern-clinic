"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  Loader2,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { referralDashboardApi, referralsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import {
  CustomTooltip,
  containerVariants,
  itemVariants,
} from "@/lib/chart-utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Referral {
  id: number
  patient_id: number
  patient_name: string
  referring_doctor_id: number
  referring_doctor_name: string
  referred_to_doctor_id: number
  referred_to_name: string
  reason: string
  status: "pending" | "accepted" | "completed" | "rejected"
  priority: "urgent" | "high" | "normal" | "low"
  outcome: string | null
  notes: string | null
  created_at: string
}

interface DashboardData {
  total: number
  pending: number
  accepted: number
  completed: number
  rejected: number
  byPriority: { priority: string; count: number }[]
  recent: Referral[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType; chartColor: string }
> = {
  pending: {
    label: "Pending",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    icon: Clock,
    chartColor: "#eab308",
  },
  accepted: {
    label: "Accepted",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-500/10",
    icon: ThumbsUp,
    chartColor: "#3b82f6",
  },
  completed: {
    label: "Completed",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-500/10",
    icon: CheckCircle2,
    chartColor: "#22c55e",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-500/10",
    icon: XCircle,
    chartColor: "#ef4444",
  },
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  urgent: {
    label: "Urgent",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  high: {
    label: "High",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  normal: {
    label: "Normal",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  low: {
    label: "Low",
    color: "text-gray-700 dark:text-gray-400",
    bg: "bg-gray-500/10",
  },
}

const PRIORITY_CHART_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#3b82f6",
  low: "#6b7280",
}

const STATUS_PIPELINE: ("pending" | "accepted" | "completed")[] = [
  "pending",
  "accepted",
  "completed",
]

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

const tableRowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="size-3" />
      {cfg.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      {priority === "urgent" && <AlertTriangle className="size-3" />}
      {cfg.label}
    </span>
  )
}

function StatusPipeline({ current }: { current: string }) {
  const currentIdx = STATUS_PIPELINE.indexOf(current as any)
  return (
    <div className="flex items-center gap-1">
      {STATUS_PIPELINE.map((step, idx) => {
        const cfg = STATUS_CONFIG[step]
        const isActive = idx <= currentIdx && currentIdx >= 0
        return (
          <div key={step} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight
                className={`size-3 ${
                  isActive
                    ? "text-teal-500"
                    : "text-muted-foreground/30"
                }`}
              />
            )}
            <div
              className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                isActive
                  ? `${cfg.bg} ${cfg.color}`
                  : "bg-muted text-muted-foreground/40"
              }`}
              title={cfg.label}
            >
              {idx + 1}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Pie Tooltip
// ---------------------------------------------------------------------------

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="font-medium">{data.name}</p>
      <p className="text-muted-foreground">{data.value} referrals</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReferralTrackingPage() {
  const { toast } = useToast()

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Detail dialog
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [newStatus, setNewStatus] = useState("")

  // ---------- Fetch ----------

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await referralDashboardApi.get()
      setDashboard(res.data)
    } catch {
      toast("Failed to load referral data", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ---------- Handlers ----------

  function openDetail(referral: Referral) {
    setSelectedReferral(referral)
    setOutcomeNotes(referral.outcome ?? referral.notes ?? "")
    // Determine next status
    const nextMap: Record<string, string> = {
      pending: "accepted",
      accepted: "completed",
    }
    setNewStatus(nextMap[referral.status] ?? referral.status)
    setDetailOpen(true)
  }

  async function handleUpdateReferral() {
    if (!selectedReferral) return
    setUpdating(true)
    try {
      await referralsApi.update(selectedReferral.id, {
        status: newStatus,
        outcome: outcomeNotes || null,
      })
      toast("Referral updated successfully")
      setDetailOpen(false)
      fetchDashboard()
    } catch {
      toast("Failed to update referral", "error")
    } finally {
      setUpdating(false)
    }
  }

  // ---------- Derived ----------

  const referrals = dashboard?.recent ?? []

  const filteredReferrals = referrals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        r.patient_name.toLowerCase().includes(q) ||
        r.referring_doctor_name.toLowerCase().includes(q) ||
        r.referred_to_name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      )
    }
    return true
  })

  const pieData = dashboard
    ? [
        { name: "Pending", value: dashboard.pending, color: STATUS_CONFIG.pending.chartColor },
        { name: "Accepted", value: dashboard.accepted, color: STATUS_CONFIG.accepted.chartColor },
        { name: "Completed", value: dashboard.completed, color: STATUS_CONFIG.completed.chartColor },
        { name: "Rejected", value: dashboard.rejected, color: STATUS_CONFIG.rejected.chartColor },
      ].filter((d) => d.value > 0)
    : []

  const priorityData = (dashboard?.byPriority ?? []).map((p) => ({
    ...p,
    fill: PRIORITY_CHART_COLORS[p.priority] ?? "#6b7280",
  }))

  const statCards = dashboard
    ? [
        {
          label: "Total Referrals",
          value: dashboard.total,
          icon: ArrowRightLeft,
          gradient: "from-teal-500/10 to-cyan-500/10",
          iconColor: "text-teal-600 dark:text-teal-400",
        },
        {
          label: "Pending",
          value: dashboard.pending,
          icon: Clock,
          gradient: "from-yellow-500/10 to-amber-500/10",
          iconColor: "text-yellow-600 dark:text-yellow-400",
        },
        {
          label: "Accepted",
          value: dashboard.accepted,
          icon: ThumbsUp,
          gradient: "from-blue-500/10 to-indigo-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
        },
        {
          label: "Completed",
          value: dashboard.completed,
          icon: CheckCircle2,
          gradient: "from-green-500/10 to-emerald-500/10",
          iconColor: "text-green-600 dark:text-green-400",
        },
        {
          label: "Rejected",
          value: dashboard.rejected,
          icon: XCircle,
          gradient: "from-red-500/10 to-rose-500/10",
          iconColor: "text-red-600 dark:text-red-400",
        },
      ]
    : []

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Referral Tracking"
        description="Monitor and manage patient referrals across departments"
      />

      {loading ? (
        <LoadingSkeleton />
      ) : dashboard ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* ── Summary Stat Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.label}
                  variants={cardVariants}
                  className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient}`}
                  >
                    <Icon className={`size-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* ── Charts ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Distribution Pie */}
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader>
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <ArrowRightLeft className="size-4 text-muted-foreground" />
                    Status Distribution
                  </h3>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                          >
                            {pieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-2 flex flex-wrap justify-center gap-4">
                        {pieData.map((entry) => (
                          <div
                            key={entry.name}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <span
                              className="inline-block size-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name} ({entry.value})
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Priority Bar Chart */}
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader>
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <AlertTriangle className="size-4 text-muted-foreground" />
                    Referrals by Priority
                  </h3>
                </CardHeader>
                <CardContent>
                  {priorityData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="priority"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            className="text-muted-foreground"
                            tickFormatter={(v: string) =>
                              v.charAt(0).toUpperCase() + v.slice(1)
                            }
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            className="text-muted-foreground"
                            allowDecimals={false}
                          />
                          <Tooltip
                            content={<CustomTooltip valueSuffix="referrals" />}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {priorityData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Recent Referrals Table ── */}
          <motion.div variants={itemVariants}>
            <Card className={GLASS}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <FileText className="size-4 text-muted-foreground" />
                    Recent Referrals
                  </h3>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Search */}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search referrals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 w-full pl-9 sm:w-56"
                      />
                    </div>
                    {/* Status Filter */}
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v ?? "all")}
                    >
                      <SelectTrigger className="h-9 w-full sm:w-40">
                        <Filter className="mr-1.5 size-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                          <th className="pb-3 pr-4">Patient</th>
                          <th className="pb-3 pr-4">From</th>
                          <th className="pb-3 pr-4">To</th>
                          <th className="pb-3 pr-4">Reason</th>
                          <th className="pb-3 pr-4">Priority</th>
                          <th className="pb-3 pr-4">Pipeline</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3" />
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence mode="popLayout">
                          {filteredReferrals.map((referral) => (
                            <motion.tr
                              key={referral.id}
                              variants={tableRowVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              layout
                              className="group cursor-pointer border-b border-muted/50 transition-colors hover:bg-muted/30"
                              onClick={() => openDetail(referral)}
                            >
                              <td className="py-3 pr-4">
                                <span className="font-medium">
                                  {referral.patient_name}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                {referral.referring_doctor_name}
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                {referral.referred_to_name}
                              </td>
                              <td className="max-w-[180px] truncate py-3 pr-4 text-muted-foreground">
                                {referral.reason}
                              </td>
                              <td className="py-3 pr-4">
                                <PriorityBadge priority={referral.priority} />
                              </td>
                              <td className="py-3 pr-4">
                                <StatusPipeline current={referral.status} />
                              </td>
                              <td className="py-3 pr-4">
                                <StatusBadge status={referral.status} />
                              </td>
                              <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                                {formatDate(referral.created_at)}
                              </td>
                              <td className="py-3">
                                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ArrowRightLeft className="mb-3 size-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No referrals found
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      {statusFilter !== "all"
                        ? "Try changing the status filter"
                        : "Referrals will appear here once created"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ArrowRightLeft className="mb-4 size-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">
            No referral data available
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Referral tracking data will appear once referrals are created
          </p>
        </div>
      )}

      {/* ── Detail / Update Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>
              View and update referral status
            </DialogDescription>
          </DialogHeader>

          {selectedReferral && (
            <div className="flex flex-col gap-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedReferral.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {formatDate(selectedReferral.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referring Doctor</p>
                  <p className="font-medium">
                    {selectedReferral.referring_doctor_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referred To</p>
                  <p className="font-medium">
                    {selectedReferral.referred_to_name}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="font-medium">{selectedReferral.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedReferral.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <div className="mt-1">
                    <PriorityBadge priority={selectedReferral.priority} />
                  </div>
                </div>
              </div>

              {/* Pipeline Visualization */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Progress Pipeline
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
                  {STATUS_PIPELINE.map((step, idx) => {
                    const cfg = STATUS_CONFIG[step]
                    const currentIdx = STATUS_PIPELINE.indexOf(
                      selectedReferral.status as any
                    )
                    const isActive = idx <= currentIdx && currentIdx >= 0
                    return (
                      <div key={step} className="flex items-center gap-2">
                        {idx > 0 && (
                          <div
                            className={`h-0.5 w-6 rounded-full transition-colors ${
                              isActive ? "bg-teal-500" : "bg-muted-foreground/20"
                            }`}
                          />
                        )}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`flex size-8 items-center justify-center rounded-full transition-all ${
                              isActive
                                ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-offset-background`
                                : "bg-muted text-muted-foreground/40"
                            }`}
                            style={
                              isActive
                                ? { ["--tw-ring-color" as string]: cfg.chartColor + "40" }
                                : undefined
                            }
                          >
                            {(() => {
                              const Icon = cfg.icon
                              return <Icon className="size-4" />
                            })()}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Update Section */}
              {selectedReferral.status !== "completed" &&
                selectedReferral.status !== "rejected" && (
                  <div className="flex flex-col gap-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                    <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                      Update Referral
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">New Status</Label>
                      <Select
                        value={newStatus}
                        onValueChange={(v) => setNewStatus(v ?? newStatus)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedReferral.status === "pending" && (
                            <>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </>
                          )}
                          {selectedReferral.status === "accepted" && (
                            <SelectItem value="completed">Completed</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Outcome / Notes</Label>
                      <Textarea
                        placeholder="Add outcome notes or comments..."
                        value={outcomeNotes}
                        onChange={(e) => setOutcomeNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleUpdateReferral}
                      disabled={updating}
                      className="mt-1 bg-teal-600 text-white hover:bg-teal-700"
                    >
                      {updating && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Update Referral
                    </Button>
                  </div>
                )}

              {/* Existing Outcome Display */}
              {selectedReferral.outcome && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Outcome
                  </p>
                  <p className="text-sm">{selectedReferral.outcome}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

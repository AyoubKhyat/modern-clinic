"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import {
  Users,
  DollarSign,
  UserCheck,
  Calendar,
  UserPlus,
  CalendarPlus,
  CreditCard,
  BarChart3,
  Settings2,
  Eye,
  EyeOff,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dashboardApi, analyticsApi } from "@/lib/api"
import {
  AnimatedCounter,
  CustomTooltip,
  containerVariants,
  itemVariants,
  chartColors,
} from "@/lib/chart-utils"
import {
  statusColorMap,
  appointmentStatusConfig,
  paymentStatusConfig,
  paymentTypeLabels,
} from "@/lib/constants"
import { useAuthStore } from "@/stores/auth-store"
import type { AdminDashboard } from "@/types"


const statCardConfig = [
  {
    key: "today_patients",
    label: "Today's Patients",
    icon: Users,
    gradient: "from-blue-500/[0.08] to-blue-600/[0.04]",
    ring: "ring-blue-500/10 hover:ring-blue-500/20 hover:shadow-blue-500/5",
    iconBg: "text-blue-500/[0.06]",
    darkGradient: "dark:from-blue-500/[0.06] dark:to-blue-600/[0.03]",
  },
  {
    key: "month_revenue",
    label: "Monthly Revenue",
    icon: DollarSign,
    gradient: "from-emerald-500/[0.08] to-emerald-600/[0.04]",
    ring: "ring-emerald-500/10 hover:ring-emerald-500/20 hover:shadow-emerald-500/5",
    iconBg: "text-emerald-500/[0.06]",
    darkGradient: "dark:from-emerald-500/[0.06] dark:to-emerald-600/[0.03]",
  },
  {
    key: "active_employees",
    label: "Active Employees",
    icon: UserCheck,
    gradient: "from-purple-500/[0.08] to-purple-600/[0.04]",
    ring: "ring-purple-500/10 hover:ring-purple-500/20 hover:shadow-purple-500/5",
    iconBg: "text-purple-500/[0.06]",
    darkGradient: "dark:from-purple-500/[0.06] dark:to-purple-600/[0.03]",
  },
  {
    key: "appointments_month",
    label: "This Month",
    icon: Calendar,
    gradient: "from-amber-500/[0.08] to-amber-600/[0.04]",
    ring: "ring-amber-500/10 hover:ring-amber-500/20 hover:shadow-amber-500/5",
    iconBg: "text-amber-500/[0.06]",
    darkGradient: "dark:from-amber-500/[0.06] dark:to-amber-600/[0.03]",
  },
] as const

const quickActions = [
  { label: "New Patient", href: "/patients", icon: UserPlus, gradient: "from-blue-500 to-blue-600" },
  { label: "Appointment", href: "/appointments", icon: CalendarPlus, gradient: "from-teal-500 to-teal-600" },
  { label: "Payment", href: "/payments", icon: CreditCard, gradient: "from-emerald-500 to-emerald-600" },
  { label: "Reports", href: "/analytics", icon: BarChart3, gradient: "from-purple-500 to-purple-600" },
]


function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function getPatientName(obj: any): string {
  if (obj?.patient?.full_name) return obj.patient.full_name
  if (obj?.patient?.first_name)
    return `${obj.patient.first_name} ${obj.patient.last_name ?? ""}`.trim()
  return "Unknown Patient"
}


function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}

const WIDGET_KEYS = ['stats', 'charts', 'trends', 'activity', 'payments'] as const
type WidgetKey = typeof WIDGET_KEYS[number]
const WIDGET_LABELS: Record<WidgetKey, string> = {
  stats: 'Stat Cards',
  charts: 'Appointment Charts',
  trends: 'Revenue & Appointment Trends',
  activity: 'Recent Activity & Quick Actions',
  payments: 'Recent Payments',
}

function getVisibleWidgets(): Record<WidgetKey, boolean> {
  if (typeof window === 'undefined') return Object.fromEntries(WIDGET_KEYS.map(k => [k, true])) as Record<WidgetKey, boolean>
  try {
    const saved = localStorage.getItem('dashboard_widgets')
    if (saved) return JSON.parse(saved)
  } catch {}
  return Object.fromEntries(WIDGET_KEYS.map(k => [k, true])) as Record<WidgetKey, boolean>
}

export function AdminDashboardView() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<{month: string; revenue: number}[]>([])
  const [appointmentTrend, setAppointmentTrend] = useState<{month: string; count: number}[]>([])
  const [widgets, setWidgets] = useState<Record<WidgetKey, boolean>>(getVisibleWidgets)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const { user } = useAuthStore()

  function toggleWidget(key: WidgetKey) {
    setWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('dashboard_widgets', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    dashboardApi
      .admin()
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false))

    analyticsApi.revenueTrend().then((res) => setRevenueTrend(res.data)).catch(() => {})
    analyticsApi.appointmentTrend().then((res) => setAppointmentTrend(res.data)).catch(() => {})
  }, [])

  if (loading) return <DashboardSkeleton />
  if (error)
    return (
      <div className="py-12 text-center text-muted-foreground">{error}</div>
    )
  if (!data) return null

  const totalAppointments = Object.values(data.appointment_stats).reduce(
    (sum, v) => sum + v,
    0
  )

  const numericValues: Record<string, number> = {
    today_patients: data.today_patients,
    month_revenue: data.month_revenue,
    active_employees: data.active_employees,
    appointments_month: totalAppointments,
  }

  const chartData = Object.entries(data.appointment_stats).map(
    ([status, count]) => ({
      status: appointmentStatusConfig[status]?.label ?? status,
      count,
      fill: chartColors[status] ?? "#94a3b8",
    })
  )

  const pieData = Object.entries(data.appointment_stats)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: appointmentStatusConfig[status]?.label ?? status,
      value: count,
      fill: chartColors[status] ?? "#94a3b8",
    }))

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Greeting Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-indigo-500/10 p-6 dark:from-teal-500/[0.07] dark:via-blue-500/[0.07] dark:to-indigo-500/[0.07]"
      >
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {getGreeting()},
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              {user?.name ?? "Admin"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")} &mdash;{" "}
              {data.today_patients} patients today,{" "}
              {data.recent_payments.filter((p) => p.status === "pending").length}{" "}
              pending payments
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setCustomizeOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Settings2 className="size-4" />
          </Button>
        </div>
        <div className="absolute -right-8 -top-8 size-48 rounded-full bg-gradient-to-br from-teal-400/20 to-blue-500/20 blur-3xl" />
      </motion.div>

      {/* Stat Cards */}
      {widgets.stats && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCardConfig.map(({ key, label, icon: Icon, gradient, ring, iconBg, darkGradient }) => (
          <motion.div key={key} variants={itemVariants}>
            <Card
              className={`group relative overflow-hidden border-0 bg-gradient-to-br ${gradient} ${darkGradient} shadow-sm ring-1 ${ring} transition-all duration-300 hover:shadow-md`}
            >
              <div
                className={`absolute -right-4 -top-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 ${iconBg}`}
              >
                <Icon className="size-24" />
              </div>
              <CardContent className="relative z-10 flex flex-col gap-1 pt-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  {label}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedCounter
                    value={numericValues[key]}
                    isCurrency={key === "month_revenue"}
                  />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>}

      {/* Charts + Timeline Row */}
      {widgets.charts && <div className="grid gap-4 lg:grid-cols-3">
        {/* Area Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Appointment Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No data available
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.7 0.15 200)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.7 0.15 200)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted/50"
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <ReTooltip content={<CustomTooltip valueSuffix="appointments" />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="oklch(0.7 0.15 200)"
                      fill="url(#chartGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Donut Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {pieData.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No data
                </p>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">
                      {totalAppointments}
                    </span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>}

      {/* Revenue & Appointment Trends */}
      {widgets.trends && <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueTrend.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ReTooltip content={<CustomTooltip valueSuffix="MAD" />} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Appointment Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentTrend.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={appointmentTrend} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ReTooltip content={<CustomTooltip valueSuffix="appointments" />} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>}

      {/* Activity Timeline + Quick Actions */}
      {widgets.activity && <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity Timeline */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_appointments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No recent activity
                </p>
              ) : (
                <div className="relative space-y-4">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-teal-400/50 via-border to-transparent" />
                  {data.recent_appointments.slice(0, 6).map((apt, i) => (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative flex items-start gap-3 pl-8"
                    >
                      <div className="absolute left-[9px] top-1.5 size-2 rounded-full bg-teal-400 ring-2 ring-background" />
                      <div className="flex-1 rounded-lg bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {getPatientName(apt)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(apt.scheduled_at), "HH:mm")}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[apt.status] ?? ""}`}
                          >
                            {appointmentStatusConfig[apt.status]?.label ??
                              apt.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {apt.doctor?.name}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/30 p-4 text-center transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${action.gradient}`}
                    >
                      <action.icon className="size-5 text-white" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>}

      {/* Recent Payments */}
      {widgets.payments && <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_payments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No recent payments
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_payments.slice(0, 5).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {getPatientName(payment)}
                      </TableCell>
                      <TableCell>
                        {payment.amount.toLocaleString("fr-MA")} MAD
                      </TableCell>
                      <TableCell>
                        {paymentTypeLabels[payment.payment_type] ??
                          payment.payment_type}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[payment.status] ?? ""}`}
                        >
                          {paymentStatusConfig[payment.status]?.label ??
                            payment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(payment.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>}

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {WIDGET_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
                <Label className="text-sm">{WIDGET_LABELS[key]}</Label>
                <Switch checked={widgets[key]} onCheckedChange={() => toggleWidget(key)} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

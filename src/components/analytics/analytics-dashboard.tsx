"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { format, parseISO, subDays, isAfter } from "date-fns"
import {
  Users,
  DollarSign,
  Activity,
  CheckCircle,
  TrendingUp,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCardsSkeleton } from "@/components/ui/skeletons"
import {
  AnimatedCounter,
  CustomTooltip,
  chartColors,
  containerVariants,
  itemVariants,
} from "@/lib/chart-utils"
import { paymentsApi, patientsApi, appointmentsApi, visitsApi } from "@/lib/api"
import type { Patient, Appointment, Visit, Payment } from "@/types"

/* ---------- helpers ---------- */

function groupByMonth<T extends Record<string, any>>(
  items: T[],
  dateField: string,
): { month: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = format(parseISO(item[dateField]), "MMM yy")
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map, ([month, count]) => ({ month, count }))
}

function groupRevenueByMonth(
  payments: Payment[],
): { month: string; revenue: number }[] {
  const map = new Map<string, number>()
  for (const p of payments) {
    const key = format(parseISO(p.created_at), "MMM yy")
    map.set(key, (map.get(key) ?? 0) + p.amount)
  }
  return Array.from(map, ([month, revenue]) => ({ month, revenue }))
}

/* ---------- stat-card config ---------- */

const statCardConfig = [
  {
    key: "patients",
    label: "Total Patients",
    icon: Users,
    gradient: "from-blue-500/[0.08] to-blue-600/[0.04]",
    ring: "ring-blue-500/10",
    iconBg: "text-blue-500/[0.06]",
    darkGradient: "dark:from-blue-500/[0.06] dark:to-blue-600/[0.03]",
  },
  {
    key: "revenue",
    label: "Total Revenue",
    icon: DollarSign,
    gradient: "from-emerald-500/[0.08] to-emerald-600/[0.04]",
    ring: "ring-emerald-500/10",
    iconBg: "text-emerald-500/[0.06]",
    darkGradient: "dark:from-emerald-500/[0.06] dark:to-emerald-600/[0.03]",
    isCurrency: true,
  },
  {
    key: "avgVisits",
    label: "Avg Visits / Day",
    icon: Activity,
    gradient: "from-purple-500/[0.08] to-purple-600/[0.04]",
    ring: "ring-purple-500/10",
    iconBg: "text-purple-500/[0.06]",
    darkGradient: "dark:from-purple-500/[0.06] dark:to-purple-600/[0.03]",
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    icon: CheckCircle,
    gradient: "from-amber-500/[0.08] to-amber-600/[0.04]",
    ring: "ring-amber-500/10",
    iconBg: "text-amber-500/[0.06]",
    darkGradient: "dark:from-amber-500/[0.06] dark:to-amber-600/[0.03]",
    isPercentage: true,
  },
] as const

/* ---------- date-range helpers ---------- */

const rangeDays: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  year: 365,
}

function filterByDate<T extends { created_at: string }>(
  items: T[],
  range: string,
): T[] {
  const days = rangeDays[range] ?? 30
  const cutoff = subDays(new Date(), days)
  return items.filter((item) => isAfter(parseISO(item.created_at), cutoff))
}

/* ---------- main component ---------- */

export function AnalyticsDashboard() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState("30d")

  useEffect(() => {
    Promise.all([
      patientsApi.list({ per_page: 100 }),
      appointmentsApi.list({ per_page: 100 }),
      visitsApi.list({ per_page: 100 }),
      paymentsApi.list({ per_page: 100 }),
    ])
      .then(([pRes, aRes, vRes, pmRes]) => {
        setPatients(pRes.data.data ?? pRes.data)
        setAppointments(aRes.data.data ?? aRes.data)
        setVisits(vRes.data.data ?? vRes.data)
        setPayments(pmRes.data.data ?? pmRes.data)
      })
      .catch(() => setError("Failed to load analytics data"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl bg-muted/40 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-muted-foreground">{error}</div>
    )
  }

  /* filtered data */
  const filteredPatients = filterByDate(patients, dateRange)
  const filteredAppointments = filterByDate(appointments, dateRange)
  const filteredVisits = filterByDate(visits, dateRange)
  const filteredPayments = filterByDate(payments, dateRange)

  const daysInRange = rangeDays[dateRange] ?? 30

  /* stat values */
  const statValues: Record<string, number> = {
    patients: filteredPatients.length,
    revenue: filteredPayments.reduce((s, p) => s + p.amount, 0),
    avgVisits: Math.round(filteredVisits.length / Math.max(daysInRange, 1)),
    completionRate: Math.round(
      (filteredVisits.filter((v) => v.status === "completed").length /
        Math.max(filteredVisits.length, 1)) *
        100,
    ),
  }

  /* chart data */
  const revenueData = groupRevenueByMonth(filteredPayments)
  const patientGrowthData = groupByMonth(filteredPatients, "created_at")

  /* appointment status for pie chart */
  const statusMap = new Map<string, number>()
  for (const a of filteredAppointments) {
    statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1)
  }
  const pieData = Array.from(statusMap, ([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
    value,
    fill: chartColors[name] ?? "#94a3b8",
  })).filter((d) => d.value > 0)

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Date range tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={dateRange} onValueChange={setDateRange}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {statCardConfig.map(
          ({
            key,
            label,
            icon: Icon,
            gradient,
            ring,
            iconBg,
            darkGradient,
            ...rest
          }) => (
            <Card
              key={key}
              className={`border-0 bg-gradient-to-br ${gradient} ${darkGradient} shadow-sm ring-1 ${ring} transition-all duration-300 hover:shadow-md`}
            >
              <CardContent className="relative overflow-hidden py-5">
                <Icon
                  className={`absolute -right-2 -top-2 size-20 ${iconBg}`}
                />
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  <AnimatedCounter
                    value={statValues[key]}
                    isCurrency={"isCurrency" in rest && rest.isCurrency}
                    isPercentage={"isPercentage" in rest && rest.isPercentage}
                  />
                </p>
              </CardContent>
            </Card>
          ),
        )}
      </motion.div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No revenue data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={revenueData}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="oklch(0.7 0.15 170)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(0.7 0.15 170)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/50"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <ReTooltip
                    content={<CustomTooltip valueSuffix="MAD" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.65 0.15 170)"
                    fill="url(#revenueGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Appointment Status PieChart */}
        <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardHeader>
            <CardTitle>Appointment Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {pieData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data</p>
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
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
                      {filteredAppointments.length}
                    </span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {pieData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: entry.fill }}
                      />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Patient Growth */}
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Patient Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patientGrowthData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No patient data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={patientGrowthData}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/50"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <ReTooltip
                    content={<CustomTooltip valueSuffix="patients" />}
                  />
                  <Bar
                    dataKey="count"
                    fill="oklch(0.65 0.15 200)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Visit Completion Rate */}
        <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardHeader>
            <CardTitle>Visit Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="relative flex size-36 items-center justify-center">
              {/* Background ring */}
              <svg className="absolute inset-0" viewBox="0 0 144 144">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted/30"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  fill="none"
                  stroke="oklch(0.65 0.15 150)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(statValues.completionRate / 100) * 377} 377`}
                  transform="rotate(-90 72 72)"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="text-3xl font-bold">
                <AnimatedCounter
                  value={statValues.completionRate}
                  isPercentage
                />
              </span>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {filteredVisits.filter((v) => v.status === "completed").length} of{" "}
              {filteredVisits.length} visits completed
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

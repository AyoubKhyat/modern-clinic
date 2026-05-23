"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  Clock,
  Loader2,
  UserCheck,
  BarChart3,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { doctorPerformanceApi } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { containerVariants, itemVariants, CustomTooltip } from "@/lib/chart-utils"

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const CHART_COLORS = {
  teal: "#0d9488",
  blue: "#3b82f6",
  amber: "#f59e0b",
  purple: "#8b5cf6",
}

const PIE_COLORS = [
  CHART_COLORS.teal,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.purple,
  "#ec4899",
  "#22c55e",
  "#ef4444",
  "#6366f1",
]

interface DoctorPerformance {
  doctor_id: number
  doctor_name: string
  total_visits: number
  completed_visits: number
  avg_visit_duration_minutes: number
  total_revenue: number
  patient_count: number
  completion_rate: number
}

export default function DoctorPerformancePage() {
  const [data, setData] = useState<DoctorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await doctorPerformanceApi.get()
      setData(res.data ?? [])
    } catch {
      toast("Failed to load doctor performance data", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalDoctors = data.length
  const totalVisits = data.reduce((sum, d) => sum + d.total_visits, 0)
  const avgCompletionRate =
    totalDoctors > 0
      ? Math.round(
          data.reduce((sum, d) => sum + d.completion_rate, 0) / totalDoctors
        )
      : 0
  const totalRevenue = data.reduce((sum, d) => sum + d.total_revenue, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctor Performance"
        description="Analyze individual doctor metrics"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link href="/analytics" />}>
              <ArrowLeft className="size-4" />
              Back to Analytics
            </Button>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BarChart3 className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* ──────── Summary Cards ──────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Total Doctors"
              value={totalDoctors.toLocaleString("en-MA")}
              icon={Users}
              gradient="from-teal-500/[0.08] to-teal-600/[0.04]"
              darkGradient="dark:from-teal-500/[0.06] dark:to-teal-600/[0.03]"
            />
            <SummaryCard
              title="Total Visits"
              value={totalVisits.toLocaleString("en-MA")}
              icon={Activity}
              gradient="from-blue-500/[0.08] to-blue-600/[0.04]"
              darkGradient="dark:from-blue-500/[0.06] dark:to-blue-600/[0.03]"
            />
            <SummaryCard
              title="Avg Completion Rate"
              value={`${avgCompletionRate}%`}
              icon={TrendingUp}
              gradient="from-amber-500/[0.08] to-amber-600/[0.04]"
              darkGradient="dark:from-amber-500/[0.06] dark:to-amber-600/[0.03]"
            />
            <SummaryCard
              title="Total Revenue"
              value={`${totalRevenue.toLocaleString("en-MA")} MAD`}
              icon={DollarSign}
              gradient="from-purple-500/[0.08] to-purple-600/[0.04]"
              darkGradient="dark:from-purple-500/[0.06] dark:to-purple-600/[0.03]"
            />
          </div>

          {/* ──────── Performance Table ──────── */}
          <motion.div variants={itemVariants}>
            <Card className={GLASS}>
              <CardHeader>
                <CardTitle className="text-base">
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead className="text-right">Total Visits</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-center">
                        Completion Rate
                      </TableHead>
                      <TableHead className="text-right">
                        Avg Duration
                      </TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Patients</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((doctor, idx) => (
                      <motion.tr
                        key={doctor.doctor_id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {doctor.doctor_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {doctor.total_visits}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {doctor.completed_visits}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(doctor.completion_rate, 100)}%`,
                                  backgroundColor: getCompletionColor(
                                    doctor.completion_rate
                                  ),
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-semibold tabular-nums"
                              style={{
                                color: getCompletionColor(
                                  doctor.completion_rate
                                ),
                              }}
                            >
                              {Math.round(doctor.completion_rate)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            {Math.round(doctor.avg_visit_duration_minutes)} min
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {doctor.total_revenue.toLocaleString("en-MA")} MAD
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {doctor.patient_count}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          {/* ──────── Charts Row ──────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue per Doctor */}
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Revenue per Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.map((d) => ({
                          name: d.doctor_name,
                          revenue: d.total_revenue,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          className="text-muted-foreground"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <ReTooltip
                          content={<CustomTooltip valueSuffix="MAD" />}
                        />
                        <Bar
                          dataKey="revenue"
                          fill={CHART_COLORS.teal}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Visits per Doctor (Grouped) */}
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Visits per Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.map((d) => ({
                          name: d.doctor_name,
                          total: d.total_visits,
                          completed: d.completed_visits,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          className="text-muted-foreground"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <ReTooltip
                          content={<GroupedTooltip />}
                        />
                        <Bar
                          dataKey="total"
                          name="Total Visits"
                          fill={CHART_COLORS.blue}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="completed"
                          name="Completed"
                          fill={CHART_COLORS.teal}
                          radius={[4, 4, 0, 0]}
                        />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ──────── Visit Distribution Pie ──────── */}
          <motion.div variants={itemVariants}>
            <Card className={GLASS}>
              <CardHeader>
                <CardTitle className="text-base">
                  Visit Distribution by Doctor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.map((d) => ({
                          name: d.doctor_name,
                          value: d.total_visits,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={(props: import("recharts").PieLabelRenderProps) =>
                          `${props.name ?? ""} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine
                      >
                        {data.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <ReTooltip
                        content={<CustomTooltip valueSuffix="visits" />}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

/* ──────── Helper ──────── */

function getCompletionColor(rate: number): string {
  if (rate >= 80) return "#10b981"
  if (rate >= 60) return "#f59e0b"
  return "#ef4444"
}

/* ──────── Sub-components ──────── */

function SummaryCard({
  title,
  value,
  icon: Icon,
  gradient,
  darkGradient,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  darkGradient: string
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={GLASS}>
        <CardContent
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-5 ${gradient} ${darkGradient}`}
        >
          <Icon className="absolute -right-2 -top-2 size-20 text-foreground/[0.03]" />
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function GroupedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-sm">
      <p className="font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-muted-foreground">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {entry.value?.toLocaleString("en-MA")}
        </p>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className={GLASS}>
            <CardContent className="p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-7 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className={GLASS}>
        <CardContent className="p-5">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className={GLASS}>
            <CardContent className="p-5">
              <div className="h-72 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className={GLASS}>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <UserCheck className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No Performance Data</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Doctor performance metrics will appear here once visits are recorded.
        </p>
        <Button variant="outline" className="mt-4" render={<Link href="/analytics" />}>
          <ArrowLeft className="size-4" />
          Back to Analytics
        </Button>
      </CardContent>
    </Card>
  )
}

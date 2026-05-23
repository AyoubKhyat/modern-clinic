"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { format, subDays } from "date-fns"
import {
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts"
import { reportsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CustomTooltip, containerVariants, itemVariants } from "@/lib/chart-utils"

const GLASS = "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

interface FinancialReport {
  total_revenue: number
  total_pending: number
  by_type: { payment_type: string; count: number; total: number }[]
  by_method: { payment_method: string; count: number; total: number }[]
  daily: { day: string; revenue: number; count: number }[]
}

interface ClinicalReport {
  total_visits: number
  visits_by_status: { status: string; count: number }[]
  total_appointments: number
  appointments_by_status: { status: string; count: number }[]
  top_diagnoses: { diagnosis: string; count: number }[]
}

export default function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd")
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd")

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [financial, setFinancial] = useState<FinancialReport | null>(null)
  const [clinical, setClinical] = useState<ClinicalReport | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const [finRes, clinRes] = await Promise.all([
        reportsApi.financial({ start: startDate, end: endDate }),
        reportsApi.clinical({ start: startDate, end: endDate }),
      ])
      setFinancial(finRes.data)
      setClinical(clinRes.data)
    } catch {
      // silent — empty state shown
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const paymentCount =
    financial?.by_type.reduce((sum, t) => sum + t.count, 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Advanced financial and clinical reports"
        action={
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Refresh
          </Button>
        }
      />

      {/* Date range filter */}
      <Card className={GLASS}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report_start">Start Date</Label>
            <Input
              id="report_start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report_end">End Date</Label>
            <Input
              id="report_end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-44"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <Tabs defaultValue="financial">
          <TabsList variant="line">
            <TabsTrigger value="financial">
              <DollarSign className="size-3.5" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="clinical">
              <Activity className="size-3.5" />
              Clinical
            </TabsTrigger>
          </TabsList>

          {/* ──────── Financial Tab ──────── */}
          <TabsContent value="financial" className="pt-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                  title="Total Revenue"
                  value={`${(financial?.total_revenue ?? 0).toLocaleString("fr-MA")} MAD`}
                  icon={DollarSign}
                  gradient="from-emerald-500/[0.08] to-emerald-600/[0.04]"
                  darkGradient="dark:from-emerald-500/[0.06] dark:to-emerald-600/[0.03]"
                />
                <SummaryCard
                  title="Total Pending"
                  value={`${(financial?.total_pending ?? 0).toLocaleString("fr-MA")} MAD`}
                  icon={TrendingUp}
                  gradient="from-amber-500/[0.08] to-amber-600/[0.04]"
                  darkGradient="dark:from-amber-500/[0.06] dark:to-amber-600/[0.03]"
                />
                <SummaryCard
                  title="Payment Count"
                  value={paymentCount.toLocaleString("fr-MA")}
                  icon={FileText}
                  gradient="from-blue-500/[0.08] to-blue-600/[0.04]"
                  darkGradient="dark:from-blue-500/[0.06] dark:to-blue-600/[0.03]"
                />
              </div>

              {/* Daily revenue chart */}
              {financial?.daily && financial.daily.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base">Daily Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financial.daily}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              className="text-muted-foreground"
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              className="text-muted-foreground"
                            />
                            <ReTooltip content={<CustomTooltip valueSuffix="MAD" />} />
                            <Bar
                              dataKey="revenue"
                              fill="hsl(var(--chart-1, 160 60% 45%))"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Breakdown tables */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* By Payment Type */}
                <motion.div variants={itemVariants}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base">By Payment Type</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financial?.by_type.map((row) => (
                            <TableRow key={row.payment_type}>
                              <TableCell className="font-medium capitalize">
                                {row.payment_type.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.count}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.total.toLocaleString("fr-MA")} MAD
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!financial?.by_type || financial.by_type.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No data
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* By Payment Method */}
                <motion.div variants={itemVariants}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base">By Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financial?.by_method.map((row) => (
                            <TableRow key={row.payment_method}>
                              <TableCell className="font-medium capitalize">
                                {row.payment_method.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.count}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.total.toLocaleString("fr-MA")} MAD
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!financial?.by_method || financial.by_method.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No data
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </TabsContent>

          {/* ──────── Clinical Tab ──────── */}
          <TabsContent value="clinical" className="pt-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryCard
                  title="Total Visits"
                  value={(clinical?.total_visits ?? 0).toLocaleString("fr-MA")}
                  icon={Activity}
                  gradient="from-violet-500/[0.08] to-violet-600/[0.04]"
                  darkGradient="dark:from-violet-500/[0.06] dark:to-violet-600/[0.03]"
                />
                <SummaryCard
                  title="Total Appointments"
                  value={(clinical?.total_appointments ?? 0).toLocaleString("fr-MA")}
                  icon={Calendar}
                  gradient="from-sky-500/[0.08] to-sky-600/[0.04]"
                  darkGradient="dark:from-sky-500/[0.06] dark:to-sky-600/[0.03]"
                />
              </div>

              {/* Status breakdowns */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Visits by status */}
                <motion.div variants={itemVariants}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base">Visits by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {clinical?.visits_by_status.map((row) => (
                          <Badge
                            key={row.status}
                            variant="outline"
                            className="gap-1.5 px-3 py-1.5 text-sm"
                          >
                            <span className="capitalize">{row.status.replace(/_/g, " ")}</span>
                            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                              {row.count}
                            </span>
                          </Badge>
                        ))}
                        {(!clinical?.visits_by_status || clinical.visits_by_status.length === 0) && (
                          <p className="text-sm text-muted-foreground">No data</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Appointments by status */}
                <motion.div variants={itemVariants}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base">Appointments by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {clinical?.appointments_by_status.map((row) => (
                          <Badge
                            key={row.status}
                            variant="outline"
                            className="gap-1.5 px-3 py-1.5 text-sm"
                          >
                            <span className="capitalize">{row.status.replace(/_/g, " ")}</span>
                            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                              {row.count}
                            </span>
                          </Badge>
                        ))}
                        {(!clinical?.appointments_by_status || clinical.appointments_by_status.length === 0) && (
                          <p className="text-sm text-muted-foreground">No data</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Top Diagnoses */}
              <motion.div variants={itemVariants}>
                <Card className={GLASS}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Diagnoses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinical?.top_diagnoses.map((row, idx) => (
                          <TableRow key={row.diagnosis}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{row.diagnosis}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                          </TableRow>
                        ))}
                        {(!clinical?.top_diagnoses || clinical.top_diagnoses.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
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
        <CardContent className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-5 ${gradient} ${darkGradient}`}>
          <Icon className="absolute -right-2 -top-2 size-20 text-foreground/[0.03]" />
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
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
          <div className="h-72 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}

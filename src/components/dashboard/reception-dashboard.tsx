"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import {
  Calendar,
  Clock,
  XCircle,
  UserX,
  UserPlus,
  CalendarPlus,
  CreditCard,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dashboardApi, appointmentsApi, paymentsApi } from "@/lib/api"
import { statusColorMap, appointmentStatusConfig, paymentTypeLabels } from "@/lib/constants"
import { useAuthStore } from "@/stores/auth-store"
import type { ReceptionDashboard } from "@/types"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <>{display}</>
}

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

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("fr-MA")} MAD`
}

const statusActions: Record<string, { label: string; nextStatus: string }> = {
  scheduled: { label: "Confirm", nextStatus: "confirmed" },
  confirmed: { label: "Mark Arrived", nextStatus: "arrived" },
}

const quickActions = [
  { label: "New Patient", href: "/patients", icon: UserPlus, gradient: "from-blue-500 to-blue-600" },
  { label: "Appointment", href: "/appointments", icon: CalendarPlus, gradient: "from-teal-500 to-teal-600" },
  { label: "Payment", href: "/payments", icon: CreditCard, gradient: "from-emerald-500 to-emerald-600" },
]

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
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

export function ReceptionDashboardView() {
  const [data, setData] = useState<ReceptionDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const { user } = useAuthStore()

  const fetchData = useCallback(() => {
    dashboardApi
      .reception()
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusUpdate = async (
    appointmentId: number,
    newStatus: string
  ) => {
    setActionLoading(appointmentId)
    try {
      await appointmentsApi.updateStatus(appointmentId, newStatus)
      fetchData()
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPaid = async (paymentId: number) => {
    setActionLoading(paymentId)
    try {
      await paymentsApi.markAsPaid(paymentId)
      fetchData()
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <DashboardSkeleton />
  if (error)
    return (
      <div className="py-12 text-center text-muted-foreground">{error}</div>
    )
  if (!data) return null

  const statCards = [
    {
      label: "Today's Appointments",
      value: data.today_appointments.length,
      icon: Calendar,
      gradient: "from-blue-500/[0.08] to-blue-600/[0.04]",
      ring: "ring-blue-500/10 hover:ring-blue-500/20 hover:shadow-blue-500/5",
      iconBg: "text-blue-500/[0.06]",
    },
    {
      label: "Waiting Patients",
      value: data.waiting_patients,
      icon: Clock,
      gradient: "from-amber-500/[0.08] to-amber-600/[0.04]",
      ring: "ring-amber-500/10 hover:ring-amber-500/20 hover:shadow-amber-500/5",
      iconBg: "text-amber-500/[0.06]",
    },
    {
      label: "Cancelled",
      value: data.cancelled_count,
      icon: XCircle,
      gradient: "from-red-500/[0.08] to-red-600/[0.04]",
      ring: "ring-red-500/10 hover:ring-red-500/20 hover:shadow-red-500/5",
      iconBg: "text-red-500/[0.06]",
    },
    {
      label: "No Shows",
      value: data.no_show_count,
      icon: UserX,
      gradient: "from-gray-500/[0.08] to-gray-600/[0.04]",
      ring: "ring-gray-500/10 hover:ring-gray-500/20 hover:shadow-gray-500/5",
      iconBg: "text-gray-500/[0.06]",
    },
  ]

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
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">
            {getGreeting()},
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {user?.name ?? "Reception"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")} &mdash;{" "}
            {data.waiting_patients} patients waiting,{" "}
            {data.today_appointments.length} appointments today
          </p>
        </div>
        <div className="absolute -right-8 -top-8 size-48 rounded-full bg-gradient-to-br from-teal-400/20 to-blue-500/20 blur-3xl" />
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card
              className={`group relative overflow-hidden border-0 bg-gradient-to-br ${stat.gradient} shadow-sm ring-1 ${stat.ring} transition-all duration-300 hover:shadow-md`}
            >
              <div
                className={`absolute -right-4 -top-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 ${stat.iconBg}`}
              >
                <stat.icon className="size-24" />
              </div>
              <CardContent className="relative z-10 flex flex-col gap-1 pt-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedCounter value={stat.value} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Appointments Table + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Today&apos;s Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {data.today_appointments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No appointments today
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.today_appointments.map((apt) => {
                      const action = statusActions[apt.status]
                      return (
                        <TableRow key={apt.id}>
                          <TableCell>
                            {format(parseISO(apt.scheduled_at), "HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {getPatientName(apt)}
                          </TableCell>
                          <TableCell>{apt.doctor?.name ?? "-"}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[apt.status] ?? ""}`}
                            >
                              {appointmentStatusConfig[apt.status]?.label ??
                                apt.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {action && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === apt.id}
                                onClick={() =>
                                  handleStatusUpdate(apt.id, action.nextStatus)
                                }
                              >
                                {actionLoading === apt.id
                                  ? "..."
                                  : action.label}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${action.gradient}`}
                    >
                      <action.icon className="size-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pending Payments */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.pending_payments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No pending payments
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pending_payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {getPatientName(payment)}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {paymentTypeLabels[payment.payment_type] ??
                          payment.payment_type}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === payment.id}
                          onClick={() => handleMarkPaid(payment.id)}
                        >
                          {actionLoading === payment.id ? "..." : "Mark Paid"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

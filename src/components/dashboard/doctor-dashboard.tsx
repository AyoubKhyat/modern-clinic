"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import {
  Stethoscope,
  CheckCircle,
  Clock,
  ClipboardList,
  FileText,
  CalendarPlus,
  Pill,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dashboardApi, appointmentsApi } from "@/lib/api"
import { statusColorMap, appointmentStatusConfig, visitStatusConfig } from "@/lib/constants"
import { useAuthStore } from "@/stores/auth-store"
import type { DoctorDashboard } from "@/types"

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

const quickActions = [
  { label: "Start Visit", href: "/visits", icon: Stethoscope, gradient: "from-blue-500 to-blue-600" },
  { label: "Prescriptions", href: "/prescriptions", icon: Pill, gradient: "from-teal-500 to-teal-600" },
  { label: "Schedule", href: "/appointments", icon: CalendarPlus, gradient: "from-purple-500 to-purple-600" },
]

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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

export function DoctorDashboardView() {
  const [data, setData] = useState<DoctorDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetchData = () => {
    dashboardApi
      .doctor()
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleStartConsultation = async (appointmentId: number) => {
    try {
      await appointmentsApi.updateStatus(appointmentId, "completed")
      fetchData()
    } catch {
      // silently handle
    }
  }

  if (loading) return <DashboardSkeleton />
  if (error)
    return (
      <div className="py-12 text-center text-muted-foreground">{error}</div>
    )
  if (!data) return null

  const nextPatientName =
    data.next_patient?.patient?.full_name ??
    (data.next_patient?.patient?.first_name
      ? `${data.next_patient.patient.first_name} ${data.next_patient.patient.last_name ?? ""}`.trim()
      : null)

  const statCards = [
    {
      label: "Patients Today",
      value: data.today_appointments.length,
      icon: Stethoscope,
      gradient: "from-blue-500/[0.08] to-blue-600/[0.04]",
      ring: "ring-blue-500/10 hover:ring-blue-500/20 hover:shadow-blue-500/5",
      iconBg: "text-blue-500/[0.06]",
    },
    {
      label: "Patients Seen",
      value: data.patients_seen_today,
      icon: CheckCircle,
      gradient: "from-emerald-500/[0.08] to-emerald-600/[0.04]",
      ring: "ring-emerald-500/10 hover:ring-emerald-500/20 hover:shadow-emerald-500/5",
      iconBg: "text-emerald-500/[0.06]",
    },
    {
      label: "Next Patient",
      value: null,
      displayValue: nextPatientName ?? "No waiting patients",
      icon: Clock,
      gradient: "from-amber-500/[0.08] to-amber-600/[0.04]",
      ring: "ring-amber-500/10 hover:ring-amber-500/20 hover:shadow-amber-500/5",
      iconBg: "text-amber-500/[0.06]",
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
            Dr. {user?.name ?? "Doctor"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")} &mdash;{" "}
            {data.today_appointments.length} patients scheduled today
          </p>
        </div>
        <div className="absolute -right-8 -top-8 size-48 rounded-full bg-gradient-to-br from-teal-400/20 to-blue-500/20 blur-3xl" />
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className="truncate text-3xl font-bold tracking-tight">
                  {stat.value !== null ? (
                    <AnimatedCounter value={stat.value} />
                  ) : (
                    stat.displayValue
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Consultation + Schedule */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Current Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              {data.current_visit ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      {getPatientName(data.current_visit)}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[data.current_visit.status] ?? ""}`}
                    >
                      {visitStatusConfig[data.current_visit.status]?.label ??
                        data.current_visit.status}
                    </span>
                  </div>

                  {data.current_visit.chief_complaint && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Chief Complaint
                      </p>
                      <p className="text-sm">
                        {data.current_visit.chief_complaint}
                      </p>
                    </div>
                  )}

                  {data.current_visit.diagnosis && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Diagnosis
                      </p>
                      <p className="text-sm">{data.current_visit.diagnosis}</p>
                    </div>
                  )}

                  {data.current_visit.vitals && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Vitals
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {data.current_visit.vitals.temperature != null && (
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                              Temperature
                            </p>
                            <p className="font-medium">
                              {data.current_visit.vitals.temperature}°C
                            </p>
                          </div>
                        )}
                        {data.current_visit.vitals.blood_pressure && (
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                              Blood Pressure
                            </p>
                            <p className="font-medium">
                              {data.current_visit.vitals.blood_pressure}
                            </p>
                          </div>
                        )}
                        {data.current_visit.vitals.heart_rate != null && (
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                              Heart Rate
                            </p>
                            <p className="font-medium">
                              {data.current_visit.vitals.heart_rate} bpm
                            </p>
                          </div>
                        )}
                        {data.current_visit.vitals.weight != null && (
                          <div className="rounded-xl bg-muted/40 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                              Weight
                            </p>
                            <p className="font-medium">
                              {data.current_visit.vitals.weight} kg
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ClipboardList className="mb-3 size-12 opacity-30" />
                  <p className="text-sm">No active consultation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Today&apos;s Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {data.today_appointments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No appointments today
                </p>
              ) : (
                <div className="space-y-3">
                  {data.today_appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {format(parseISO(apt.scheduled_at), "HH:mm")}
                          </span>
                          <span className="truncate font-medium">
                            {getPatientName(apt)}
                          </span>
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColorMap[apt.status] ?? ""}`}
                        >
                          {appointmentStatusConfig[apt.status]?.label ??
                            apt.status}
                        </span>
                      </div>
                      {apt.status === "arrived" && (
                        <Button
                          size="sm"
                          onClick={() => handleStartConsultation(apt.id)}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Prescriptions + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
            <CardHeader>
              <CardTitle>Recent Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_prescriptions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No recent prescriptions
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent_prescriptions.slice(0, 5).map((rx) => (
                      <TableRow key={rx.id}>
                        <TableCell className="font-medium">
                          {getPatientName(rx)}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(rx.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <FileText className="size-3.5 text-muted-foreground" />
                            <span>{rx.items?.length ?? 0} items</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
    </motion.div>
  )
}

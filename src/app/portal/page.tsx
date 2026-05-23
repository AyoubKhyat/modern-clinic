"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  Activity,
  Loader2,
  Phone,
  LogOut,
  User,
  Calendar,
  Pill,
  CreditCard,
  Mail,
  Droplets,
  Clock,
  Stethoscope,
  Heart,
  Shield,
  Syringe,
  Cross,
} from "lucide-react"
import { portalApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortalPatient {
  id: number
  full_name: string
  first_name?: string
  last_name?: string
  phone: string
  email?: string
  date_of_birth?: string
  blood_type?: string
  gender?: string
  allergies?: string
}

interface PortalAppointment {
  id: number
  scheduled_at: string
  status: string
  type: string
  reason?: string
  doctor?: { id: number; name: string }
}

interface PortalPrescription {
  id: number
  created_at: string
  notes?: string
  is_active: boolean
  doctor?: { id: number; name: string }
  visit?: { diagnosis?: string }
  items?: {
    id: number
    medication_name: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
  }[]
}

interface PortalPayment {
  id: number
  amount: number
  status: string
  payment_type: string
  payment_method?: string
  description?: string
  paid_at?: string
  created_at: string
}

interface PortalData {
  patient: PortalPatient
  appointments: PortalAppointment[]
  prescriptions: PortalPrescription[]
  payments: PortalPayment[]
}

// ---------------------------------------------------------------------------
// Floating background icons (matching login page pattern)
// ---------------------------------------------------------------------------

const floatingIcons = [
  { Icon: Heart, top: "8%", left: "12%", duration: 8, delay: 0 },
  { Icon: Pill, top: "18%", right: "10%", duration: 10, delay: -2 },
  { Icon: Stethoscope, bottom: "22%", left: "8%", duration: 9, delay: -4 },
  { Icon: Shield, top: "55%", right: "15%", duration: 11, delay: -6 },
  { Icon: Syringe, bottom: "12%", right: "22%", duration: 7, delay: -3 },
  { Icon: Cross, top: "35%", left: "5%", duration: 12, delay: -8 },
]

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function appointmentStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    case "confirmed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
    case "scheduled":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
    case "cancelled":
    case "no_show":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
    case "arrived":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
  }
}

function paymentStatusColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
    case "refunded":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
  }
}

// ---------------------------------------------------------------------------
// Glass card class
// ---------------------------------------------------------------------------

const glassCard = "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

// ---------------------------------------------------------------------------
// Portal page component
// ---------------------------------------------------------------------------

export default function PatientPortalPage() {
  // Auth state
  const [token, setToken] = useState<string | null>(null)
  const [patientName, setPatientName] = useState("")

  // Login form state
  const [phone, setPhone] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")

  // Data view state
  const [data, setData] = useState<PortalData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "prescriptions" | "payments">("overview")

  // ---------------------------------------------------------------------------
  // Login handler
  // ---------------------------------------------------------------------------

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError("")

    const cleaned = phone.replace(/\s/g, "")
    if (!cleaned || cleaned.length < 8) {
      setLoginError("Please enter a valid phone number (at least 8 digits).")
      return
    }

    setLoginLoading(true)
    try {
      const { data: res } = await portalApi.login(cleaned)
      const t = res.token
      const name = res.patient?.name || res.patient?.full_name || "Patient"
      setToken(t)
      setPatientName(name)
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setLoginError(err.response.data.message)
      } else if (err?.request && !err?.response) {
        setLoginError("Unable to connect to the server. Please try again later.")
      } else {
        setLoginError("Phone number not found. Please check and try again.")
      }
    } finally {
      setLoginLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Fetch patient data after login
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!token) return

    let cancelled = false
    setDataLoading(true)

    portalApi
      .getData(token)
      .then(({ data: res }) => {
        if (!cancelled) {
          setData(res)
          if (res.patient?.full_name) setPatientName(res.patient.full_name)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
          setLoginError("Session expired. Please log in again.")
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  function handleLogout() {
    setToken(null)
    setData(null)
    setPatientName("")
    setPhone("")
    setActiveTab("overview")
    setLoginError("")
  }

  // ---------------------------------------------------------------------------
  // Tabs config
  // ---------------------------------------------------------------------------

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: User },
    { key: "appointments" as const, label: "Appointments", icon: Calendar },
    { key: "prescriptions" as const, label: "Prescriptions", icon: Pill },
    { key: "payments" as const, label: "Payments", icon: CreditCard },
  ]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      {/* Animated gradient orbs */}
      <div
        className="fixed left-[-10%] top-[-10%] size-[600px] rounded-full opacity-40 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, oklch(0.8 0.15 180 / 40%) 0%, transparent 70%)",
          animation: "aurora-shift 15s ease-in-out infinite",
          backgroundSize: "400% 400%",
        }}
      />
      <div
        className="fixed right-[-5%] top-[20%] size-[500px] rounded-full opacity-30 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, oklch(0.7 0.18 260 / 40%) 0%, transparent 70%)",
          animation: "aurora-shift 18s ease-in-out infinite",
          animationDelay: "-5s",
          backgroundSize: "400% 400%",
        }}
      />
      <div
        className="fixed bottom-[-10%] left-[30%] size-[550px] rounded-full opacity-25 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, oklch(0.75 0.15 300 / 35%) 0%, transparent 70%)",
          animation: "aurora-shift 20s ease-in-out infinite",
          animationDelay: "-10s",
          backgroundSize: "400% 400%",
        }}
      />

      {/* Floating medical icons */}
      {floatingIcons.map(({ Icon, duration, delay, ...pos }, i) => (
        <div
          key={i}
          className="fixed text-foreground/[0.04] dark:text-white/[0.06]"
          style={{
            ...pos,
            animation: `float-particle ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
          }}
        >
          <Icon className="size-10" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {!token ? (
            /* -----------------------------------------------------------
             * LOGIN VIEW
             * ----------------------------------------------------------- */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-screen items-center justify-center px-4"
            >
              <div className="w-full max-w-md">
                <div className="glass-card noise-overlay rounded-2xl overflow-hidden">
                  <div className="relative z-10 px-8 pb-8 pt-10">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4 pb-6">
                      <div className="relative inline-flex items-center justify-center">
                        <div
                          className="absolute inset-[-4px] rounded-2xl bg-gradient-to-r from-teal-400 via-blue-500 to-indigo-500 blur-sm"
                          style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
                        />
                        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg logo-glow">
                          <Activity className="size-8 text-white" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight">Patient Portal</h1>
                        <p className="mt-1.5 text-sm font-medium text-muted-foreground/80">
                          Enter your phone number to access your records
                        </p>
                      </div>
                    </div>

                    {/* Login form */}
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                        >
                          {loginError}
                        </motion.div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="phone" className="text-sm font-medium">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+212 6XX XXX XXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            autoComplete="tel"
                            className="h-11 rounded-xl border-white/20 bg-white/50 pl-10 transition-all duration-300 focus-visible:border-teal-400/50 focus-visible:bg-white/80 focus-visible:ring-teal-400/20 focus-visible:shadow-[0_0_20px_oklch(0.75_0.15_180/12%)] dark:border-white/10 dark:bg-white/5 dark:focus-visible:bg-white/10"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loginLoading}
                        className="btn-shimmer mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:from-teal-400 hover:to-blue-500 hover:shadow-[0_4px_24px_oklch(0.7_0.15_180/30%)]"
                      >
                        {loginLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          "Access My Records"
                        )}
                      </Button>
                    </form>
                  </div>
                </div>

                <p className="mt-6 text-center text-xs text-foreground/25 dark:text-white/20">
                  Modern AI Clinic OS &mdash; Patient Portal
                </p>
              </div>
            </motion.div>
          ) : (
            /* -----------------------------------------------------------
             * DATA VIEW
             * ----------------------------------------------------------- */
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-screen"
            >
              {/* Header */}
              <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-b border-white/20 dark:border-white/10">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-sm">
                      <Activity className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Welcome back,</p>
                      <p className="text-base font-semibold leading-tight">{patientName}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    Logout
                  </Button>
                </div>
              </header>

              {/* Main content */}
              <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                {dataLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-24">
                    <Loader2 className="size-8 animate-spin text-teal-500" />
                    <p className="text-sm text-muted-foreground">Loading your records...</p>
                  </div>
                ) : data ? (
                  <>
                    {/* Tab navigation */}
                    <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-white/50 p-1 backdrop-blur-sm dark:bg-white/5 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
                      {tabs.map((tab) => {
                        const isActive = activeTab === tab.key
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                              isActive
                                ? "bg-white text-foreground shadow-sm dark:bg-white/10"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <tab.icon className="size-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Tab content */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        {activeTab === "overview" && <OverviewTab patient={data.patient} />}
                        {activeTab === "appointments" && <AppointmentsTab appointments={data.appointments} />}
                        {activeTab === "prescriptions" && <PrescriptionsTab prescriptions={data.prescriptions} />}
                        {activeTab === "payments" && <PaymentsTab payments={data.payments} />}
                      </motion.div>
                    </AnimatePresence>
                  </>
                ) : null}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ patient }: { patient: PortalPatient }) {
  const infoItems = [
    { icon: User, label: "Full Name", value: patient.full_name },
    { icon: Phone, label: "Phone", value: patient.phone },
    { icon: Mail, label: "Email", value: patient.email || "Not provided" },
    {
      icon: Calendar,
      label: "Date of Birth",
      value: patient.date_of_birth
        ? format(parseISO(patient.date_of_birth), "MMM d, yyyy")
        : "Not provided",
    },
    { icon: Droplets, label: "Blood Type", value: patient.blood_type || "Not recorded" },
    { icon: User, label: "Gender", value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "Not provided" },
  ]

  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5 text-teal-500" />
          Patient Information
        </CardTitle>
        <CardDescription>Your personal and medical details on file</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 dark:bg-white/5"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <item.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-sm font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {patient.allergies && (
          <>
            <Separator className="my-4" />
            <div className="rounded-xl bg-red-50/60 p-3 dark:bg-red-900/10">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">Allergies</p>
              <p className="mt-1 text-sm">{patient.allergies}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Appointments tab
// ---------------------------------------------------------------------------

function AppointmentsTab({ appointments }: { appointments: PortalAppointment[] }) {
  if (!appointments.length) {
    return (
      <Card className={glassCard}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No appointments found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5 text-teal-500" />
          Appointments
        </CardTitle>
        <CardDescription>{appointments.length} appointment{appointments.length !== 1 ? "s" : ""} on record</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {format(parseISO(apt.scheduled_at), "EEE, MMM d, yyyy")}
                    <span className="ml-1.5 text-muted-foreground">
                      at {format(parseISO(apt.scheduled_at), "h:mm a")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {apt.doctor?.name || "Doctor"} &middot; {apt.type}
                    {apt.reason ? ` &mdash; ${apt.reason}` : ""}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${appointmentStatusColor(
                  apt.status
                )}`}
              >
                {apt.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Prescriptions tab
// ---------------------------------------------------------------------------

function PrescriptionsTab({ prescriptions }: { prescriptions: PortalPrescription[] }) {
  if (!prescriptions.length) {
    return (
      <Card className={glassCard}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Pill className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No prescriptions found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="size-5 text-teal-500" />
          Prescriptions
        </CardTitle>
        <CardDescription>{prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} on record</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="rounded-xl bg-muted/40 p-4 dark:bg-white/5"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{rx.doctor?.name || "Doctor"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(rx.created_at), "MMM d, yyyy")}
                  </span>
                  {rx.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Diagnosis */}
              {rx.visit?.diagnosis && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Diagnosis:</span> {rx.visit.diagnosis}
                </p>
              )}

              {/* Medications */}
              {rx.items && rx.items.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rx.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-0.5 rounded-lg bg-white/60 p-2.5 dark:bg-white/5"
                    >
                      <p className="text-sm font-medium">{item.medication_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.dosage} &middot; {item.frequency} &middot; {item.duration}
                      </p>
                      {item.instructions && (
                        <p className="text-xs text-muted-foreground italic">{item.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {rx.notes && (
                <p className="mt-2 text-xs text-muted-foreground italic">Note: {rx.notes}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Payments tab
// ---------------------------------------------------------------------------

function PaymentsTab({ payments }: { payments: PortalPayment[] }) {
  if (!payments.length) {
    return (
      <Card className={glassCard}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CreditCard className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No payments found</p>
        </CardContent>
      </Card>
    )
  }

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <Card className={glassCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5 text-teal-500" />
          Payments
        </CardTitle>
        <CardDescription>{payments.length} payment{payments.length !== 1 ? "s" : ""} on record</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50/60 p-3 dark:bg-emerald-900/10">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Paid</p>
            <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {totalPaid.toLocaleString("en-US", { style: "currency", currency: "MAD" })}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50/60 p-3 dark:bg-amber-900/10">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</p>
            <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
              {totalPending.toLocaleString("en-US", { style: "currency", currency: "MAD" })}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Payment list */}
        <div className="space-y-3">
          {payments.map((pay) => (
            <div
              key={pay.id}
              className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {pay.amount.toLocaleString("en-US", { style: "currency", currency: "MAD" })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(parseISO(pay.created_at), "MMM d, yyyy")}
                    {" "}&middot;{" "}
                    {pay.payment_type.replace("_", " ")}
                    {pay.description ? ` — ${pay.description}` : ""}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${paymentStatusColor(
                  pay.status
                )}`}
              >
                {pay.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

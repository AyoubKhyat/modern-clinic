"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  ChevronLeft,
  Phone,
  Mail,
  Calendar,
  User,
  Edit,
  Loader2,
  Inbox,
  Activity,
  Stethoscope,
  CreditCard,
  Clock,
} from "lucide-react"
import { patientsApi, appointmentsApi, visitsApi, paymentsApi } from "@/lib/api"
import type { Patient, Appointment, Visit, Payment } from "@/types"
import { PatientForm } from "@/components/patients/patient-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const { toast } = useToast()

  const fetchPatient = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await patientsApi.get(Number(id))
      setPatient(data.data ?? data)
    } catch {
      router.push("/patients")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchPatient()
  }, [fetchPatient])

  function handleEditSuccess() {
    setEditOpen(false)
    fetchPatient()
    toast("Patient updated successfully")
  }

  if (loading) return <DetailSkeleton />
  if (!patient) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" render={<Link href="/patients" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Patients</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-lg font-bold text-white shadow-lg">
            {patient.first_name[0]}
            {patient.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {patient.full_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {patient.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {patient.email}
                </span>
              )}
              {patient.date_of_birth && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {format(parseISO(patient.date_of_birth), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Edit className="size-4" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Appointments" value={patient.appointments_count ?? 0} />
        <StatCard label="Visits" value={patient.visits_count ?? 0} />
        <StatCard
          label="Blood Type"
          value={patient.blood_type || "N/A"}
          isBadge={!!patient.blood_type}
        />
        <StatCard label="Gender" value={patient.gender || "N/A"} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab patient={patient} />
        </TabsContent>
        <TabsContent value="timeline" className="pt-4">
          <TimelineTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="appointments" className="pt-4">
          <AppointmentsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="visits" className="pt-4">
          <VisitsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="payments" className="pt-4">
          <PaymentsTab patientId={patient.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update the patient's information below.
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            patient={patient}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function StatCard({
  label,
  value,
  isBadge,
}: {
  label: string
  value: string | number
  isBadge?: boolean
}) {
  return (
    <Card className="border-0 bg-gradient-to-br from-teal-500/[0.06] to-blue-500/[0.04] shadow-sm ring-1 ring-teal-500/10 dark:from-teal-500/[0.04] dark:to-blue-500/[0.03]">
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        {isBadge ? (
          <Badge variant="secondary" className="text-sm">
            {value}
          </Badge>
        ) : (
          <span className="text-lg font-semibold">{value}</span>
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  )
}

function OverviewTab({ patient }: { patient: Patient }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
        <CardHeader className="pb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <User className="size-4" />
            Personal Information
          </h3>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <InfoRow label="First Name" value={patient.first_name} />
          <InfoRow label="Last Name" value={patient.last_name} />
          <InfoRow
            label="Date of Birth"
            value={
              patient.date_of_birth
                ? format(parseISO(patient.date_of_birth), "MMM d, yyyy")
                : undefined
            }
          />
          <InfoRow label="Gender" value={patient.gender} />
          <InfoRow label="Phone" value={patient.phone} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Address" value={patient.address} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Medical Information</h3>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Blood Type" value={patient.blood_type} />
            <InfoRow label="Allergies" value={patient.allergies} />
            <InfoRow
              label="Emergency Contact"
              value={patient.emergency_contact_name}
            />
            <InfoRow
              label="Emergency Phone"
              value={patient.emergency_contact_phone}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Notes</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {patient.notes || "No notes recorded."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AppointmentsTab({ patientId }: { patientId: number }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await appointmentsApi.list({ patient_id: patientId })
        setAppointments(data.data ?? [])
      } catch {
        // silently handled
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  if (loading) return <TabSkeleton />

  if (appointments.length === 0) {
    return <TabEmpty label="No appointments found for this patient." />
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {appointments.map((apt) => (
        <Card key={apt.id} className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {format(parseISO(apt.scheduled_at), "MMM d, yyyy")}
              </span>
              <StatusBadge status={apt.status} />
            </div>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(apt.scheduled_at), "h:mm a")} &middot;{" "}
              {apt.duration_minutes} min
            </span>
            {apt.reason && (
              <p className="text-sm text-muted-foreground">{apt.reason}</p>
            )}
            {apt.doctor && (
              <span className="text-xs text-muted-foreground">
                Dr. {apt.doctor.name}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function VisitsTab({ patientId }: { patientId: number }) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await visitsApi.list({ patient_id: patientId })
        setVisits(data.data ?? [])
      } catch {
        // silently handled
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  if (loading) return <TabSkeleton />

  if (visits.length === 0) {
    return <TabEmpty label="No visits recorded for this patient." />
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visits.map((visit) => (
        <Card key={visit.id} className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {format(parseISO(visit.created_at), "MMM d, yyyy")}
              </span>
              <StatusBadge status={visit.status} />
            </div>
            {visit.chief_complaint && (
              <p className="text-sm">{visit.chief_complaint}</p>
            )}
            {visit.diagnosis && (
              <p className="text-sm text-muted-foreground">
                Dx: {visit.diagnosis}
              </p>
            )}
            {visit.doctor && (
              <span className="text-xs text-muted-foreground">
                Dr. {visit.doctor.name}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PaymentsTab({ patientId }: { patientId: number }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await paymentsApi.list({ patient_id: patientId })
        setPayments(data.data ?? [])
      } catch {
        // silently handled
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  if (loading) return <TabSkeleton />

  if (payments.length === 0) {
    return <TabEmpty label="No payments recorded for this patient." />
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {payments.map((payment) => (
        <Card key={payment.id} className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">
                {payment.amount.toFixed(2)} MAD
              </span>
              <StatusBadge status={payment.status} />
            </div>
            <span className="text-xs capitalize text-muted-foreground">
              {payment.payment_type.replace("_", " ")} &middot;{" "}
              {payment.payment_method}
            </span>
            {payment.description && (
              <p className="text-sm text-muted-foreground">
                {payment.description}
              </p>
            )}
            <span className="text-xs text-muted-foreground">
              {format(parseISO(payment.created_at), "MMM d, yyyy")}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    paid: "default",
    confirmed: "default",
    scheduled: "secondary",
    arrived: "secondary",
    waiting: "secondary",
    in_progress: "secondary",
    pending: "outline",
    cancelled: "destructive",
    no_show: "destructive",
    refunded: "destructive",
  }

  return (
    <Badge variant={variantMap[status] ?? "outline"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  )
}

function TabSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <CardContent className="flex flex-col gap-3 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TabEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <Inbox className="size-5 text-teal-600 dark:text-teal-400" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function TimelineTab({ patientId }: { patientId: number }) {
  const [events, setEvents] = useState<{ type: string; date: string; title: string; detail: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [aptsRes, visitsRes, paysRes] = await Promise.all([
          appointmentsApi.list({ patient_id: patientId, per_page: 50 }),
          visitsApi.list({ patient_id: patientId, per_page: 50 }),
          paymentsApi.list({ patient_id: patientId, per_page: 50 }),
        ])
        const items: { type: string; date: string; title: string; detail: string }[] = []
        for (const a of aptsRes.data.data ?? []) {
          items.push({ type: "appointment", date: a.scheduled_at || a.created_at, title: `Appointment — ${a.type}`, detail: a.reason || a.status })
        }
        for (const v of visitsRes.data.data ?? []) {
          items.push({ type: "visit", date: v.created_at, title: `Visit — ${v.status}`, detail: v.chief_complaint || v.diagnosis || "" })
        }
        for (const p of paysRes.data.data ?? []) {
          items.push({ type: "payment", date: p.created_at, title: `Payment — ${p.amount} MAD`, detail: `${p.payment_type} (${p.status})` })
        }
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setEvents(items)
      } catch {}
      setLoading(false)
    })()
  }, [patientId])

  if (loading) return <TabSkeleton />
  if (events.length === 0) return <TabEmpty label="No activity recorded for this patient." />

  const iconMap: Record<string, typeof Calendar> = { appointment: Calendar, visit: Stethoscope, payment: CreditCard }
  const colorMap: Record<string, string> = {
    appointment: "bg-blue-500",
    visit: "bg-teal-500",
    payment: "bg-emerald-500",
  }

  return (
    <div className="relative space-y-4 pl-8">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-teal-400/50 via-border to-transparent" />
      {events.map((event, i) => {
        const Icon = iconMap[event.type] ?? Clock
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative"
          >
            <div className={`absolute -left-5 top-2 size-2.5 rounded-full ring-2 ring-background ${colorMap[event.type] ?? "bg-gray-400"}`} />
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {event.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(event.date), "MMM d, yyyy")}
                </span>
              </div>
              {event.detail && <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-8 w-96" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  )
}

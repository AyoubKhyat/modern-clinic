"use client"

import { useState, useEffect, useCallback, useRef, use } from "react"
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
  FileText,
  Shield,
  FlaskConical,
  Syringe,
  ArrowRightLeft,
  Plus,
  ClipboardList,
  ShieldAlert,
  StickyNote,
  FileSignature,
  MessageCircle,
  HeartPulse,
} from "lucide-react"
import { patientsApi, appointmentsApi, visitsApi, paymentsApi, patientStatsApi, labOrdersApi, vaccinationsApi, referralsApi, timelineApi } from "@/lib/api"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { CertificatesTab } from "./certificates-tab"
import { TreatmentPlansTab } from "./treatment-plans-tab"
import { AllergiesTab } from "./allergies-tab"
import { ClinicalNotesTab } from "./clinical-notes-tab"
import { ConsentsTab } from "./consents-tab"
import { DocumentsTab as DocumentsTabNew } from "./documents-tab"
import { CommunicationsTab } from "./communications-tab"
import { MedicalSummaryTab } from "./medical-summary-tab"

const DOCTORS = [
  { value: "2", label: "Dr. Amina Tazi" },
  { value: "3", label: "Dr. Youssef El Idrissi" },
]

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

      <PatientStatsCards patientId={patient.id} bloodType={patient.blood_type} />

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="timeline">
            <Clock className="size-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="lab-results">
            <FlaskConical className="size-4" />
            Lab Results
          </TabsTrigger>
          <TabsTrigger value="vaccinations">
            <Syringe className="size-4" />
            Vaccinations
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <ArrowRightLeft className="size-4" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <FileText className="size-4" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="treatment-plans">
            <ClipboardList className="size-4" />
            Treatment Plans
          </TabsTrigger>
          <TabsTrigger value="allergies">
            <ShieldAlert className="size-4" />
            Allergies
          </TabsTrigger>
          <TabsTrigger value="clinical-notes">
            <StickyNote className="size-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="consents">
            <FileSignature className="size-4" />
            Consents
          </TabsTrigger>
          <TabsTrigger value="communications">
            <MessageCircle className="size-4" />
            Comms
          </TabsTrigger>
          <TabsTrigger value="medical-summary">
            <HeartPulse className="size-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="pt-4">
          <TimelineTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="overview" className="pt-4">
          <OverviewTab patient={patient} />
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
        <TabsContent value="documents" className="pt-4">
          <DocumentsTabNew patientId={patient.id} />
        </TabsContent>
        <TabsContent value="lab-results" className="pt-4">
          <LabResultsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="vaccinations" className="pt-4">
          <VaccinationsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="referrals" className="pt-4">
          <ReferralsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="certificates" className="pt-4">
          <CertificatesTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="treatment-plans" className="pt-4">
          <TreatmentPlansTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="allergies" className="pt-4">
          <AllergiesTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="clinical-notes" className="pt-4">
          <ClinicalNotesTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="consents" className="pt-4">
          <ConsentsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="communications" className="pt-4">
          <CommunicationsTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="medical-summary" className="pt-4">
          <MedicalSummaryTab patientId={patient.id} />
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

function PatientStatsCards({ patientId, bloodType }: { patientId: number; bloodType?: string | null }) {
  const [stats, setStats] = useState<{
    total_spend: number
    pending_payments: number
    visit_count: number
    appointment_count: number
    last_visit: string | null
    last_appointment: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await patientStatsApi.get(patientId)
        setStats(data.data ?? data)
      } catch {
        // silently handled
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Total Spend"
        value={`${(stats?.total_spend ?? 0).toFixed(2)} MAD`}
      />
      <StatCard
        label="Pending Payments"
        value={`${(stats?.pending_payments ?? 0).toFixed(2)} MAD`}
      />
      <StatCard label="Visits" value={stats?.visit_count ?? 0} />
      <StatCard label="Appointments" value={stats?.appointment_count ?? 0} />
      <StatCard
        label="Last Visit"
        value={
          stats?.last_visit
            ? format(parseISO(stats.last_visit), "MMM d, yyyy")
            : "N/A"
        }
      />
      <StatCard
        label="Blood Type"
        value={bloodType || "N/A"}
        isBadge={!!bloodType}
      />
    </div>
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
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="size-4" />
              Insurance Information
            </h3>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Insurance Provider" value={patient.insurance_provider} />
            <InfoRow label="Insurance Number" value={patient.insurance_number} />
            <InfoRow label="Insurance Type" value={patient.insurance_type} />
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

interface TimelineEvent {
  type: "visit" | "appointment" | "prescription" | "lab" | "vaccination" | "referral" | "payment"
  id: number
  title: string
  detail: string
  status: string
  doctor: string
  date: string
}

const timelineIconMap: Record<TimelineEvent["type"], typeof Calendar> = {
  visit: Stethoscope,
  appointment: Calendar,
  prescription: FileText,
  lab: FlaskConical,
  vaccination: Syringe,
  referral: ArrowRightLeft,
  payment: CreditCard,
}

const timelineBadgeColor: Record<TimelineEvent["type"], string> = {
  visit: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  appointment: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  prescription: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  lab: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  vaccination: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  referral: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  payment: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
}

const timelineDotColor: Record<TimelineEvent["type"], string> = {
  visit: "bg-teal-500",
  appointment: "bg-blue-500",
  prescription: "bg-violet-500",
  lab: "bg-amber-500",
  vaccination: "bg-emerald-500",
  referral: "bg-pink-500",
  payment: "bg-indigo-500",
}

const timelineFilterLabels: { value: TimelineEvent["type"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "visit", label: "Visits" },
  { value: "appointment", label: "Appointments" },
  { value: "prescription", label: "Prescriptions" },
  { value: "lab", label: "Lab" },
  { value: "vaccination", label: "Vaccinations" },
  { value: "referral", label: "Referrals" },
  { value: "payment", label: "Payments" },
]

function TimelineTab({ patientId }: { patientId: number }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TimelineEvent["type"] | "all">("all")
  const { toast } = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await timelineApi.get(patientId)
        setEvents(data.data ?? data ?? [])
      } catch {
        toast("Failed to load timeline", "error")
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId, toast])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="relative space-y-4 pl-10">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative">
              <Skeleton className="absolute -left-6 top-4 size-3 rounded-full" />
              <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter)

  if (events.length === 0) {
    return <TabEmpty label="No activity recorded for this patient." />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {timelineFilterLabels.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <TabEmpty label="No events match the selected filter." />
      ) : (
        <div className="relative space-y-4 pl-10">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-teal-400/60 via-border to-transparent" />

          {filtered.map((event, i) => {
            const Icon = timelineIconMap[event.type] ?? Clock
            return (
              <motion.div
                key={`${event.type}-${event.id}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="relative"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-6 top-4 size-3 rounded-full ring-[3px] ring-background ${timelineDotColor[event.type] ?? "bg-gray-400"}`}
                />

                <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
                  <CardContent className="flex flex-col gap-2 py-4">
                    {/* Header: title + type badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        {event.title}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          timelineBadgeColor[event.type] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {event.type}
                      </span>
                    </div>

                    {/* Detail */}
                    {event.detail && (
                      <p className="text-sm text-muted-foreground">{event.detail}</p>
                    )}

                    {/* Footer: doctor, date, status */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {event.doctor && (
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="size-3" />
                          {event.doctor}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {format(parseISO(event.date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {event.status && <StatusBadge status={event.status} />}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
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

/* ------------------------------------------------------------------ */
/*  Lab Results Tab (Task #42)                                        */
/* ------------------------------------------------------------------ */

interface LabOrder {
  id: number
  test_name: string
  status: string
  result: string | null
  result_date: string | null
  doctor_name: string | null
  created_at: string
}

const labStatusColor: Record<string, string> = {
  ordered: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

function LabResultsTab({ patientId }: { patientId: number }) {
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ test_name: "", notes: "" })
  const { toast } = useToast()

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await labOrdersApi.list({ patient_id: patientId })
      setOrders(data.data ?? data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function handleCreate() {
    if (!form.test_name.trim()) return
    setSubmitting(true)
    try {
      await labOrdersApi.create({ patient_id: patientId, test_name: form.test_name, notes: form.notes })
      toast("Lab order created successfully")
      setDialogOpen(false)
      setForm({ test_name: "", notes: "" })
      setLoading(true)
      await fetchOrders()
    } catch {
      toast("Failed to create lab order")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <TabSkeleton />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {orders.length} lab result{orders.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Order Test
        </Button>
      </div>

      {orders.length === 0 ? (
        <TabEmpty label="No lab results found for this patient." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
                      <span className="text-sm font-medium">{order.test_name}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${labStatusColor[order.status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  {order.status === "completed" && order.result && (
                    <p className="text-sm text-muted-foreground">{order.result}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {order.doctor_name && <span>Dr. {order.doctor_name}</span>}
                    {order.doctor_name && order.result_date && <span>&middot;</span>}
                    {order.result_date && (
                      <span>{format(parseISO(order.result_date), "MMM d, yyyy")}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Ordered: {format(parseISO(order.created_at), "MMM d, yyyy")}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
            <DialogDescription>Order a new lab test for this patient.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lab-test-name">Test Name</Label>
              <Input
                id="lab-test-name"
                placeholder="e.g. Complete Blood Count"
                value={form.test_name}
                onChange={(e) => setForm((f) => ({ ...f, test_name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lab-notes">Notes</Label>
              <Textarea
                id="lab-notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting || !form.test_name.trim()}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Order Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Vaccinations Tab (Task #44)                                       */
/* ------------------------------------------------------------------ */

interface Vaccination {
  id: number
  vaccine_name: string
  dose_number: number
  administered_at: string
  next_dose_date: string | null
  administered_by_name: string | null
  batch_number: string | null
  notes: string | null
}

function VaccinationsTab({ patientId }: { patientId: number }) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    vaccine_name: "",
    dose_number: "1",
    administered_at: "",
    next_dose_date: "",
    batch_number: "",
    notes: "",
  })
  const { toast } = useToast()

  const fetchVaccinations = useCallback(async () => {
    try {
      const { data } = await vaccinationsApi.list(patientId)
      setVaccinations(data.data ?? data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchVaccinations()
  }, [fetchVaccinations])

  async function handleCreate() {
    if (!form.vaccine_name.trim() || !form.administered_at) return
    setSubmitting(true)
    try {
      await vaccinationsApi.create({
        patient_id: patientId,
        vaccine_name: form.vaccine_name,
        dose_number: Number(form.dose_number),
        administered_at: form.administered_at,
        next_dose_date: form.next_dose_date || null,
        batch_number: form.batch_number || null,
        notes: form.notes || null,
      })
      toast("Vaccination recorded successfully")
      setDialogOpen(false)
      setForm({ vaccine_name: "", dose_number: "1", administered_at: "", next_dose_date: "", batch_number: "", notes: "" })
      setLoading(true)
      await fetchVaccinations()
    } catch {
      toast("Failed to record vaccination")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <TabSkeleton />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {vaccinations.length} vaccination{vaccinations.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Record Vaccination
        </Button>
      </div>

      {vaccinations.length === 0 ? (
        <TabEmpty label="No vaccinations recorded for this patient." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vaccinations.map((vax, i) => (
            <motion.div
              key={vax.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Syringe className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
                      <span className="text-sm font-medium">{vax.vaccine_name}</span>
                    </div>
                    <Badge variant="secondary">Dose {vax.dose_number}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Administered: {format(parseISO(vax.administered_at), "MMM d, yyyy")}</span>
                  </div>
                  {vax.next_dose_date && (
                    <span className="text-xs text-muted-foreground">
                      Next dose: {format(parseISO(vax.next_dose_date), "MMM d, yyyy")}
                    </span>
                  )}
                  {vax.batch_number && (
                    <span className="text-xs text-muted-foreground">
                      Batch: {vax.batch_number}
                    </span>
                  )}
                  {vax.administered_by_name && (
                    <span className="text-xs text-muted-foreground">
                      By: {vax.administered_by_name}
                    </span>
                  )}
                  {vax.notes && (
                    <p className="text-xs text-muted-foreground">{vax.notes}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Vaccination</DialogTitle>
            <DialogDescription>Record a new vaccination for this patient.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vax-name">Vaccine Name</Label>
              <Input
                id="vax-name"
                placeholder="e.g. Hepatitis B"
                value={form.vaccine_name}
                onChange={(e) => setForm((f) => ({ ...f, vaccine_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vax-dose">Dose Number</Label>
                <Input
                  id="vax-dose"
                  type="number"
                  min="1"
                  value={form.dose_number}
                  onChange={(e) => setForm((f) => ({ ...f, dose_number: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vax-batch">Batch Number</Label>
                <Input
                  id="vax-batch"
                  placeholder="e.g. LOT-12345"
                  value={form.batch_number}
                  onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vax-date">Administered Date</Label>
                <Input
                  id="vax-date"
                  type="date"
                  value={form.administered_at}
                  onChange={(e) => setForm((f) => ({ ...f, administered_at: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vax-next">Next Dose Date</Label>
                <Input
                  id="vax-next"
                  type="date"
                  value={form.next_dose_date}
                  onChange={(e) => setForm((f) => ({ ...f, next_dose_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vax-notes">Notes</Label>
              <Textarea
                id="vax-notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting || !form.vaccine_name.trim() || !form.administered_at}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Record Vaccination
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Referrals Tab (Task #45)                                          */
/* ------------------------------------------------------------------ */

interface Referral {
  id: number
  referring_doctor_name: string | null
  referred_to_name: string | null
  reason: string
  status: string
  priority: string
  outcome: string | null
  created_at: string
}

const referralStatusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const referralPriorityColor: Record<string, string> = {
  normal: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  urgent: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  emergency: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

function ReferralsTab({ patientId }: { patientId: number }) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    referred_to_doctor_id: "",
    reason: "",
    priority: "normal",
    notes: "",
  })
  const { toast } = useToast()

  const fetchReferrals = useCallback(async () => {
    try {
      const { data } = await referralsApi.list({ patient_id: patientId })
      setReferrals(data.data ?? data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  async function handleCreate() {
    if (!form.referred_to_doctor_id || !form.reason.trim()) return
    setSubmitting(true)
    try {
      await referralsApi.create({
        patient_id: patientId,
        referred_to_doctor_id: Number(form.referred_to_doctor_id),
        reason: form.reason,
        priority: form.priority,
        notes: form.notes || null,
      })
      toast("Referral created successfully")
      setDialogOpen(false)
      setForm({ referred_to_doctor_id: "", reason: "", priority: "normal", notes: "" })
      setLoading(true)
      await fetchReferrals()
    } catch {
      toast("Failed to create referral")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <TabSkeleton />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {referrals.length} referral{referrals.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New Referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <TabEmpty label="No referrals found for this patient." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {referrals.map((ref, i) => (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-md hover:ring-foreground/10 dark:ring-foreground/[0.04]">
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
                      <span className="text-sm font-medium truncate">{ref.reason}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${referralStatusColor[ref.status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {ref.status}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${referralPriorityColor[ref.priority] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {ref.priority}
                    </span>
                  </div>
                  {ref.referring_doctor_name && (
                    <span className="text-xs text-muted-foreground">
                      From: {ref.referring_doctor_name}
                    </span>
                  )}
                  {ref.referred_to_name && (
                    <span className="text-xs text-muted-foreground">
                      To: {ref.referred_to_name}
                    </span>
                  )}
                  {ref.outcome && (
                    <p className="text-xs text-muted-foreground">Outcome: {ref.outcome}</p>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(ref.created_at), "MMM d, yyyy")}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Referral</DialogTitle>
            <DialogDescription>Create a new referral for this patient.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-doctor">Referred To</Label>
              <Select
                value={form.referred_to_doctor_id}
                onValueChange={(v) => setForm((f) => ({ ...f, referred_to_doctor_id: v ?? "" }))}
              >
                <SelectTrigger id="ref-doctor">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {DOCTORS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-reason">Reason</Label>
              <Input
                id="ref-reason"
                placeholder="Reason for referral"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v ?? "normal" }))}
              >
                <SelectTrigger id="ref-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ref-notes">Notes</Label>
              <Textarea
                id="ref-notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting || !form.referred_to_doctor_id || !form.reason.trim()}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Create Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

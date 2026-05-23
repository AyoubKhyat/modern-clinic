"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { format, parseISO, differenceInYears } from "date-fns"
import {
  ChevronLeft,
  AlertTriangle,
  Play,
  CheckCircle,
  Save,
  Loader2,
  Plus,
  Trash2,
  Printer,
  Thermometer,
  Heart,
  Activity,
  Weight,
} from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { visitsApi, prescriptionsApi } from "@/lib/api"
import { printPrescription } from "@/lib/print-prescription"
import { useI18n } from "@/lib/i18n"
import type { Visit, Prescription, PrescriptionItem } from "@/types"
import { visitStatusConfig, statusColorMap } from "@/lib/constants"
import { AiPanel } from "@/components/ai-assistant/ai-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  const [chiefComplaint, setChiefComplaint] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [notes, setNotes] = useState("")
  const [temperature, setTemperature] = useState("")
  const [bloodPressure, setBloodPressure] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [weight, setWeight] = useState("")

  const [patientVisits, setPatientVisits] = useState<Visit[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [rxFormOpen, setRxFormOpen] = useState(false)
  const { toast } = useToast()

  const fetchVisit = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await visitsApi.get(Number(id))
      const v: Visit = data.data ?? data
      setVisit(v)
      setChiefComplaint(v.chief_complaint ?? "")
      setDiagnosis(v.diagnosis ?? "")
      setNotes(v.notes ?? "")
      setTemperature(v.vitals?.temperature != null ? String(v.vitals.temperature) : "")
      setBloodPressure(v.vitals?.blood_pressure ?? "")
      setHeartRate(v.vitals?.heart_rate != null ? String(v.vitals.heart_rate) : "")
      setWeight(v.vitals?.weight != null ? String(v.vitals.weight) : "")
      setPrescriptions(v.prescriptions ?? [])

      if (v.patient?.id) {
        try {
          const { data: histData } = await visitsApi.list({
            patient_id: v.patient.id,
            per_page: 5,
          })
          setPatientVisits(
            (histData.data ?? []).filter((pv: Visit) => pv.id !== v.id)
          )
        } catch {
          // silently handled
        }
      }
    } catch {
      router.push("/visits")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchVisit()
  }, [fetchVisit])

  async function handleStartConsultation() {
    if (!visit) return
    setActionLoading(true)
    try {
      await visitsApi.start(visit.id)
      fetchVisit()
    } catch {
      toast("Failed to start consultation", "error")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCompleteVisit() {
    if (!visit) return
    setActionLoading(true)
    try {
      await visitsApi.complete(visit.id)
      fetchVisit()
    } catch {
      toast("Failed to complete visit", "error")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSave() {
    if (!visit) return
    setSaving(true)
    setError("")

    try {
      const vitals: Record<string, any> = {}
      if (temperature) vitals.temperature = Number(temperature)
      if (bloodPressure) vitals.blood_pressure = bloodPressure
      if (heartRate) vitals.heart_rate = Number(heartRate)
      if (weight) vitals.weight = Number(weight)

      await visitsApi.update(visit.id, {
        chief_complaint: chiefComplaint || undefined,
        diagnosis: diagnosis || undefined,
        notes: notes || undefined,
        vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
      })
      toast("Changes saved successfully")
    } catch {
      toast("Failed to save changes", "error")
    } finally {
      setSaving(false)
    }
  }

  function handlePrescriptionSuccess() {
    toast("Prescription created successfully")
    setRxFormOpen(false)
    fetchVisit()
  }

  if (loading) return <DetailSkeleton />
  if (!visit) return null

  const patient = visit.patient
  const isEditable = visit.status === "in_progress"
  const age =
    patient?.date_of_birth
      ? differenceInYears(new Date(), parseISO(patient.date_of_birth))
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" render={<Link href="/visits" />}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Visits</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column - Main content */}
        <div className="flex flex-col gap-6">
          {/* Patient info header */}
          {patient && (
            <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-sm font-bold text-white shadow-lg">
                    {patient.first_name?.[0]}
                    {patient.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{patient.full_name}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {age !== null && <span>{age} years</span>}
                      {patient.gender && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <span>{patient.gender}</span>
                        </>
                      )}
                      {patient.blood_type && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <Badge variant="secondary" className="text-xs">
                            {patient.blood_type}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {patient.allergies && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/30">
                    <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                    <div>
                      <span className="text-xs font-medium text-red-700 dark:text-red-400">Allergies:</span>
                      <p className="text-red-800 dark:text-red-300">{patient.allergies}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Visit status & actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={visitStatusConfig[visit.status]?.variant ?? "outline"}
              className={`text-sm ${statusColorMap[visit.status] ?? ""}`}
            >
              {visitStatusConfig[visit.status]?.label ?? visit.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(parseISO(visit.created_at), "MMM d, yyyy")}
              {visit.doctor && ` — ${visit.doctor.name}`}
            </span>
            <div className="ml-auto flex gap-2">
              {visit.status === "waiting" && (
                <Button
                  onClick={handleStartConsultation}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Start Consultation
                </Button>
              )}
              {visit.status === "in_progress" && (
                <Button
                  variant="outline"
                  onClick={handleCompleteVisit}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4" />
                  )}
                  Complete Visit
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Consultation form */}
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Consultation Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Chief Complaint</Label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  disabled={!isEditable}
                  placeholder="Patient's main concern..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Diagnosis</Label>
                <Textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  disabled={!isEditable}
                  placeholder="Clinical diagnosis..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  disabled={!isEditable}
                  placeholder="Consultation notes, observations, treatment plan..."
                />
              </div>

              <Separator />

              <div className="rounded-xl bg-gradient-to-br from-teal-500/[0.04] to-blue-500/[0.03] p-4 ring-1 ring-teal-500/[0.06] dark:from-teal-500/[0.03] dark:to-blue-500/[0.02]">
                <h4 className="mb-3 text-sm font-medium">Vitals</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <Thermometer className="size-3" />
                      Temp (C)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      disabled={!isEditable}
                      placeholder="37.0"
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <Activity className="size-3" />
                      BP
                    </Label>
                    <Input
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      disabled={!isEditable}
                      placeholder="120/80"
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <Heart className="size-3" />
                      HR (bpm)
                    </Label>
                    <Input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      disabled={!isEditable}
                      placeholder="72"
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <Weight className="size-3" />
                      Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      disabled={!isEditable}
                      placeholder="70"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {isEditable && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescriptions */}
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Prescriptions</CardTitle>
                {isEditable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRxFormOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    Add Prescription
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No prescriptions added yet.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {prescriptions.map((rx) => (
                    <PrescriptionCard key={rx.id} prescription={rx} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Sidebar */}
        <div className="flex flex-col gap-6">
          <AiPanel />

          {/* Patient history */}
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Patient History</CardTitle>
            </CardHeader>
            <CardContent>
              {patientVisits.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No previous visits.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {patientVisits.map((pv) => (
                    <Link
                      key={pv.id}
                      href={`/visits/${pv.id}`}
                      className="group flex flex-col gap-1 rounded-xl p-3 ring-1 ring-foreground/[0.06] transition-all duration-300 hover:shadow-sm hover:ring-foreground/10 dark:ring-foreground/[0.04]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {format(parseISO(pv.created_at), "MMM d, yyyy")}
                        </span>
                        <Badge
                          variant={visitStatusConfig[pv.status]?.variant ?? "outline"}
                          className="text-[10px]"
                        >
                          {visitStatusConfig[pv.status]?.label ?? pv.status}
                        </Badge>
                      </div>
                      {pv.chief_complaint && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {pv.chief_complaint}
                        </p>
                      )}
                      {pv.diagnosis && (
                        <p className="text-xs text-muted-foreground">
                          Dx: {pv.diagnosis}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prescription form dialog */}
      <Dialog open={rxFormOpen} onOpenChange={setRxFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Prescription</DialogTitle>
            <DialogDescription>
              Add medications and instructions for this visit.
            </DialogDescription>
          </DialogHeader>
          {visit && (
            <PrescriptionForm
              visitId={visit.id}
              patientId={visit.patient?.id}
              onSuccess={handlePrescriptionSuccess}
              onCancel={() => setRxFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const { locale } = useI18n()
  return (
    <div className="rounded-xl p-3 ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="font-medium">
          Prescription #{prescription.id}
        </span>
        <Badge variant={prescription.is_active ? "default" : "outline"} className="text-xs">
          {prescription.is_active ? "Active" : "Inactive"}
        </Badge>
        <Button variant="ghost" size="icon-xs" onClick={() => printPrescription(prescription, undefined, locale)} className="ml-auto">
          <Printer className="size-3.5" />
        </Button>
      </div>
      {prescription.notes && (
        <p className="mb-2 text-xs text-muted-foreground">{prescription.notes}</p>
      )}
      {prescription.items && prescription.items.length > 0 && (
        <div className="rounded-lg ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Medication</TableHead>
                <TableHead className="text-xs">Dosage</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Frequency</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescription.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs font-medium">{item.medication_name}</TableCell>
                  <TableCell className="text-xs">{item.dosage}</TableCell>
                  <TableCell className="hidden text-xs sm:table-cell">{item.frequency}</TableCell>
                  <TableCell className="hidden text-xs md:table-cell">{item.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

interface PrescriptionItemForm {
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

function PrescriptionForm({
  visitId,
  patientId,
  onSuccess,
  onCancel,
}: {
  visitId: number
  patientId?: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const [rxNotes, setRxNotes] = useState("")
  const [items, setItems] = useState<PrescriptionItemForm[]>([
    { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function addItem() {
    setItems((prev) => [
      ...prev,
      { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof PrescriptionItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const validItems = items.filter((it) => it.medication_name.trim())
    if (validItems.length === 0) {
      setError("At least one medication is required.")
      return
    }

    setLoading(true)
    try {
      await prescriptionsApi.create({
        visit_id: visitId,
        patient_id: patientId,
        notes: rxNotes || undefined,
        items: validItems.map((it) => ({
          medication_name: it.medication_name,
          dosage: it.dosage,
          frequency: it.frequency,
          duration: it.duration,
          instructions: it.instructions || undefined,
        })),
      })
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : "Failed to create prescription.")
      setError(msg || "Failed to create prescription.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Notes</Label>
        <Textarea
          value={rxNotes}
          onChange={(e) => setRxNotes(e.target.value)}
          rows={2}
          placeholder="General prescription notes..."
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Medications</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3.5" />
            Add Item
          </Button>
        </div>

        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl p-3 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
          >
            {items.length > 1 && (
              <button
                type="button"
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 flex flex-col gap-1">
                <Label className="text-xs">Medication *</Label>
                <Input
                  value={item.medication_name}
                  onChange={(e) => updateItem(index, "medication_name", e.target.value)}
                  placeholder="Medication name"
                  className="h-8 text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Dosage</Label>
                <Input
                  value={item.dosage}
                  onChange={(e) => updateItem(index, "dosage", e.target.value)}
                  placeholder="e.g., 500mg"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Frequency</Label>
                <Input
                  value={item.frequency}
                  onChange={(e) => updateItem(index, "frequency", e.target.value)}
                  placeholder="e.g., 3x/day"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Duration</Label>
                <Input
                  value={item.duration}
                  onChange={(e) => updateItem(index, "duration", e.target.value)}
                  placeholder="e.g., 7 days"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1 sm:col-span-3">
                <Label className="text-xs">Instructions</Label>
                <Input
                  value={item.instructions}
                  onChange={(e) => updateItem(index, "instructions", e.target.value)}
                  placeholder="Take after meals..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Prescription"
          )}
        </Button>
      </div>
    </form>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-32" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="ml-auto h-9 w-36" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

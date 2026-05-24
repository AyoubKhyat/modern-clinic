"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import {
  Printer,
  Activity,
  Pill,
  AlertTriangle,
  FileText,
  StickyNote,
  Calendar,
} from "lucide-react"
import { medicalSummaryApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Patient {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  phone: string
  email?: string
}

interface Visit {
  id: number
  visit_date: string
  diagnosis: string | null
  treatment: string | null
  status: string
  doctor_name?: string
}

interface Prescription {
  id: number
  medication: string
  dosage: string
  frequency: string
  start_date: string
  end_date: string | null
  status: string
}

interface Allergy {
  id: number
  allergen: string
  severity: "mild" | "moderate" | "severe" | "life_threatening"
  reaction: string | null
}

interface Document {
  id: number
  title: string
  type: string
  created_at: string
}

interface ClinicalNote {
  id: number
  title: string
  content: string
  note_type: string | null
  created_at: string
  doctor_name?: string
}

interface Consent {
  id: number
  form_name: string
  signed_at: string
}

interface MedicalSummaryData {
  patient: Patient
  visits: Visit[]
  prescriptions: Prescription[]
  allergies: Allergy[]
  documents: Document[]
  clinical_notes: ClinicalNote[]
  consents: Consent[]
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const severityConfig: Record<
  string,
  { label: string; badgeClass: string }
> = {
  mild: {
    label: "Mild",
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  moderate: {
    label: "Moderate",
    badgeClass:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  severe: {
    label: "Severe",
    badgeClass:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  life_threatening: {
    label: "Life-Threatening",
    badgeClass:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
}

const noteTypeConfig: Record<string, { label: string; color: string }> = {
  SOAP: {
    label: "SOAP",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
  Progress: {
    label: "Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  Procedure: {
    label: "Procedure",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  Consultation: {
    label: "Consultation",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  Other: {
    label: "Other",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function MedicalSummaryTab({ patientId }: { patientId: number }) {
  const [data, setData] = useState<MedicalSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await medicalSummaryApi.get(patientId)
        setData(res.data)
      } catch {
        toast("Failed to load medical summary", "error")
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [patientId, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
        <Activity className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Unable to load medical summary.
        </p>
      </div>
    )
  }

  const { patient, visits, prescriptions, allergies, documents, clinical_notes, consents } = data

  const activePrescriptions = prescriptions.filter(
    (p) => p.status === "active"
  )

  const sortedVisits = [...visits].sort(
    (a, b) =>
      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
  )

  const recentNotes = [...clinical_notes]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5)

  function handlePrint() {
    const allergyRows = allergies
      .map((a) => {
        const sev = severityConfig[a.severity]?.label ?? a.severity
        return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${a.allergen}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${sev}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${a.reaction ?? "-"}</td></tr>`
      })
      .join("")

    const visitRows = sortedVisits
      .map(
        (v) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${format(parseISO(v.visit_date), "MMM d, yyyy")}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${v.diagnosis ?? "-"}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${v.treatment ?? "-"}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${v.status}</td></tr>`
      )
      .join("")

    const prescriptionRows = activePrescriptions
      .map(
        (p) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.medication}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.dosage}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.frequency}</td></tr>`
      )
      .join("")

    const html = `<html>
<head>
  <title>Medical Summary - ${patient.first_name} ${patient.last_name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 28px; margin-bottom: 8px; color: #333; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    th { text-align: left; padding: 8px 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
    td { padding: 6px 12px; border-bottom: 1px solid #eee; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .print-date { text-align: right; color: #999; font-size: 11px; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Medical Summary</h1>
  <p class="meta">
    <strong>${patient.first_name} ${patient.last_name}</strong> &bull;
    DOB: ${patient.date_of_birth ? format(parseISO(patient.date_of_birth), "MMM d, yyyy") : "-"} &bull;
    Gender: ${patient.gender ?? "-"} &bull;
    Phone: ${patient.phone ?? "-"}
  </p>

  <h2>Allergies (${allergies.length})</h2>
  ${allergies.length > 0 ? `<table><thead><tr><th>Allergen</th><th>Severity</th><th>Reaction</th></tr></thead><tbody>${allergyRows}</tbody></table>` : "<p style='color:#888;font-size:13px;'>No known allergies.</p>"}

  <h2>Visits (${visits.length})</h2>
  ${visits.length > 0 ? `<table><thead><tr><th>Date</th><th>Diagnosis</th><th>Treatment</th><th>Status</th></tr></thead><tbody>${visitRows}</tbody></table>` : "<p style='color:#888;font-size:13px;'>No visits recorded.</p>"}

  <h2>Active Prescriptions (${activePrescriptions.length})</h2>
  ${activePrescriptions.length > 0 ? `<table><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr></thead><tbody>${prescriptionRows}</tbody></table>` : "<p style='color:#888;font-size:13px;'>No active prescriptions.</p>"}

  <p class="print-date">Printed on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
</body>
</html>`

    const w = window.open("", "_blank")
    if (w) {
      w.document.write(html)
      w.document.close()
      w.print()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Print Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Medical History Summary
        </h3>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4" />
          Print Summary
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={CARD_GLASS}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">
                {visits.length}
              </span>
              <span className="text-xs text-muted-foreground">Total Visits</span>
            </div>
          </CardContent>
        </Card>

        <Card className={CARD_GLASS}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Pill className="size-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">
                {activePrescriptions.length}
              </span>
              <span className="text-xs text-muted-foreground">
                Active Prescriptions
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={CARD_GLASS}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">
                {allergies.length}
              </span>
              <span className="text-xs text-muted-foreground">
                Known Allergies
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={CARD_GLASS}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FileText className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">
                {documents.length}
              </span>
              <span className="text-xs text-muted-foreground">Documents</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allergies Section */}
      <Card className={CARD_GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No known allergies recorded.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy) => {
                const cfg =
                  severityConfig[allergy.severity] ?? severityConfig.mild
                return (
                  <div
                    key={allergy.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {allergy.allergen}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
                    >
                      {cfg.label}
                    </span>
                    {allergy.reaction && (
                      <span className="text-xs text-muted-foreground">
                        - {allergy.reaction}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Timeline */}
      <Card className={CARD_GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
            Visit Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits recorded.</p>
          ) : (
            <div className="relative flex flex-col gap-0">
              {sortedVisits.map((visit, idx) => (
                <div key={visit.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {idx < sortedVisits.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-px bg-foreground/10" />
                  )}
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <div className="size-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                  </div>
                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {format(parseISO(visit.visit_date), "MMM d, yyyy")}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {visit.status}
                      </Badge>
                    </div>
                    {visit.doctor_name && (
                      <span className="text-xs text-muted-foreground">
                        Dr. {visit.doctor_name}
                      </span>
                    )}
                    {visit.diagnosis && (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Diagnosis:</span>{" "}
                        {visit.diagnosis}
                      </p>
                    )}
                    {visit.treatment && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Treatment:
                        </span>{" "}
                        {visit.treatment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Prescriptions */}
      <Card className={CARD_GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="size-4 text-teal-600 dark:text-teal-400" />
            Active Prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePrescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active prescriptions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                      Medication
                    </th>
                    <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                      Dosage
                    </th>
                    <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                      Frequency
                    </th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">
                      Start Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePrescriptions.map((rx) => (
                    <tr
                      key={rx.id}
                      className="border-b border-foreground/5 last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {rx.medication}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {rx.dosage}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {rx.frequency}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {format(parseISO(rx.start_date), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Clinical Notes */}
      <Card className={CARD_GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="size-4 text-teal-600 dark:text-teal-400" />
            Recent Clinical Notes
            {clinical_notes.length > 5 && (
              <span className="text-xs font-normal text-muted-foreground">
                (showing last 5 of {clinical_notes.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clinical notes recorded.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentNotes.map((note) => {
                const typeCfg = note.note_type
                  ? noteTypeConfig[note.note_type] ?? noteTypeConfig.Other
                  : null
                return (
                  <div
                    key={note.id}
                    className="rounded-lg bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {note.title}
                          </span>
                          {typeCfg && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeCfg.color}`}
                            >
                              {typeCfg.label}
                            </span>
                          )}
                        </div>
                        {note.doctor_name && (
                          <span className="text-xs text-muted-foreground">
                            Dr. {note.doctor_name}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(note.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

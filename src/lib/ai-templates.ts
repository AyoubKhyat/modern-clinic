import type { Visit, Patient } from "@/types"

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatVitals(vitals?: Visit["vitals"]): string {
  if (!vitals) return "No vitals recorded."
  const lines: string[] = []
  if (vitals.temperature) lines.push(`Temperature: ${vitals.temperature}°C`)
  if (vitals.blood_pressure) lines.push(`Blood Pressure: ${vitals.blood_pressure} mmHg`)
  if (vitals.heart_rate) lines.push(`Heart Rate: ${vitals.heart_rate} bpm`)
  if (vitals.weight) lines.push(`Weight: ${vitals.weight} kg`)
  return lines.length > 0 ? lines.join("\n") : "No vitals recorded."
}

export function summarizeVisit(visit: Visit): string {
  const patient = visit.patient
  const name = patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient"
  const doctor = visit.doctor?.name ?? "Unknown Doctor"
  const date = formatDate(visit.started_at ?? visit.created_at)

  let duration = "—"
  if (visit.started_at && visit.completed_at) {
    const mins = Math.round(
      (new Date(visit.completed_at).getTime() - new Date(visit.started_at).getTime()) / 60000
    )
    duration = `${mins} min`
  }

  return [
    `📋 Visit Summary`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Patient: ${name}`,
    `Doctor: Dr. ${doctor}`,
    `Date: ${date}`,
    `Duration: ${duration}`,
    `Status: ${visit.status}`,
    ``,
    `Chief Complaint:`,
    visit.chief_complaint || "Not specified",
    ``,
    `Diagnosis:`,
    visit.diagnosis || "Pending",
    ``,
    `Vitals:`,
    formatVitals(visit.vitals),
    ...(visit.notes ? [``, `Notes:`, visit.notes] : []),
    ...(visit.prescriptions?.length
      ? [
          ``,
          `Prescriptions: ${visit.prescriptions.length} item(s)`,
          ...visit.prescriptions.map(
            (rx) =>
              `  • ${rx.items?.map((i) => `${i.medication_name} ${i.dosage}`).join(", ") || "No items"}`
          ),
        ]
      : []),
  ].join("\n")
}

export function generateSOAPNote(visit: Visit): string {
  const patient = visit.patient
  const name = patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient"

  const medications =
    visit.prescriptions
      ?.flatMap((rx) => rx.items ?? [])
      .map((i) => `${i.medication_name} ${i.dosage} — ${i.frequency}, ${i.duration}`)
      .join("\n  ") || "None prescribed"

  return [
    `📝 SOAP Note — ${name}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Date: ${formatDate(visit.started_at ?? visit.created_at)}`,
    `Provider: Dr. ${visit.doctor?.name ?? "—"}`,
    ``,
    `S — Subjective`,
    `  Chief complaint: ${visit.chief_complaint || "Not documented"}`,
    ...(patient?.allergies ? [`  Known allergies: ${patient.allergies}`] : []),
    ``,
    `O — Objective`,
    `  ${formatVitals(visit.vitals).split("\n").join("\n  ")}`,
    ``,
    `A — Assessment`,
    `  ${visit.diagnosis || "Assessment pending — no diagnosis recorded yet."}`,
    ``,
    `P — Plan`,
    `  Medications:`,
    `  ${medications}`,
    ...(visit.notes ? [`  Additional notes: ${visit.notes}`] : []),
    ``,
    `Status: ${visit.status === "completed" ? "Visit completed" : "Visit in progress"}`,
  ].join("\n")
}

export function draftPatientRecap(patient: Patient, visits: Visit[]): string {
  const age = patient.date_of_birth
    ? `${Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)} years old`
    : "Age unknown"

  const recentVisits = visits.slice(0, 5)
  const diagnoses = recentVisits
    .map((v) => v.diagnosis)
    .filter(Boolean)

  return [
    `👤 Patient Recap`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Name: ${patient.first_name} ${patient.last_name}`,
    `Age: ${age}`,
    ...(patient.gender ? [`Gender: ${patient.gender}`] : []),
    ...(patient.blood_type ? [`Blood Type: ${patient.blood_type}`] : []),
    ...(patient.phone ? [`Phone: ${patient.phone}`] : []),
    ``,
    `Medical Info:`,
    `  Allergies: ${patient.allergies || "None recorded"}`,
    ...(patient.emergency_contact_name
      ? [`  Emergency Contact: ${patient.emergency_contact_name} (${patient.emergency_contact_phone || "—"})`]
      : []),
    ``,
    `Visit History: ${visits.length} total visit(s)`,
    ...(recentVisits.length > 0
      ? [
          ``,
          `Recent Visits:`,
          ...recentVisits.map(
            (v) =>
              `  • ${formatDate(v.created_at)} — ${v.diagnosis || "No diagnosis"} (${v.status})`
          ),
        ]
      : [`  No visits recorded.`]),
    ...(diagnoses.length > 0
      ? [``, `Recent Diagnoses:`, ...diagnoses.map((d) => `  • ${d}`)]
      : []),
    ...(patient.notes ? [``, `Notes:`, patient.notes] : []),
  ].join("\n")
}

export function suggestNextSteps(visit: Visit): string {
  const suggestions: string[] = []

  if (visit.status === "in_progress") {
    suggestions.push("Complete the current visit and document final diagnosis")
  }

  if (!visit.diagnosis) {
    suggestions.push("Record a diagnosis for this visit")
  }

  if (!visit.vitals || Object.keys(visit.vitals).length === 0) {
    suggestions.push("Record patient vitals (temperature, blood pressure, heart rate, weight)")
  }

  if (!visit.prescriptions?.length) {
    suggestions.push("Consider if a prescription is needed based on the diagnosis")
  } else {
    suggestions.push("Review prescribed medications and confirm dosage instructions with patient")
    suggestions.push("Schedule a follow-up appointment to monitor treatment progress")
  }

  if (visit.chief_complaint && !visit.diagnosis) {
    suggestions.push(
      `Investigate chief complaint: "${visit.chief_complaint}" — order relevant tests if needed`
    )
  }

  if (visit.patient?.allergies) {
    suggestions.push(`Verify no prescribed medications conflict with known allergies: ${visit.patient.allergies}`)
  }

  suggestions.push("Update patient records with any new information from this visit")
  suggestions.push("Ensure visit notes are complete before closing")

  return [
    `💡 Suggested Next Steps`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Patient: ${visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : "Unknown"}`,
    `Visit Status: ${visit.status}`,
    ``,
    ...suggestions.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n")
}

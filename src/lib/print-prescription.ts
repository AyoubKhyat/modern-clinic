import type { Prescription } from "@/types"

export function printPrescription(
  prescription: Prescription,
  clinicName?: string
) {
  const patientName = prescription.patient
    ? `${prescription.patient.first_name} ${prescription.patient.last_name}`
    : "—"
  const doctorName = prescription.doctor?.name ?? "—"
  const date = new Date(prescription.created_at).toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const medicationsRows = (prescription.items ?? [])
    .map(
      (item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(item.medication_name)}</strong></td>
      <td>${esc(item.dosage)}</td>
      <td>${esc(item.frequency)}</td>
      <td>${esc(item.duration)}</td>
      <td>${esc(item.instructions ?? "—")}</td>
    </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Prescription #${prescription.id}</title>
  <style>
    @page { margin: 1.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .info-box { background: #f8fafa; border-radius: 8px; padding: 12px; }
    .info-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
    .info-box .value { font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f0fdfa; color: #0d9488; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0f2f1; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .notes { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 24px; font-size: 12px; }
    .notes .label { font-weight: 600; margin-bottom: 4px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { text-align: center; }
    .signature .line { width: 200px; border-top: 1px solid #333; margin-bottom: 4px; }
    .signature p { font-size: 11px; color: #666; }
    .watermark { text-align: center; margin-top: 30px; font-size: 9px; color: #ccc; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${esc(clinicName || "Modern Clinic")}</h1>
    <p>Prescription médicale</p>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="label">Patient</div>
      <div class="value">${esc(patientName)}</div>
    </div>
    <div class="info-box">
      <div class="label">Médecin</div>
      <div class="value">Dr. ${esc(doctorName)}</div>
    </div>
    <div class="info-box">
      <div class="label">Date</div>
      <div class="value">${esc(date)}</div>
    </div>
    <div class="info-box">
      <div class="label">Prescription #</div>
      <div class="value">${prescription.id}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Médicament</th>
        <th>Dosage</th>
        <th>Fréquence</th>
        <th>Durée</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${medicationsRows || '<tr><td colspan="6" style="text-align:center;color:#999;">Aucun médicament</td></tr>'}
    </tbody>
  </table>

  ${
    prescription.notes
      ? `<div class="notes"><div class="label">Notes</div>${esc(prescription.notes)}</div>`
      : ""
  }

  <div class="footer">
    <div>
      <p style="font-size:11px;color:#666;">${esc(date)}</p>
    </div>
    <div class="signature">
      <div class="line"></div>
      <p>Dr. ${esc(doctorName)}</p>
      <p>Signature</p>
    </div>
  </div>

  <div class="watermark">Généré par Modern AI Clinic OS</div>

  <script>window.onafterprint = function() { window.close(); };</script>
</body>
</html>`

  const win = window.open("", "_blank", "width=800,height=600")
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  } else {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prescription-${prescription.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

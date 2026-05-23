import type { Payment } from "@/types"

export function printPaymentReceipt(
  payment: Payment,
  clinicName?: string
) {
  const patientName = payment.patient
    ? `${payment.patient.first_name} ${payment.patient.last_name}`
    : "—"
  const date = new Date(payment.created_at).toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const paidDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString("fr-MA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—"

  const typeLabels: Record<string, string> = {
    consultation: "Consultation",
    medication: "Médicament",
    follow_up: "Suivi",
    other: "Autre",
  }
  const methodLabels: Record<string, string> = {
    cash: "Espèces",
    card: "Carte bancaire",
    other: "Autre",
  }
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    paid: "Payé",
    refunded: "Remboursé",
    cancelled: "Annulé",
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu #${payment.id}</title>
  <style>
    @page { margin: 1.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #666; }
    .receipt-title { text-align: center; font-size: 16px; font-weight: 700; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; color: #333; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-box { background: #f8fafa; border-radius: 8px; padding: 12px; }
    .info-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
    .info-box .value { font-size: 14px; font-weight: 600; }
    .amount-box { text-align: center; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .amount-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
    .amount-box .amount { font-size: 32px; font-weight: 800; color: #0d9488; }
    .amount-box .currency { font-size: 16px; font-weight: 600; color: #666; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
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
    <p>Reçu de paiement</p>
  </div>

  <div class="receipt-title">Reçu de Paiement #${payment.id}</div>

  <div class="info-grid">
    <div class="info-box">
      <div class="label">Patient</div>
      <div class="value">${esc(patientName)}</div>
    </div>
    <div class="info-box">
      <div class="label">Date</div>
      <div class="value">${esc(date)}</div>
    </div>
    <div class="info-box">
      <div class="label">Type</div>
      <div class="value">${esc(typeLabels[payment.payment_type] || payment.payment_type)}</div>
    </div>
    <div class="info-box">
      <div class="label">Méthode</div>
      <div class="value">${esc(methodLabels[payment.payment_method] || payment.payment_method)}</div>
    </div>
  </div>

  <div class="amount-box">
    <div class="label">Montant total</div>
    <div class="amount">${payment.amount.toFixed(2)} <span class="currency">MAD</span></div>
    <div style="margin-top:8px;">
      <span class="status ${payment.status === 'paid' ? 'status-paid' : 'status-pending'}">
        ${esc(statusLabels[payment.status] || payment.status)}
      </span>
    </div>
  </div>

  ${payment.description ? `<div style="background:#f8fafa;border-radius:8px;padding:12px;margin-bottom:24px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:4px;">Description</div><div style="font-size:13px;">${esc(payment.description)}</div></div>` : ""}

  ${payment.paid_at ? `<div style="text-align:center;font-size:12px;color:#666;margin-bottom:24px;">Payé le: ${esc(paidDate)}</div>` : ""}

  <div class="footer">
    <div><p style="font-size:11px;color:#666;">${esc(date)}</p></div>
    <div class="signature">
      <div class="line"></div>
      <p>Cachet et signature</p>
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
    a.download = `receipt-${payment.id}.html`
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

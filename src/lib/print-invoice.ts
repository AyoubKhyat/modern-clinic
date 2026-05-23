import type { Payment } from "@/types"

export function printInvoice(
  payment: Payment,
  clinicName?: string
): void {
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

  const subtotal = payment.amount
  const taxRate = 0
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const clinic = esc(clinicName || "Modern Clinic")
  const invoiceNumber = `INV-${String(payment.id).padStart(5, "0")}`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceNumber}</title>
  <style>
    @page { margin: 1.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; background: #fff; }

    .invoice-container { max-width: 800px; margin: 0 auto; padding: 40px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #0d9488; margin-bottom: 32px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo-placeholder { width: 60px; height: 60px; background: linear-gradient(135deg, #0d9488, #0f766e); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 800; letter-spacing: -1px; }
    .clinic-info h1 { font-size: 22px; color: #0d9488; margin-bottom: 2px; font-weight: 700; }
    .clinic-info p { font-size: 11px; color: #666; line-height: 1.4; }
    .header-right { text-align: right; }
    .header-right .invoice-label { font-size: 28px; font-weight: 800; color: #0d9488; letter-spacing: 2px; text-transform: uppercase; }
    .header-right .invoice-number { font-size: 13px; color: #555; margin-top: 4px; }

    /* Invoice meta */
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 28px; }
    .patient-box, .invoice-details-box { background: #f8fafa; border-radius: 10px; padding: 16px 20px; flex: 1; }
    .patient-box { margin-right: 16px; }
    .box-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #0d9488; font-weight: 700; margin-bottom: 8px; }
    .box-value { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .box-sub { font-size: 12px; color: #666; margin-top: 2px; }

    /* Table */
    .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .invoice-table thead th { background: #0d9488; color: #fff; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; text-align: left; }
    .invoice-table thead th:first-child { border-radius: 8px 0 0 0; }
    .invoice-table thead th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    .invoice-table thead th.text-center { text-align: center; }
    .invoice-table thead th.text-right { text-align: right; }
    .invoice-table tbody td { padding: 12px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
    .invoice-table tbody td.text-center { text-align: center; }
    .invoice-table tbody td.text-right { text-align: right; }
    .invoice-table tbody tr:last-child td { border-bottom: 2px solid #e5e7eb; }

    /* Totals */
    .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; }
    .totals-row.total-row { border-top: 2px solid #0d9488; padding-top: 10px; margin-top: 4px; font-size: 16px; font-weight: 800; color: #0d9488; }
    .totals-row .label { }
    .totals-row .value { font-weight: 600; }

    /* Payment info */
    .payment-info { display: flex; gap: 16px; margin-bottom: 32px; }
    .payment-info-item { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 10px 16px; flex: 1; }
    .payment-info-item .pill-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
    .payment-info-item .pill-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .status-paid { color: #065f46; }
    .status-pending { color: #92400e; }
    .status-refunded { color: #7c3aed; }
    .status-cancelled { color: #dc2626; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .footer-content { display: flex; justify-content: space-between; align-items: flex-end; }
    .thank-you { font-size: 14px; color: #0d9488; font-weight: 600; font-style: italic; margin-bottom: 8px; }
    .footer-date { font-size: 11px; color: #888; }
    .signature-block { text-align: center; }
    .signature-line { width: 200px; border-top: 1px solid #333; margin-bottom: 6px; }
    .signature-label { font-size: 11px; color: #666; }

    .watermark { text-align: center; margin-top: 32px; font-size: 9px; color: #ccc; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice-container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <div class="logo-placeholder">MC</div>
        <div class="clinic-info">
          <h1>${clinic}</h1>
          <p>Cabinet Médical<br>Marrakech, Maroc</p>
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-label">Facture / Invoice</div>
        <div class="invoice-number">${esc(invoiceNumber)}</div>
      </div>
    </div>

    <div class="meta-row">
      <div class="patient-box">
        <div class="box-title">Patient</div>
        <div class="box-value">${esc(patientName)}</div>
        ${payment.patient?.phone ? `<div class="box-sub">Tél: ${esc(payment.patient.phone)}</div>` : ""}
        ${payment.patient?.email ? `<div class="box-sub">${esc(payment.patient.email)}</div>` : ""}
      </div>
      <div class="invoice-details-box">
        <div class="box-title">Détails de la facture</div>
        <div class="box-sub"><strong>Date:</strong> ${esc(date)}</div>
        <div class="box-sub"><strong>N° Facture:</strong> ${esc(invoiceNumber)}</div>
        ${payment.visit_id ? `<div class="box-sub"><strong>N° Visite:</strong> ${payment.visit_id}</div>` : ""}
      </div>
    </div>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-center">Quantité</th>
          <th class="text-right">Prix Unitaire</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${esc(typeLabels[payment.payment_type] || payment.payment_type)}${payment.description ? ` — ${esc(payment.description)}` : ""}</td>
          <td class="text-center">1</td>
          <td class="text-right">${payment.amount.toFixed(2)} MAD</td>
          <td class="text-right">${payment.amount.toFixed(2)} MAD</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span class="label">Sous-total</span>
          <span class="value">${subtotal.toFixed(2)} MAD</span>
        </div>
        <div class="totals-row">
          <span class="label">Taxe (${(taxRate * 100).toFixed(0)}%)</span>
          <span class="value">${taxAmount.toFixed(2)} MAD</span>
        </div>
        <div class="totals-row total-row">
          <span class="label">Total</span>
          <span class="value">${total.toFixed(2)} MAD</span>
        </div>
      </div>
    </div>

    <div class="payment-info">
      <div class="payment-info-item">
        <div class="pill-label">Méthode de paiement</div>
        <div class="pill-value">${esc(methodLabels[payment.payment_method] || payment.payment_method)}</div>
      </div>
      <div class="payment-info-item">
        <div class="pill-label">Statut</div>
        <div class="pill-value status-${payment.status}">${esc(statusLabels[payment.status] || payment.status)}</div>
      </div>
      ${payment.paid_at ? `<div class="payment-info-item">
        <div class="pill-label">Date de paiement</div>
        <div class="pill-value">${esc(paidDate)}</div>
      </div>` : ""}
    </div>

    <div class="footer">
      <div class="footer-content">
        <div>
          <div class="thank-you">Merci pour votre confiance</div>
          <div class="footer-date">${esc(date)}</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Cachet et signature</div>
        </div>
      </div>
    </div>

    <div class="watermark">Généré par Modern AI Clinic OS</div>
  </div>
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
    a.download = `invoice-${payment.id}.html`
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

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  FileSignature,
  Check,
  Plus,
  Printer,
  Trash2,
  Loader2,
  Eye,
  Eraser,
} from "lucide-react"
import { patientConsentsApi, consentFormsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Consent {
  id: number
  patient_id: number
  form_id: number
  form_title: string
  category: string
  signed_at: string
  signature_data: string | null
  witness_name: string | null
  notes: string | null
  created_at: string
}

interface ConsentForm {
  id: number
  title: string
  content: string
  category: string
  is_template: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const categoryConfig: Record<string, { label: string; color: string }> = {
  general: {
    label: "General",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  surgical: {
    label: "Surgical",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  privacy: {
    label: "Privacy",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  anesthesia: {
    label: "Anesthesia",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  research: {
    label: "Research",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      type: "spring" as const,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

/* ------------------------------------------------------------------ */
/*  Helper — category badge                                            */
/* ------------------------------------------------------------------ */

function CategoryBadge({ category }: { category: string }) {
  const cfg = categoryConfig[category] ?? {
    label: category,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      {cfg.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ConsentsTab({ patientId }: { patientId: number }) {
  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(true)
  const [signOpen, setSignOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState<Consent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Consent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const fetchConsents = useCallback(async () => {
    try {
      const { data } = await patientConsentsApi.list(patientId)
      setConsents(data.data ?? data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchConsents()
  }, [fetchConsents])

  /* Print consent */
  function handlePrint(consent: Consent) {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast("Could not open print window", "error")
      return
    }
    const signatureHtml = consent.signature_data
      ? `<div style="margin-top:24px"><p style="font-weight:600;margin-bottom:8px">Signature:</p><img src="${consent.signature_data}" style="max-width:300px;border:1px solid #ddd;border-radius:4px" /></div>`
      : ""
    const witnessHtml = consent.witness_name
      ? `<p><strong>Witness:</strong> ${consent.witness_name}</p>`
      : ""
    const notesHtml = consent.notes
      ? `<p><strong>Notes:</strong> ${consent.notes}</p>`
      : ""

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Consent - ${consent.form_title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
            h1 { font-size: 1.5rem; margin-bottom: 4px; }
            .meta { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; background: #f0f0f0; margin-left: 8px; }
            .details { margin-top: 16px; line-height: 1.8; }
            hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
          </style>
        </head>
        <body>
          <h1>${consent.form_title}<span class="badge">${consent.category}</span></h1>
          <p class="meta">Signed on ${format(parseISO(consent.signed_at), "MMMM d, yyyy 'at' h:mm a")}</p>
          <hr />
          <div class="details">
            ${witnessHtml}
            ${notesHtml}
          </div>
          ${signatureHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  /* Delete / revoke consent */
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await patientConsentsApi.delete(deleteTarget.id)
      toast("Consent revoked successfully", "success")
      setConsents((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast("Failed to revoke consent", "error")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <ConsentsSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {consents.length} consent{consents.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setSignOpen(true)}>
          <Plus className="size-4" />
          Sign Consent
        </Button>
      </div>

      {/* Empty state */}
      {consents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <FileSignature className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            No consents signed yet
          </p>
        </div>
      ) : (
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {consents.map((consent) => (
            <motion.div key={consent.id} variants={itemVariants}>
              <Card
                className={`${CARD_GLASS} transition-all duration-300 hover:shadow-md hover:ring-foreground/10`}
              >
                <CardContent className="flex flex-col gap-2 py-4">
                  {/* Category + date */}
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={consent.category} />
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(consent.signed_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Form title */}
                  <p className="text-sm font-medium leading-snug">
                    {consent.form_title}
                  </p>

                  {/* Witness */}
                  {consent.witness_name && (
                    <span className="text-xs text-muted-foreground">
                      Witness: {consent.witness_name}
                    </span>
                  )}

                  {/* Signature indicator */}
                  {consent.signature_data && (
                    <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                      <Check className="size-3" />
                      Signed
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setViewTarget(consent)}
                    >
                      <Eye className="size-3.5" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handlePrint(consent)}
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDeleteTarget(consent)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Sign Consent Dialog */}
      <SignConsentDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        patientId={patientId}
        onSigned={() => {
          setSignOpen(false)
          setLoading(true)
          fetchConsents()
        }}
      />

      {/* View Consent Detail Dialog */}
      <Dialog
        open={!!viewTarget}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTarget?.form_title}</DialogTitle>
            <DialogDescription>
              Signed on{" "}
              {viewTarget?.signed_at
                ? format(
                    parseISO(viewTarget.signed_at),
                    "MMMM d, yyyy 'at' h:mm a"
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-2">
              <CategoryBadge category={viewTarget?.category ?? ""} />
              {viewTarget?.signature_data && (
                <Badge variant="outline" className="text-teal-600">
                  <Check className="mr-1 size-3" />
                  Signed
                </Badge>
              )}
            </div>

            {viewTarget?.witness_name && (
              <div>
                <Label className="text-xs text-muted-foreground">Witness</Label>
                <p className="text-sm">{viewTarget.witness_name}</p>
              </div>
            )}

            {viewTarget?.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="text-sm">{viewTarget.notes}</p>
              </div>
            )}

            {viewTarget?.signature_data && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Signature
                </Label>
                <div className="mt-1 rounded-lg border border-foreground/10 bg-white p-3">
                  <img
                    src={viewTarget.signature_data}
                    alt="Signature"
                    className="max-h-24 w-auto"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewTarget) handlePrint(viewTarget)
              }}
            >
              <Printer className="size-4" />
              Print
            </Button>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Revoke Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Consent</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this consent? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sign Consent Dialog                                                */
/* ------------------------------------------------------------------ */

function SignConsentDialog({
  open,
  onOpenChange,
  patientId,
  onSigned,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number
  onSigned: () => void
}) {
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState<string>("")
  const [witnessName, setWitnessName] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  /* Signature canvas state */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  /* Load consent form templates */
  useEffect(() => {
    if (!open) return
    setFormsLoading(true)
    consentFormsApi
      .list({ is_template: 1 })
      .then(({ data }) => {
        setForms(data.data ?? data ?? [])
      })
      .catch(() => {
        toast("Failed to load consent forms", "error")
      })
      .finally(() => setFormsLoading(false))
  }, [open, toast])

  const selectedForm = forms.find((f) => f.id === Number(selectedFormId))

  function resetForm() {
    setSelectedFormId("")
    setWitnessName("")
    setNotes("")
    setHasSignature(false)
    clearCanvas()
  }

  /* ---- Canvas drawing handlers ---- */

  function getCanvasCoords(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handlePointerDown(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    isDrawingRef.current = true
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0d9488"
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  function handlePointerUp() {
    isDrawingRef.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  /* ---- Submit ---- */

  async function handleSubmit() {
    if (!selectedFormId) {
      toast("Please select a consent form", "error")
      return
    }

    setSubmitting(true)
    try {
      let signatureData: string | undefined
      if (hasSignature && canvasRef.current) {
        signatureData = canvasRef.current.toDataURL()
      }

      await patientConsentsApi.create(patientId, {
        form_id: Number(selectedFormId),
        signature_data: signatureData,
        witness_name: witnessName || undefined,
        notes: notes || undefined,
      })
      toast("Consent signed successfully", "success")
      resetForm()
      onSigned()
    } catch {
      toast("Failed to sign consent", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sign Consent Form</DialogTitle>
          <DialogDescription>
            Select a consent form, review its content, and sign below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Select consent form */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consent-form">Consent Form</Label>
            {formsLoading ? (
              <Skeleton className="h-9 w-full rounded-lg" />
            ) : (
              <Select
                value={selectedFormId}
                onValueChange={(v) => v && setSelectedFormId(v)}
              >
                <SelectTrigger id="consent-form">
                  <SelectValue placeholder="Select a consent form" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={String(form.id)}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview selected form content */}
          <AnimatePresence mode="wait">
            {selectedForm && (
              <motion.div
                key={selectedForm.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 24 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Label>Form Preview</Label>
                    <CategoryBadge category={selectedForm.category} />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-foreground/10 bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                    {selectedForm.content}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signature canvas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Signature</Label>
              <Button
                variant="ghost"
                size="xs"
                onClick={clearCanvas}
                disabled={!hasSignature}
              >
                <Eraser className="size-3.5" />
                Clear
              </Button>
            </div>
            <div className="relative rounded-lg border border-foreground/10 bg-white dark:bg-foreground/5">
              {!hasSignature && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-muted-foreground/40">
                    Sign here
                  </span>
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={440}
                height={120}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
            </div>
          </div>

          {/* Witness name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consent-witness">Witness Name</Label>
            <Input
              id="consent-witness"
              placeholder="Enter witness name..."
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consent-notes">Notes</Label>
            <Textarea
              id="consent-notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSignature className="size-4" />
              )}
              Sign Consent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function ConsentsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-32 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
          >
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-28" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-14 rounded-lg" />
                <Skeleton className="h-6 w-14 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

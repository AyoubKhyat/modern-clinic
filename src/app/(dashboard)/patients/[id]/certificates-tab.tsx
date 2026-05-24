"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  Loader2,
} from "lucide-react"
import { certificatesApi } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { printCertificate } from "@/lib/print-certificate"
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

interface Certificate {
  id: number
  patient_id: number
  doctor_id: number
  type: "sick_leave" | "fitness" | "medical"
  diagnosis: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  patient_name: string | null
  doctor_name: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const certTypeConfig: Record<
  Certificate["type"],
  { label: string; color: string }
> = {
  sick_leave: {
    label: "Sick Leave",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  fitness: {
    label: "Fitness Certificate",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  medical: {
    label: "Medical Certificate",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CertificatesTab({ patientId }: { patientId: number }) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [printingId, setPrintingId] = useState<number | null>(null)
  const { locale } = useI18n()
  const { toast } = useToast()

  const fetchCertificates = useCallback(async () => {
    try {
      const { data } = await certificatesApi.list({ patient_id: patientId })
      setCertificates(data.data ?? data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchCertificates()
  }, [fetchCertificates])

  async function handlePrint(certId: number) {
    setPrintingId(certId)
    try {
      const { data } = await certificatesApi.get(certId)
      const certData = data.data ?? data
      printCertificate(certData, locale)
      toast("Certificate sent to printer", "success")
    } catch {
      toast("Failed to print certificate", "error")
    } finally {
      setPrintingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await certificatesApi.delete(deleteTarget.id)
      toast("Certificate deleted successfully", "success")
      setCertificates((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast("Failed to delete certificate", "error")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CertificatesSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {certificates.length} certificate{certificates.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Issue Certificate
        </Button>
      </div>

      {/* Empty state */}
      {certificates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <FileText className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            No certificates issued yet
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert, i) => {
            const typeCfg = certTypeConfig[cert.type] ?? certTypeConfig.medical
            return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className={`${CARD_GLASS} transition-all duration-300 hover:shadow-md hover:ring-foreground/10`}
                >
                  <CardContent className="flex flex-col gap-2 py-4">
                    {/* Type badge + date */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeCfg.color}`}
                      >
                        {typeCfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(cert.created_at), "MMM d, yyyy")}
                      </span>
                    </div>

                    {/* Diagnosis preview */}
                    {cert.diagnosis && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {cert.diagnosis}
                      </p>
                    )}

                    {/* Doctor name */}
                    {cert.doctor_name && (
                      <span className="text-xs text-muted-foreground">
                        Dr. {cert.doctor_name}
                      </span>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={printingId === cert.id}
                        onClick={() => handlePrint(cert.id)}
                      >
                        {printingId === cert.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Printer className="size-3.5" />
                        )}
                        Print
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeleteTarget(cert)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Certificate Dialog */}
      <CreateCertificateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        patientId={patientId}
        onCreated={() => {
          setCreateOpen(false)
          setLoading(true)
          fetchCertificates()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Certificate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this certificate? This action
              cannot be undone.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Certificate Dialog                                          */
/* ------------------------------------------------------------------ */

function CreateCertificateDialog({
  open,
  onOpenChange,
  patientId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number
  onCreated: () => void
}) {
  const [type, setType] = useState<Certificate["type"]>("medical")
  const [diagnosis, setDiagnosis] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setType("medical")
    setDiagnosis("")
    setStartDate("")
    setEndDate("")
    setNotes("")
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await certificatesApi.create({
        patient_id: patientId,
        type,
        diagnosis: diagnosis || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        notes: notes || undefined,
      })
      toast("Certificate issued successfully", "success")
      resetForm()
      onCreated()
    } catch {
      toast("Failed to issue certificate", "error")
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Certificate</DialogTitle>
          <DialogDescription>
            Create a new medical certificate for this patient.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                setType((v as Certificate["type"]) ?? "medical")
              }
            >
              <SelectTrigger id="cert-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="fitness">Fitness Certificate</SelectItem>
                <SelectItem value="medical">Medical Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Diagnosis */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-diagnosis">Diagnosis</Label>
            <Textarea
              id="cert-diagnosis"
              placeholder="Enter diagnosis..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          {/* Date range (shown for sick_leave) */}
          {type === "sick_leave" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-start">Start Date</Label>
                <Input
                  id="cert-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cert-end">End Date</Label>
                <Input
                  id="cert-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-notes">Notes</Label>
            <Textarea
              id="cert-notes"
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
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Issue Certificate
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

function CertificatesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
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
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

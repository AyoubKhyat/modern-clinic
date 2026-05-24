"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react"
import { patientAllergiesApi } from "@/lib/api"
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

interface Allergy {
  id: number
  patient_id: number
  allergen: string
  severity: "mild" | "moderate" | "severe" | "critical"
  reaction: string
  noted_date: string
  notes: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const severityConfig: Record<
  Allergy["severity"],
  { label: string; color: string; cardBorder: string; badgeClass: string }
> = {
  mild: {
    label: "Mild",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cardBorder: "ring-green-500/20 dark:ring-green-400/20",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  moderate: {
    label: "Moderate",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    cardBorder: "ring-yellow-500/20 dark:ring-yellow-400/20",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  severe: {
    label: "Severe",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    cardBorder: "ring-orange-500/20 dark:ring-orange-400/20",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cardBorder: "ring-red-500/20 dark:ring-red-400/20",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 24 },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AllergiesTab({ patientId }: { patientId: number }) {
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Allergy | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const fetchAllergies = useCallback(async () => {
    try {
      const { data } = await patientAllergiesApi.list(patientId)
      setAllergies(data ?? [])
    } catch {
      toast("Failed to load allergies", "error")
    } finally {
      setLoading(false)
    }
  }, [patientId, toast])

  useEffect(() => {
    fetchAllergies()
  }, [fetchAllergies])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await patientAllergiesApi.delete(deleteTarget.id)
      toast("Allergy removed successfully", "success")
      setAllergies((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast("Failed to delete allergy", "error")
    } finally {
      setDeleting(false)
    }
  }

  const criticalAllergies = allergies.filter((a) => a.severity === "critical")

  if (loading) return <AllergiesSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Critical allergies warning banner */}
      {criticalAllergies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 24 }}
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              Critical Allergies
            </span>
            <span className="text-xs text-red-700 dark:text-red-400">
              {criticalAllergies.map((a) => a.allergen).join(", ")}
            </span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {allergies.length} allerg{allergies.length !== 1 ? "ies" : "y"}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="border-teal-600/20 text-teal-600 hover:bg-teal-50 dark:border-teal-400/20 dark:text-teal-400 dark:hover:bg-teal-950/30"
        >
          <Plus className="size-4" />
          Add Allergy
        </Button>
      </div>

      {/* Empty state */}
      {allergies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <ShieldAlert className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            No allergies recorded for this patient
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="border-teal-600/20 text-teal-600 hover:bg-teal-50 dark:border-teal-400/20 dark:text-teal-400 dark:hover:bg-teal-950/30"
          >
            <Plus className="size-4" />
            Record Allergy
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allergies.map((allergy, i) => {
              const cfg = severityConfig[allergy.severity] ?? severityConfig.mild
              return (
                <motion.div
                  key={allergy.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Card
                    className={`${CARD_GLASS} ${cfg.cardBorder} transition-all duration-300 hover:shadow-md`}
                  >
                    <CardContent className="flex flex-col gap-2 py-4">
                      {/* Allergen name + severity badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {allergy.allergen}
                        </span>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {/* Reaction description */}
                      {allergy.reaction && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {allergy.reaction}
                        </p>
                      )}

                      {/* Noted date */}
                      {allergy.noted_date && (
                        <span className="text-xs text-muted-foreground">
                          Noted: {format(parseISO(allergy.noted_date), "MMM d, yyyy")}
                        </span>
                      )}

                      {/* Notes */}
                      {allergy.notes && (
                        <p className="line-clamp-1 text-xs italic text-muted-foreground/70">
                          {allergy.notes}
                        </p>
                      )}

                      {/* Delete button */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDeleteTarget(allergy)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Add Allergy Dialog */}
      <AddAllergyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        patientId={patientId}
        onCreated={() => {
          setCreateOpen(false)
          setLoading(true)
          fetchAllergies()
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
            <DialogTitle>Remove Allergy</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.allergen}
              </span>{" "}
              from this patient&apos;s allergy list? This action cannot be undone.
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
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Allergy Dialog                                                 */
/* ------------------------------------------------------------------ */

function AddAllergyDialog({
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
  const [allergen, setAllergen] = useState("")
  const [severity, setSeverity] = useState<Allergy["severity"]>("mild")
  const [reaction, setReaction] = useState("")
  const [notedDate, setNotedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setAllergen("")
    setSeverity("mild")
    setReaction("")
    setNotedDate("")
    setNotes("")
  }

  async function handleSubmit() {
    if (!allergen.trim()) {
      toast("Allergen name is required", "error")
      return
    }
    setSubmitting(true)
    try {
      await patientAllergiesApi.create(patientId, {
        allergen: allergen.trim(),
        severity,
        reaction: reaction.trim() || undefined,
        noted_date: notedDate || undefined,
        notes: notes.trim() || undefined,
      })
      toast("Allergy recorded successfully", "success")
      resetForm()
      onCreated()
    } catch {
      toast("Failed to record allergy", "error")
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
          <DialogTitle>Add Allergy</DialogTitle>
          <DialogDescription>
            Record a new allergy for this patient.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Allergen */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="allergy-allergen">
              Allergen <span className="text-destructive">*</span>
            </Label>
            <Input
              id="allergy-allergen"
              placeholder="e.g. Penicillin, Peanuts, Latex..."
              value={allergen}
              onChange={(e) => setAllergen(e.target.value)}
            />
          </div>

          {/* Severity */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="allergy-severity">Severity</Label>
            <Select
              value={severity}
              onValueChange={(v) =>
                setSeverity((v as Allergy["severity"]) ?? "mild")
              }
            >
              <SelectTrigger id="allergy-severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reaction */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="allergy-reaction">Reaction</Label>
            <Textarea
              id="allergy-reaction"
              placeholder="Describe the allergic reaction..."
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
            />
          </div>

          {/* Noted Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="allergy-noted-date">Noted Date</Label>
            <Input
              id="allergy-noted-date"
              type="date"
              value={notedDate}
              onChange={(e) => setNotedDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="allergy-notes">Notes</Label>
            <Textarea
              id="allergy-notes"
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
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save Allergy
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

function AllergiesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
          >
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-18 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

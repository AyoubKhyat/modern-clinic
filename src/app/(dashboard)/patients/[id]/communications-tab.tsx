"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  Phone,
  Mail,
  MessageSquare,
  User,
  FileText,
  Plus,
  Trash2,
  Filter,
  Loader2,
} from "lucide-react"
import { communicationLogsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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

type CommType = "phone_call" | "email" | "sms" | "in_person" | "letter"
type CommDirection = "inbound" | "outbound"

interface CommunicationLog {
  id: number
  patient_id: number
  type: CommType
  direction: CommDirection
  subject: string
  notes: string | null
  staff_name: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const TYPE_CONFIG: Record<
  CommType,
  { label: string; icon: typeof Phone; color: string }
> = {
  phone_call: {
    label: "Phone Call",
    icon: Phone,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  sms: {
    label: "SMS",
    icon: MessageSquare,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  in_person: {
    label: "In Person",
    icon: User,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  letter: {
    label: "Letter",
    icon: FileText,
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
}

const DIRECTION_COLORS: Record<CommDirection, string> = {
  inbound:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  outbound:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "phone_call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "in_person", label: "In Person" },
  { value: "letter", label: "Letter" },
]

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  }),
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CommunicationsTab({ patientId }: { patientId: number }) {
  const [logs, setLogs] = useState<CommunicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CommunicationLog | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const { toast } = useToast()

  /* ---------- Fetch ---------- */

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await communicationLogsApi.list(patientId)
      setLogs(data.data ?? data ?? [])
    } catch {
      toast("Failed to load communications", "error")
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  /* ---------- Sorted & filtered ---------- */

  const filtered = useMemo(() => {
    let result = logs
    if (filterType !== "all") {
      result = result.filter((l) => l.type === filterType)
    }
    return [...result].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [logs, filterType])

  /* ---------- Delete ---------- */

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await communicationLogsApi.delete(deleteTarget.id)
      toast("Communication deleted successfully")
      setLogs((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast("Failed to delete communication", "error")
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Render ---------- */

  if (loading) return <CommunicationsSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {filtered.length} communication{filtered.length !== 1 ? "s" : ""}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Log Communication
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <Select
          value={filterType}
          onValueChange={(v) => v && setFilterType(v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <Phone className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            {logs.length === 0
              ? "No communications logged yet."
              : "No communications match the selected filter."}
          </p>
          {logs.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Log First Communication
            </Button>
          )}
        </div>
      ) : (
        <div className="relative flex flex-col gap-3">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-foreground/[0.06] dark:bg-foreground/[0.04]" />

          {filtered.map((log, i) => {
            const typeCfg = TYPE_CONFIG[log.type] ?? TYPE_CONFIG.phone_call
            const Icon = typeCfg.icon
            const dirColor = DIRECTION_COLORS[log.direction]

            return (
              <motion.div
                key={log.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="relative pl-12"
              >
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-4 flex size-[14px] items-center justify-center rounded-full bg-background ring-2 ring-teal-600/30 dark:ring-teal-400/30">
                  <div className="size-2 rounded-full bg-teal-600 dark:bg-teal-400" />
                </div>

                <Card
                  className={`${CARD_GLASS} transition-all duration-300 hover:shadow-md hover:ring-foreground/10`}
                >
                  <CardContent className="flex flex-col gap-2.5 py-4">
                    {/* Top row: icon + subject + meta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/10">
                          <Icon className="size-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium leading-snug">
                            {log.subject}
                          </span>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {format(
                          parseISO(log.created_at),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${typeCfg.color}`}
                      >
                        {typeCfg.label}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize ${dirColor}`}
                      >
                        {log.direction}
                      </Badge>
                      {log.staff_name && (
                        <span className="text-[10px] text-muted-foreground">
                          by {log.staff_name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeleteTarget(log)}
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

      {/* Create Communication Dialog */}
      <CreateCommunicationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        patientId={patientId}
        onCreated={() => {
          setCreateOpen(false)
          setLoading(true)
          fetchLogs()
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
            <DialogTitle>Delete Communication</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this communication log? This
              action cannot be undone.
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
/*  Create Communication Dialog                                        */
/* ------------------------------------------------------------------ */

function CreateCommunicationDialog({
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
  const [type, setType] = useState<CommType>("phone_call")
  const [direction, setDirection] = useState<CommDirection>("outbound")
  const [subject, setSubject] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setType("phone_call")
    setDirection("outbound")
    setSubject("")
    setNotes("")
  }

  async function handleSubmit() {
    if (!subject.trim()) return
    setSubmitting(true)
    try {
      await communicationLogsApi.create(patientId, {
        type,
        direction,
        subject: subject.trim(),
        notes: notes.trim() || undefined,
      })
      toast("Communication logged successfully")
      resetForm()
      onCreated()
    } catch {
      toast("Failed to log communication", "error")
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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
          <DialogDescription>
            Record a communication with this patient.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comm-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as CommType)}
            >
              <SelectTrigger id="comm-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Direction */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comm-direction">Direction</Label>
            <Select
              value={direction}
              onValueChange={(v) => v && setDirection(v as CommDirection)}
            >
              <SelectTrigger id="comm-direction">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comm-subject">Subject</Label>
            <Input
              id="comm-subject"
              placeholder="e.g. Appointment confirmation"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comm-notes">Notes</Label>
            <Textarea
              id="comm-notes"
              placeholder="Optional notes about this communication..."
              rows={4}
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
              disabled={submitting || !subject.trim()}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Log Communication
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

function CommunicationsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-40 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <div className="relative flex flex-col gap-3">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-foreground/[0.06] dark:bg-foreground/[0.04]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative pl-12">
            <div className="absolute left-2.5 top-4 flex size-[14px] items-center justify-center rounded-full bg-background ring-2 ring-foreground/[0.06]">
              <div className="size-2 rounded-full bg-muted" />
            </div>
            <Card className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
              <CardContent className="flex flex-col gap-2.5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <Skeleton className="size-8 rounded-lg" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-16 rounded-lg" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

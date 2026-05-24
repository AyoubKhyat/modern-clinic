"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  StickyNote,
  Pin,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit,
  Trash2,
  X,
} from "lucide-react"
import { clinicalNotesApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
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

type TemplateType = "SOAP" | "Progress" | "Procedure" | "Consultation" | "Other"

interface Note {
  id: number
  patient_id: number
  doctor_id: number
  doctor_name: string
  visit_id: number | null
  title: string
  content: string
  template_type: TemplateType | string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const templateTypeConfig: Record<string, { label: string; color: string }> = {
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
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  Consultation: {
    label: "Consultation",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  Other: {
    label: "Other",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

const TEMPLATE_PREFILLS: Record<string, string> = {
  SOAP: "Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:\n",
  Progress:
    "Progress since last visit:\n\nCurrent symptoms:\n\nPlan adjustments:\n",
  Procedure:
    "Procedure:\n\nFindings:\n\nComplications:\n\nPost-op plan:\n",
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 24 },
  }),
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ClinicalNotesTab({ patientId }: { patientId: number }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Note | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [togglingPinId, setTogglingPinId] = useState<number | null>(null)
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await clinicalNotesApi.list(patientId)
      setNotes(data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  /* Sort: pinned first, then by created_at desc */
  const sortedAndFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
        )
      : notes

    return [...filtered].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [notes, searchQuery])

  function toggleExpand(noteId: number) {
    setExpandedId((prev) => (prev === noteId ? null : noteId))
  }

  async function handleTogglePin(note: Note) {
    setTogglingPinId(note.id)
    try {
      await clinicalNotesApi.update(note.id, { is_pinned: !note.is_pinned })
      toast(note.is_pinned ? "Note unpinned" : "Note pinned")
      setLoading(true)
      await fetchNotes()
    } catch {
      toast("Failed to update pin status", "error")
    } finally {
      setTogglingPinId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await clinicalNotesApi.delete(deleteTarget.id)
      toast("Note deleted successfully")
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast("Failed to delete note", "error")
    }
  }

  if (loading) return <ClinicalNotesSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {sortedAndFiltered.length} note{sortedAndFiltered.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New Note
        </Button>
      </div>

      {/* Search bar */}
      {notes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes by title or content..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {sortedAndFiltered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <StickyNote className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "No notes match your search."
              : "No clinical notes found for this patient."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedAndFiltered.map((note, i) => (
            <motion.div
              key={note.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <NoteCard
                note={note}
                expanded={expandedId === note.id}
                onToggle={() => toggleExpand(note.id)}
                onPin={() => handleTogglePin(note)}
                pinLoading={togglingPinId === note.id}
                onEdit={() => setEditTarget(note)}
                onDelete={() => setDeleteTarget(note)}
                isAuthor={user?.id === note.doctor_id}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Note Dialog */}
      <CreateNoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        patientId={patientId}
        onCreated={() => {
          setCreateOpen(false)
          setLoading(true)
          fetchNotes()
        }}
      />

      {/* Edit Note Dialog */}
      {editTarget && (
        <EditNoteDialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          note={editTarget}
          onUpdated={() => {
            setEditTarget(null)
            setLoading(true)
            fetchNotes()
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this clinical note? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Note Card                                                          */
/* ------------------------------------------------------------------ */

function NoteCard({
  note,
  expanded,
  onToggle,
  onPin,
  pinLoading,
  onEdit,
  onDelete,
  isAuthor,
}: {
  note: Note
  expanded: boolean
  onToggle: () => void
  onPin: () => void
  pinLoading: boolean
  onEdit: () => void
  onDelete: () => void
  isAuthor: boolean
}) {
  const typeCfg = note.template_type
    ? templateTypeConfig[note.template_type] ?? templateTypeConfig.Other
    : null

  return (
    <Card
      className={`${CARD_GLASS} transition-all duration-300 hover:shadow-md hover:ring-foreground/10`}
    >
      <CardContent className="flex flex-col gap-3 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium leading-snug">
                  {note.title}
                </span>
                {note.is_pinned && (
                  <Pin className="size-3 shrink-0 text-teal-600 dark:text-teal-400" />
                )}
              </div>
              {note.doctor_name && (
                <span className="text-xs text-muted-foreground">
                  Dr. {note.doctor_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {typeCfg && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeCfg.color}`}
              >
                {typeCfg.label}
              </span>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(parseISO(note.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="xs" onClick={onToggle}>
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {expanded ? "Collapse" : "Expand"}
          </Button>

          <Button
            variant="ghost"
            size="xs"
            disabled={pinLoading}
            onClick={onPin}
          >
            {pinLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Pin className="size-3.5" />
            )}
            {note.is_pinned ? "Unpin" : "Pin"}
          </Button>

          {isAuthor && (
            <Button variant="ghost" size="xs" onClick={onEdit}>
              <Edit className="size-3.5" />
              Edit
            </Button>
          )}

          <Button variant="ghost" size="xs" onClick={onDelete}>
            <Trash2 className="size-3.5 text-destructive" />
            Delete
          </Button>
        </div>

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {note.content}
                </p>
                {note.updated_at !== note.created_at && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last updated:{" "}
                    {format(parseISO(note.updated_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Note Dialog                                                 */
/* ------------------------------------------------------------------ */

function CreateNoteDialog({
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
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [templateType, setTemplateType] = useState<string>("")
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setTitle("")
    setContent("")
    setTemplateType("")
    setIsPinned(false)
  }

  function handleTemplateChange(value: string | null) {
    if (!value) return
    setTemplateType(value)
    const prefill = TEMPLATE_PREFILLS[value]
    if (prefill && !content.trim()) {
      setContent(prefill)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await clinicalNotesApi.create(patientId, {
        title,
        content,
        template_type: templateType || undefined,
        is_pinned: isPinned || undefined,
      })
      toast("Clinical note created successfully")
      resetForm()
      onCreated()
    } catch {
      toast("Failed to create clinical note", "error")
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Clinical Note</DialogTitle>
          <DialogDescription>
            Create a new clinical note for this patient.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="e.g. Follow-up Visit Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Template Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-template">Template Type</Label>
            <Select value={templateType} onValueChange={handleTemplateChange}>
              <SelectTrigger id="note-template">
                <SelectValue placeholder="Select a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOAP">SOAP</SelectItem>
                <SelectItem value="Progress">Progress</SelectItem>
                <SelectItem value="Procedure">Procedure</SelectItem>
                <SelectItem value="Consultation">Consultation</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              placeholder="Enter clinical notes..."
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Pin toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isPinned}
              onClick={() => setIsPinned(!isPinned)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                isPinned
                  ? "bg-teal-600"
                  : "bg-muted ring-1 ring-foreground/10"
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  isPinned ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <Label className="cursor-pointer" onClick={() => setIsPinned(!isPinned)}>
              Pin this note
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Create Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Note Dialog                                                   */
/* ------------------------------------------------------------------ */

function EditNoteDialog({
  open,
  onOpenChange,
  note,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: Note
  onUpdated: () => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [templateType, setTemplateType] = useState(note.template_type ?? "")
  const [isPinned, setIsPinned] = useState(note.is_pinned)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setTemplateType(note.template_type ?? "")
    setIsPinned(note.is_pinned)
  }, [note])

  function handleTemplateChange(value: string | null) {
    if (!value) return
    setTemplateType(value)
    const prefill = TEMPLATE_PREFILLS[value]
    if (prefill && !content.trim()) {
      setContent(prefill)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await clinicalNotesApi.update(note.id, {
        title,
        content,
        template_type: templateType || undefined,
        is_pinned: isPinned,
      })
      toast("Clinical note updated successfully")
      onUpdated()
    } catch {
      toast("Failed to update clinical note", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Clinical Note</DialogTitle>
          <DialogDescription>
            Update this clinical note.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note-title">Title</Label>
            <Input
              id="edit-note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Template Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note-template">Template Type</Label>
            <Select value={templateType} onValueChange={handleTemplateChange}>
              <SelectTrigger id="edit-note-template">
                <SelectValue placeholder="Select a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOAP">SOAP</SelectItem>
                <SelectItem value="Progress">Progress</SelectItem>
                <SelectItem value="Procedure">Procedure</SelectItem>
                <SelectItem value="Consultation">Consultation</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note-content">Content</Label>
            <Textarea
              id="edit-note-content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Pin toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isPinned}
              onClick={() => setIsPinned(!isPinned)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                isPinned
                  ? "bg-teal-600"
                  : "bg-muted ring-1 ring-foreground/10"
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  isPinned ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <Label className="cursor-pointer" onClick={() => setIsPinned(!isPinned)}>
              Pin this note
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save Changes
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

function ClinicalNotesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card
          key={i}
          className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
        >
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Skeleton className="size-4 rounded" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

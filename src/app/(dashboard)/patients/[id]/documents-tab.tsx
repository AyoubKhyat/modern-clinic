"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  File,
  FileUp,
  Trash2,
  Eye,
  Download,
  Plus,
  Loader2,
  Search,
  X,
} from "lucide-react"
import { patientDocsApi } from "@/lib/api"
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

interface Doc {
  id: number
  patient_id: number
  name: string
  description: string | null
  file_type: string
  file_size: number
  category: string
  uploaded_by: string | null
  created_at: string
  file_data?: string
}

type DocCategory =
  | "all"
  | "general"
  | "lab-result"
  | "imaging"
  | "prescription"
  | "insurance"
  | "referral"
  | "other"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "lab-result", label: "Lab Result" },
  { value: "imaging", label: "Imaging" },
  { value: "prescription", label: "Prescription" },
  { value: "insurance", label: "Insurance" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
]

const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.value !== "all")

const categoryColors: Record<string, string> = {
  general:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  "lab-result":
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  imaging:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  prescription:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  insurance:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  referral:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  other:
    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getCategoryLabel(category: string): string {
  const found = CATEGORIES.find((c) => c.value === category)
  return found ? found.label : category
}

function isImageType(fileType: string): boolean {
  return /^image\/(png|jpe?g|gif|webp|svg\+xml|bmp)$/i.test(fileType)
}

function isPdfType(fileType: string): boolean {
  return fileType === "application/pdf"
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DocumentsTab({ patientId }: { patientId: number }) {
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewDoc, setViewDoc] = useState<Doc | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<DocCategory>("all")
  const { toast } = useToast()

  /* ---------- Fetch ---------- */

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await patientDocsApi.list(patientId)
      setDocuments(data.data ?? data ?? [])
    } catch {
      toast("Failed to load documents", "error")
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  /* ---------- Filtered list ---------- */

  const filteredDocs = useMemo(() => {
    let result = documents
    if (filterCategory !== "all") {
      result = result.filter((d) => d.category === filterCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      )
    }
    return result
  }, [documents, filterCategory, searchQuery])

  /* ---------- View / Download ---------- */

  async function handleView(doc: Doc) {
    setViewLoading(true)
    setViewDoc(doc)
    try {
      const { data } = await patientDocsApi.get(doc.id)
      const full = data.data ?? data
      setViewDoc(full)
    } catch {
      toast("Failed to load document", "error")
      setViewDoc(null)
    } finally {
      setViewLoading(false)
    }
  }

  function handleDownload(doc: Doc) {
    if (!doc.file_data) return
    const link = document.createElement("a")
    link.href = `data:${doc.file_type};base64,${doc.file_data}`
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /* ---------- Delete ---------- */

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await patientDocsApi.delete(deleteTarget.id)
      toast("Document deleted successfully", "success")
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast("Failed to delete document", "error")
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Render ---------- */

  if (loading) return <DocumentsSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="size-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select
          value={filterCategory}
          onValueChange={(v) => setFilterCategory((v as DocCategory) ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document grid or empty state */}
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <FileUp className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            {documents.length === 0
              ? "No documents uploaded yet"
              : "No documents match your filters"}
          </p>
          {documents.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Plus className="size-4" />
              Upload First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc, i) => {
            const catColor =
              categoryColors[doc.category] ?? categoryColors.other
            return (
              <motion.div
                key={doc.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <Card
                  className={`${CARD_GLASS} transition-all duration-300 hover:shadow-md hover:ring-foreground/10`}
                >
                  <CardContent className="flex flex-col gap-2 py-4">
                    {/* Icon + name */}
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-600/10">
                        <File className="size-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {doc.name}
                        </p>
                        {doc.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${catColor}`}
                      >
                        {getCategoryLabel(doc.category)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {doc.file_type.split("/").pop()?.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(doc.created_at), "MMM d, yyyy")}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleView(doc)}
                      >
                        <Eye className="size-3.5 text-teal-600 dark:text-teal-400" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeleteTarget(doc)}
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

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        patientId={patientId}
        onUploaded={() => {
          setUploadOpen(false)
          setLoading(true)
          fetchDocuments()
        }}
      />

      {/* View / Preview Dialog */}
      <Dialog
        open={!!viewDoc}
        onOpenChange={(open) => {
          if (!open) setViewDoc(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewDoc?.name ?? "Document"}</DialogTitle>
            <DialogDescription>
              {viewDoc?.description ?? "Preview and download this document."}
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : viewDoc?.file_data ? (
            <div className="flex flex-col gap-4">
              {/* Preview area */}
              {isImageType(viewDoc.file_type) ? (
                <div className="flex justify-center rounded-lg border bg-muted/30 p-2">
                  <img
                    src={`data:${viewDoc.file_type};base64,${viewDoc.file_data}`}
                    alt={viewDoc.name}
                    className="max-h-80 rounded object-contain"
                  />
                </div>
              ) : isPdfType(viewDoc.file_type) ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6">
                  <File className="size-10 text-teal-600 dark:text-teal-400" />
                  <p className="text-sm text-muted-foreground">
                    PDF document ready for download
                  </p>
                  <a
                    href={`data:${viewDoc.file_type};base64,${viewDoc.file_data}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-teal-600 underline hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6">
                  <File className="size-10 text-teal-600 dark:text-teal-400" />
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                </div>
              )}

              {/* Info row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {viewDoc.file_type.split("/").pop()?.toUpperCase()} &middot;{" "}
                  {formatFileSize(viewDoc.file_size)}
                </span>
                <span>
                  {format(parseISO(viewDoc.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                No file data available
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDoc(null)}>
              Close
            </Button>
            {viewDoc?.file_data && (
              <Button onClick={() => handleDownload(viewDoc)}>
                <Download className="size-4" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}
              &rdquo;? This action cannot be undone.
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
/*  Upload Document Dialog                                             */
/* ------------------------------------------------------------------ */

function UploadDocumentDialog({
  open,
  onOpenChange,
  patientId,
  onUploaded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number
  onUploaded: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileType, setFileType] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [fileName, setFileName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function resetForm() {
    setName("")
    setDescription("")
    setCategory("general")
    setFileData(null)
    setFileType("")
    setFileSize(0)
    setFileName("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setFileType(file.type || "application/octet-stream")
    setFileSize(file.size)

    // Auto-fill name from filename (without extension)
    if (!name) {
      const baseName = file.name.replace(/\.[^/.]+$/, "")
      setName(baseName)
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix to get raw base64
      const base64 = result.split(",")[1] ?? result
      setFileData(base64)
    }
    reader.onerror = () => {
      toast("Failed to read file", "error")
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!fileData) {
      toast("Please select a file to upload", "error")
      return
    }
    if (!name.trim()) {
      toast("Please enter a document name", "error")
      return
    }

    setSubmitting(true)
    try {
      await patientDocsApi.upload(patientId, {
        name: name.trim(),
        description: description.trim() || undefined,
        file_type: fileType,
        file_size: fileSize,
        file_data: fileData,
        category,
      })
      toast("Document uploaded successfully", "success")
      resetForm()
      onUploaded()
    } catch {
      toast("Failed to upload document", "error")
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
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this patient&apos;s records.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* File input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-file">File</Label>
            <div
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-foreground/10 bg-muted/20 p-6 transition-colors hover:border-teal-600/30 hover:bg-muted/40"
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <>
                  <File className="size-8 text-teal-600 dark:text-teal-400" />
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileSize)} &middot;{" "}
                    {fileType.split("/").pop()?.toUpperCase()}
                  </p>
                </>
              ) : (
                <>
                  <FileUp className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a file
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              placeholder="Document name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? "general")}
            >
              <SelectTrigger id="doc-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !fileData}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Upload
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

function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-36 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={i}
            className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
          >
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-start gap-2.5">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2 pt-1">
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

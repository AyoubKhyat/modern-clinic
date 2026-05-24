"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileSignature,
  Plus,
  Loader2,
  Search,
  Eye,
  Pencil,
  Trash2,
  Printer,
  Filter,
  FileText,
  X,
} from "lucide-react"
import { consentFormsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsentForm {
  id: number
  title: string
  content: string
  category: string
  is_template: number | boolean
  created_at: string
}

type Category = "general" | "surgical" | "privacy" | "anesthesia" | "research"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General" },
  { value: "surgical", label: "Surgical" },
  { value: "privacy", label: "Privacy" },
  { value: "anesthesia", label: "Anesthesia" },
  { value: "research", label: "Research" },
]

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  surgical: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  privacy: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  anesthesia: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  research: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      type: "spring" as const,
      bounce: 0,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, bounce: 0, duration: 0.45 },
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConsentFormsPage() {
  const { toast } = useToast()

  const [forms, setForms] = useState<ConsentForm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("templates")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<ConsentForm | null>(null)
  const [viewForm, setViewForm] = useState<ConsentForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConsentForm | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---------- Fetch ----------

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await consentFormsApi.list()
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? []
      setForms(data)
    } catch {
      toast("Failed to load consent forms", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  // ---------- Derived ----------

  const filtered = useMemo(() => {
    let result = forms

    // Tab filter
    if (activeTab === "templates") {
      result = result.filter(
        (f) => f.is_template === 1 || f.is_template === true
      )
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((f) => f.title.toLowerCase().includes(q))
    }

    // Category
    if (categoryFilter !== "all") {
      result = result.filter((f) => f.category === categoryFilter)
    }

    return result
  }, [forms, activeTab, search, categoryFilter])

  // ---------- Handlers ----------

  function handleCreate() {
    setEditingForm(null)
    setFormOpen(true)
  }

  function handleEdit(form: ConsentForm) {
    setEditingForm(form)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    toast(editingForm ? "Consent form updated" : "Consent form created")
    setFormOpen(false)
    setEditingForm(null)
    fetchForms()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await consentFormsApi.delete(deleteTarget.id)
      toast("Consent form deleted")
      setDeleteTarget(null)
      fetchForms()
    } catch {
      toast("Failed to delete consent form", "error")
    } finally {
      setDeleting(false)
    }
  }

  function handlePrint(form: ConsentForm) {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${form.title}</title>
          <style>
            body {
              font-family: Georgia, 'Times New Roman', serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 0 24px;
              color: #1a1a1a;
              line-height: 1.7;
            }
            h1 {
              font-size: 24px;
              border-bottom: 2px solid #0d9488;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .category {
              display: inline-block;
              background: #f0fdfa;
              color: #0d9488;
              padding: 4px 12px;
              border-radius: 16px;
              font-size: 13px;
              font-weight: 500;
              margin-bottom: 24px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 15px;
            }
            .signature {
              margin-top: 60px;
              border-top: 1px solid #e5e7eb;
              padding-top: 24px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              width: 200px;
              border-bottom: 1px solid #1a1a1a;
              margin-top: 40px;
            }
            .signature-label {
              font-size: 13px;
              color: #6b7280;
              margin-top: 4px;
            }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${form.title}</h1>
          <div class="category">${form.category.charAt(0).toUpperCase() + form.category.slice(1)}</div>
          <div class="content">${form.content}</div>
          <div class="signature">
            <div>
              <div class="signature-line"></div>
              <div class="signature-label">Patient Signature</div>
            </div>
            <div>
              <div class="signature-line"></div>
              <div class="signature-label">Date</div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Consent Forms"
        description="Manage consent form templates and patient documents"
        action={
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            New Form
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs
        defaultValue="templates"
        onValueChange={(val: any) => setActiveTab(val)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="templates">
              <FileSignature className="size-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="all">
              <FileText className="size-4" />
              All Forms
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search forms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-52 pl-9 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(v) => v && setCategoryFilter(v)}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">
                <Filter className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content for both tabs renders the same filtered list */}
        <TabsContent value="templates">
          <FormsList
            forms={filtered}
            loading={loading}
            onView={setViewForm}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
            onPrint={handlePrint}
          />
        </TabsContent>
        <TabsContent value="all">
          <FormsList
            forms={filtered}
            loading={loading}
            onView={setViewForm}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
            onPrint={handlePrint}
          />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "Edit Consent Form" : "New Consent Form"}
            </DialogTitle>
            <DialogDescription>
              {editingForm
                ? "Update the consent form details below."
                : "Create a new consent form template or document."}
            </DialogDescription>
          </DialogHeader>
          <ConsentFormEditor
            form={editingForm}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setFormOpen(false)
              setEditingForm(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={!!viewForm}
        onOpenChange={(open) => !open && setViewForm(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-teal-600" />
              {viewForm?.title}
            </DialogTitle>
            <DialogDescription>
              <Badge
                className={
                  CATEGORY_COLORS[viewForm?.category ?? "general"] ?? ""
                }
              >
                {viewForm?.category
                  ? viewForm.category.charAt(0).toUpperCase() +
                    viewForm.category.slice(1)
                  : ""}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {viewForm?.content}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {viewForm && (
              <Button
                variant="outline"
                onClick={() => handlePrint(viewForm)}
              >
                <Printer className="size-4" />
                Print
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewForm(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Consent Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormsList
// ---------------------------------------------------------------------------

function FormsList({
  forms,
  loading,
  onView,
  onEdit,
  onDelete,
  onPrint,
}: {
  forms: ConsentForm[]
  loading: boolean
  onView: (form: ConsentForm) => void
  onEdit: (form: ConsentForm) => void
  onDelete: (form: ConsentForm) => void
  onPrint: (form: ConsentForm) => void
}) {
  if (loading) return <LoadingSkeleton />

  if (!forms.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
          <FileSignature className="size-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium">No consent forms found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters, or create a new form.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      <AnimatePresence mode="popLayout">
        {forms.map((form) => (
          <motion.div
            key={form.id}
            variants={itemVariants}
            layout
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card
              className={`group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md ${GLASS}`}
            >
              {/* Teal top accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-teal-500 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100" />

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-teal-600/10">
                      <FileSignature className="size-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <h3 className="truncate text-sm font-semibold">
                      {form.title}
                    </h3>
                  </div>
                  <Badge
                    className={`shrink-0 ${
                      CATEGORY_COLORS[form.category] ?? CATEGORY_COLORS.general
                    }`}
                  >
                    {form.category.charAt(0).toUpperCase() +
                      form.category.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                {/* Content preview */}
                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {form.content}
                </p>

                {/* Meta */}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(form.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {(form.is_template === 1 || form.is_template === true) && (
                    <Badge variant="secondary" className="text-[10px]">
                      Template
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 border-t border-foreground/[0.06] pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-teal-600"
                    onClick={() => onView(form)}
                  >
                    <Eye className="size-3.5" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-teal-600"
                    onClick={() => onEdit(form)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-teal-600"
                    onClick={() => onPrint(form)}
                  >
                    <Printer className="size-3.5" />
                    Print
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(form)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ConsentFormEditor
// ---------------------------------------------------------------------------

function ConsentFormEditor({
  form,
  onSuccess,
  onCancel,
}: {
  form: ConsentForm | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [title, setTitle] = useState(form?.title ?? "")
  const [content, setContent] = useState(form?.content ?? "")
  const [category, setCategory] = useState<string>(form?.category ?? "general")
  const [isTemplate, setIsTemplate] = useState<boolean>(
    form ? form.is_template === 1 || form.is_template === true : true
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    if (!content.trim()) {
      setError("Content is required.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        is_template: isTemplate,
      }

      if (form) {
        await consentFormsApi.update(form.id, payload)
      } else {
        await consentFormsApi.create(payload)
      }
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : "Something went wrong. Please try again.")
      setError(msg || "Something went wrong. Please try again.")
      toast(msg || "Failed to save consent form", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="consent_title">Title *</Label>
        <Input
          id="consent_title"
          placeholder="e.g. General Treatment Consent"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label>Category *</Label>
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select category" />
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

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="consent_content">Content *</Label>
        <Textarea
          id="consent_content"
          placeholder="Enter the full consent form text..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="min-h-[200px] resize-y font-mono text-sm leading-relaxed"
        />
      </div>

      {/* Is Template */}
      <div className="flex items-center gap-3">
        <Switch
          checked={isTemplate}
          onCheckedChange={setIsTemplate}
          id="is_template"
        />
        <Label htmlFor="is_template" className="cursor-pointer text-sm">
          Save as template
        </Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : form ? (
            "Update Form"
          ) : (
            "Create Form"
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// LoadingSkeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className={GLASS}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <div className="flex items-center gap-1 border-t border-foreground/[0.06] pt-3">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-7 w-12 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

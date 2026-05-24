"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Loader2,
  X,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { clinicsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

interface Clinic {
  id: number
  name: string
  address: string
  phone: string
  email: string
  is_active: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
      delay: i * 0.06,
    },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

const statVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 26,
      delay: i * 0.05,
    },
  }),
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClinicsPage() {
  const { toast } = useToast()

  // Data
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)

  // Search
  const [search, setSearch] = useState("")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingClinic, setDeletingClinic] = useState<Clinic | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState<number | null>(null)

  // ---------- Fetch ----------

  const fetchClinics = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await clinicsApi.list()
      setClinics(data.data ?? data ?? [])
    } catch {
      toast("Failed to load clinics", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClinics()
  }, [fetchClinics])

  // ---------- Filtered list ----------

  const filtered = useMemo(() => {
    if (!search.trim()) return clinics
    const q = search.toLowerCase()
    return clinics.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clinics, search])

  // ---------- Stats ----------

  const totalBranches = clinics.length
  const activeBranches = clinics.filter((c) => c.is_active).length
  const inactiveBranches = totalBranches - activeBranches

  // ---------- Handlers ----------

  function openCreate() {
    setEditingClinic(null)
    setFormOpen(true)
  }

  function openEdit(clinic: Clinic) {
    setEditingClinic(clinic)
    setFormOpen(true)
  }

  function openDelete(clinic: Clinic) {
    setDeletingClinic(clinic)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deletingClinic) return
    setDeleting(true)
    try {
      await clinicsApi.delete(deletingClinic.id)
      setDeleteOpen(false)
      setDeletingClinic(null)
      fetchClinics()
      toast("Clinic branch deleted successfully")
    } catch {
      toast("Failed to delete clinic branch", "error")
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(clinic: Clinic) {
    setTogglingId(clinic.id)
    try {
      await clinicsApi.update(clinic.id, {
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        email: clinic.email,
        is_active: !clinic.is_active,
      })
      fetchClinics()
      toast(
        `${clinic.name} is now ${!clinic.is_active ? "active" : "inactive"}`
      )
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setTogglingId(null)
    }
  }

  function handleFormSuccess(isEdit: boolean) {
    toast(isEdit ? "Clinic branch updated" : "Clinic branch created")
    setFormOpen(false)
    setEditingClinic(null)
    fetchClinics()
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clinic Branches"
        description="Manage your multi-branch clinic network"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Branch
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Branches",
            value: totalBranches,
            icon: Building2,
            gradient: "from-teal-500/10 to-emerald-500/10",
            iconColor: "text-teal-600 dark:text-teal-400",
          },
          {
            label: "Active",
            value: activeBranches,
            icon: CheckCircle2,
            gradient: "from-green-500/10 to-emerald-500/10",
            iconColor: "text-green-600 dark:text-green-400",
          },
          {
            label: "Inactive",
            value: inactiveBranches,
            icon: XCircle,
            gradient: "from-red-500/10 to-orange-500/10",
            iconColor: "text-red-600 dark:text-red-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={statVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-4 rounded-xl border-0 px-5 py-4 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient}`}
            >
              <stat.icon className={`size-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Clinic Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/[0.04]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} onCreate={openCreate} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((clinic, i) => (
              <motion.div
                key={clinic.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] h-full flex flex-col">
                  <CardHeader className="pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10">
                          <Building2 className="size-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold leading-snug">
                            {clinic.name}
                          </h3>
                          {clinic.address && (
                            <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="size-3.5 shrink-0" />
                              <span className="truncate">{clinic.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={
                          clinic.is_active
                            ? "border border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                            : "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400"
                        }
                      >
                        {clinic.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3 pt-3">
                    <div className="flex flex-col gap-2 text-sm">
                      {clinic.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                          <span>{clinic.phone}</span>
                        </div>
                      )}
                      {clinic.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                          <span className="truncate">{clinic.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-center gap-1.5 border-t border-foreground/[0.06] pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(clinic)}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <Edit className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(clinic)}
                        disabled={togglingId === clinic.id}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {togglingId === clinic.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : clinic.is_active ? (
                          <ToggleRight className="size-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ToggleLeft className="size-3.5 text-muted-foreground" />
                        )}
                        {clinic.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDelete(clinic)}
                        className="ml-auto h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingClinic(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClinic ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingClinic
                ? "Update the clinic branch details below."
                : "Fill in the details to register a new clinic branch."}
            </DialogDescription>
          </DialogHeader>
          <ClinicForm
            clinic={editingClinic}
            onSuccess={() => handleFormSuccess(!!editingClinic)}
            onCancel={() => {
              setFormOpen(false)
              setEditingClinic(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingClinic?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClinicForm
// ---------------------------------------------------------------------------

function ClinicForm({
  clinic,
  onSuccess,
  onCancel,
}: {
  clinic: Clinic | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(clinic?.name ?? "")
  const [address, setAddress] = useState(clinic?.address ?? "")
  const [phone, setPhone] = useState(clinic?.phone ?? "")
  const [email, setEmail] = useState(clinic?.email ?? "")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Branch name is required.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
      }

      if (clinic) {
        await clinicsApi.update(clinic.id, {
          ...payload,
          is_active: clinic.is_active,
        })
      } else {
        await clinicsApi.create(payload)
      }
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : "Something went wrong. Please try again.")
      setError(msg || "Something went wrong. Please try again.")
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="clinic_name">Branch Name *</Label>
          <Input
            id="clinic_name"
            placeholder="Main Clinic"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="clinic_address">Address</Label>
          <Input
            id="clinic_address"
            placeholder="123 Medical Ave, Suite 100"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clinic_phone">Phone</Label>
          <Input
            id="clinic_phone"
            placeholder="+212 5XX-XXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clinic_email">Email</Label>
          <Input
            id="clinic_email"
            type="email"
            placeholder="branch@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {clinic ? "Updating..." : "Creating..."}
            </>
          ) : clinic ? (
            "Update Branch"
          ) : (
            "Create Branch"
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({
  hasSearch,
  onCreate,
}: {
  hasSearch: boolean
  onCreate: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10">
        <Building2 className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {hasSearch ? "No branches found" : "No clinic branches yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasSearch
            ? "Try adjusting your search query."
            : "Get started by adding your first clinic branch."}
        </p>
      </div>
      {!hasSearch && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Add Branch
        </Button>
      )}
    </motion.div>
  )
}

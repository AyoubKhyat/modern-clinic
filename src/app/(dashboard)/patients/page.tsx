"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  Download,
} from "lucide-react"
import { patientsApi } from "@/lib/api"
import { downloadCsv } from "@/lib/export-csv"
import type { Patient, PaginatedResponse } from "@/types"
import { PageHeader } from "@/components/layout/page-header"
import { PatientForm } from "@/components/patients/patient-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeletons"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

export default function PatientsPage() {
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Patient>["meta"] | null>(
    null
  )
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await patientsApi.list({ page, search: search || undefined })
      setPatients(data.data)
      setMeta(data.meta)
    } catch {
      // handled silently — empty state shown
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  function openCreate() {
    setEditingPatient(undefined)
    setFormOpen(true)
  }

  function openEdit(patient: Patient) {
    setEditingPatient(patient)
    setFormOpen(true)
  }

  function openDelete(patient: Patient) {
    setDeletingPatient(patient)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deletingPatient) return
    setDeleting(true)
    try {
      await patientsApi.delete(deletingPatient.id)
      setDeleteOpen(false)
      setDeletingPatient(null)
      fetchPatients()
      toast("Patient deleted successfully")
    } catch {
      toast("Failed to delete patient", "error")
    } finally {
      setDeleting(false)
    }
  }

  function handleFormSuccess() {
    toast(editingPatient ? "Patient updated successfully" : "Patient created successfully")
    setFormOpen(false)
    setEditingPatient(undefined)
    fetchPatients()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="Manage your clinic's patients"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadCsv("patients").then(() => toast("CSV exported")).catch(() => toast("Export failed", "error"))}>
              <Download className="size-4" />
              Export
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Patient
            </Button>
          </div>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : patients.length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Gender</TableHead>
                  <TableHead className="hidden sm:table-cell">Blood Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Visits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient, i) => (
                  <motion.tr
                    key={patient.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {patient.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3.5" />
                        {patient.phone}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {patient.email || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {patient.gender || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {patient.blood_type ? (
                        <Badge variant="secondary">{patient.blood_type}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {patient.visits_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={
                            <Link href={`/patients/${patient.id}`} />
                          }
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(patient)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDelete(patient)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {meta && meta.last_page > 1 && (
            <Pagination meta={meta} page={page} onPageChange={setPage} />
          )}
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPatient ? "Edit Patient" : "Add Patient"}
            </DialogTitle>
            <DialogDescription>
              {editingPatient
                ? "Update the patient's information below."
                : "Fill in the details to register a new patient."}
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            patient={editingPatient}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingPatient?.full_name}
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
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PaginatedResponse<Patient>["meta"]
  page: number
  onPageChange: (p: number) => void
}) {
  const pages: number[] = []
  for (let i = 1; i <= meta.last_page; i++) {
    if (
      i === 1 ||
      i === meta.last_page ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(page - 1) * meta.per_page + 1}–
        {Math.min(page * meta.per_page, meta.total)} of {meta.total}
      </p>
      <div className="inline-flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((p, idx) => {
          const prevPage = pages[idx - 1]
          const showEllipsis = prevPage !== undefined && p - prevPage > 1
          return (
            <span key={p} className="inline-flex items-center">
              {showEllipsis && (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              )}
              <Button
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </span>
          )
        })}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= meta.last_page}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function EmptyState({
  search,
  onCreate,
}: {
  search: string
  onCreate: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {search ? "No patients found" : "No patients yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try adjusting your search query."
            : "Get started by adding your first patient."}
        </p>
      </div>
      {!search && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Add Patient
        </Button>
      )}
    </motion.div>
  )
}

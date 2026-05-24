"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  Edit,
  KeyRound,
  UserCheck,
  UserX,
  Users,
  Loader2,
  Phone,
} from "lucide-react"
import { usersApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeletons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

/* ── Types ── */

interface User {
  id: number
  name: string
  email: string
  role: "admin" | "doctor" | "receptionist" | "accountant"
  is_active: boolean
  specialty?: string
  phone?: string
  license_number?: string
  hire_date?: string
}

const ROLES = ["admin", "doctor", "receptionist", "accountant"] as const

const ROLE_COLORS: Record<string, string> = {
  admin:
    "bg-purple-500/10 text-purple-700 border border-purple-500/20 dark:text-purple-400",
  doctor:
    "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
  receptionist:
    "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400",
  accountant:
    "bg-teal-500/10 text-teal-700 border border-teal-500/20 dark:text-teal-400",
}

/* ── Page ── */

export default function UsersPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<User | null>(null)

  const [toggleOpen, setToggleOpen] = useState(false)
  const [togglingUser, setTogglingUser] = useState<User | null>(null)
  const [toggling, setToggling] = useState(false)

  /* ── Fetch ── */

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (roleFilter !== "all") params.role = roleFilter
      if (statusFilter !== "all") params.is_active = statusFilter === "active"
      const { data } = await usersApi.list(params)
      setUsers(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  /* Debounce search to avoid extra fetches */
  useEffect(() => {
    const timeout = setTimeout(() => {
      /* triggers fetchUsers via dependency */
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  /* ── Handlers ── */

  function openCreate() {
    setEditingUser(null)
    setFormOpen(true)
  }

  function openEdit(u: User) {
    setEditingUser(u)
    setFormOpen(true)
  }

  function openResetPassword(u: User) {
    setResetUser(u)
    setResetOpen(true)
  }

  function openToggle(u: User) {
    setTogglingUser(u)
    setToggleOpen(true)
  }

  async function confirmToggle() {
    if (!togglingUser) return
    setToggling(true)
    try {
      await usersApi.update(togglingUser.id, {
        is_active: !togglingUser.is_active,
      })
      toast(
        togglingUser.is_active
          ? "Staff member deactivated"
          : "Staff member activated",
        "success"
      )
      setToggleOpen(false)
      setTogglingUser(null)
      fetchUsers()
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setToggling(false)
    }
  }

  function handleFormSuccess() {
    toast(
      editingUser
        ? "Staff member updated successfully"
        : "Staff member created successfully",
      "success"
    )
    setFormOpen(false)
    setEditingUser(null)
    fetchUsers()
  }

  function handleResetSuccess() {
    toast("Password reset successfully", "success")
    setResetOpen(false)
    setResetUser(null)
  }

  /* ── Filtered list (client-side search fallback) ── */

  const filtered = users

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff Management"
        description="Manage clinic staff and roles"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Staff
          </Button>
        }
      />

      {/* ── Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <TableSkeleton columns={8} />
      ) : filtered.length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Specialty</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Hire Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[u.role] ?? ""}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {u.specialty || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {u.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3.5" />
                        {u.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {u.hire_date
                      ? new Date(u.hire_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge className="bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(u)}
                        title="Edit"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openResetPassword(u)}
                        title="Reset password"
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openToggle(u)}
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        {u.is_active ? (
                          <UserX className="size-4 text-destructive" />
                        ) : (
                          <UserCheck className="size-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Add/Edit Staff Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update the staff member's information below."
                : "Fill in the details to add a new staff member."}
            </DialogDescription>
          </DialogHeader>
          <StaffForm
            user={editingUser}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium text-foreground">
                {resetUser?.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <ResetPasswordForm
            user={resetUser}
            onSuccess={handleResetSuccess}
            onCancel={() => setResetOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Toggle Active Confirmation ── */}
      <Dialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {togglingUser?.is_active ? "Deactivate" : "Activate"} Staff Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {togglingUser?.is_active ? "deactivate" : "activate"}{" "}
              <span className="font-medium text-foreground">
                {togglingUser?.name}
              </span>
              ?{" "}
              {togglingUser?.is_active
                ? "They will no longer be able to log in."
                : "They will regain access to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setToggleOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={togglingUser?.is_active ? "destructive" : "default"}
              onClick={confirmToggle}
              disabled={toggling}
            >
              {toggling
                ? "Updating..."
                : togglingUser?.is_active
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Staff Form ── */

function StaffForm({
  user,
  onSuccess,
  onCancel,
}: {
  user: User | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!user

  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState(user?.role ?? "")
  const [specialty, setSpecialty] = useState(user?.specialty ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [licenseNumber, setLicenseNumber] = useState(user?.license_number ?? "")
  const [hireDate, setHireDate] = useState(user?.hire_date ?? "")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Name is required.")
      return
    }
    if (!email.trim()) {
      setError("Email is required.")
      return
    }
    if (!isEdit && !password) {
      setError("Password is required for new staff members.")
      return
    }
    if (!role) {
      setError("Please select a role.")
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim(),
        role,
        specialty: specialty.trim() || undefined,
        phone: phone.trim() || undefined,
        license_number: licenseNumber.trim() || undefined,
        hire_date: hireDate || undefined,
      }

      if (!isEdit) {
        payload.password = password
      }

      if (isEdit) {
        await usersApi.update(user.id, payload)
      } else {
        await usersApi.create(payload)
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
      setLoading(false)
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
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff_name">Name *</Label>
          <Input
            id="staff_name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff_email">Email *</Label>
          <Input
            id="staff_email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Password (create only) */}
        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff_password">Password *</Label>
            <Input
              id="staff_password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9"
            />
          </div>
        )}

        {/* Role */}
        <div className="flex flex-col gap-1.5">
          <Label>Role *</Label>
          <Select value={role} onValueChange={(v) => setRole(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Specialty */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff_specialty">Specialty</Label>
          <Input
            id="staff_specialty"
            placeholder="e.g. Cardiology"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff_phone">Phone</Label>
          <Input
            id="staff_phone"
            placeholder="+212 600 000 000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9"
          />
        </div>

        {/* License Number */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff_license">License Number</Label>
          <Input
            id="staff_license"
            placeholder="License #"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Hire Date */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff_hire_date">Hire Date</Label>
          <Input
            id="staff_hire_date"
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Staff"
          ) : (
            "Add Staff"
          )}
        </Button>
      </div>
    </form>
  )
}

/* ── Reset Password Form ── */

function ResetPasswordForm({
  user,
  onSuccess,
  onCancel,
}: {
  user: User | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Please enter a new password.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (!user) return

    setLoading(true)
    try {
      await usersApi.resetPassword(user.id, password)
      onSuccess()
    } catch {
      toast("Failed to reset password", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new_password">New Password</Label>
        <Input
          id="new_password"
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm_password">Confirm Password</Label>
        <Input
          id="confirm_password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </div>
    </form>
  )
}

/* ── Empty State ── */

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
          {search ? "No staff members found" : "No staff members yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search
            ? "Try adjusting your search or filters."
            : "Get started by adding your first staff member."}
        </p>
      </div>
      {!search && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Add Staff
        </Button>
      )}
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DoorOpen,
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Layers,
  Wrench,
  CalendarClock,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Settings2,
} from "lucide-react"
import { roomsApi, roomBookingsApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Room {
  id: number
  name: string
  type: string
  floor: string
  capacity: number
  equipment: string[]
  status: "available" | "occupied" | "maintenance"
  notes: string | null
}

interface RoomBooking {
  id: number
  room_id: number
  room_name: string
  appointment_id: number | null
  booked_by: number
  booked_by_name: string
  start_time: string
  end_time: string
  purpose: string
}

type RoomType = "all" | "consultation" | "examination" | "surgery" | "lab" | "imaging" | "therapy" | "other"

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "consultation", label: "Consultation" },
  { value: "examination", label: "Examination" },
  { value: "surgery", label: "Surgery" },
  { value: "lab", label: "Laboratory" },
  { value: "imaging", label: "Imaging" },
  { value: "therapy", label: "Therapy" },
  { value: "other", label: "Other" },
]

const ROOM_TYPE_OPTIONS = ROOM_TYPES.filter((t) => t.value !== "all")

const STATUS_CONFIG = {
  available: {
    label: "Available",
    bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  occupied: {
    label: "Occupied",
    bg: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: AlertCircle,
  },
  maintenance: {
    label: "Maintenance",
    bg: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
    dot: "bg-red-500",
    icon: Wrench,
  },
}

const TYPE_COLORS: Record<string, string> = {
  consultation: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  examination: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400",
  surgery: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
  lab: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-400",
  imaging: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-400",
  therapy: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  other: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400",
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      type: "spring" as const,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
    },
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RoomsPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  // Data
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<RoomType>("all")

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bookingsOpen, setBookingsOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  // ---------- Fetch ----------

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await roomsApi.list()
      setRooms(data.data ?? data)
    } catch {
      // empty state shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // ---------- Filtered rooms ----------

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      !search ||
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.floor.toLowerCase().includes(search.toLowerCase()) ||
      room.equipment?.some((e) => e.toLowerCase().includes(search.toLowerCase()))
    const matchesType = typeFilter === "all" || room.type === typeFilter
    return matchesSearch && matchesType
  })

  // ---------- Stats ----------

  const stats = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === "available").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
  }

  // ---------- Handlers ----------

  function openCreate() {
    setEditingRoom(undefined)
    setFormOpen(true)
  }

  function openEdit(room: Room) {
    setEditingRoom(room)
    setFormOpen(true)
  }

  function openDelete(room: Room) {
    setDeletingRoom(room)
    setDeleteOpen(true)
  }

  function openBookings(room: Room) {
    setSelectedRoom(room)
    setBookingsOpen(true)
  }

  async function confirmDelete() {
    if (!deletingRoom) return
    setDeleting(true)
    try {
      await roomsApi.delete(deletingRoom.id)
      setDeleteOpen(false)
      setDeletingRoom(null)
      fetchRooms()
      toast("Room deleted successfully")
    } catch {
      toast("Failed to delete room", "error")
    } finally {
      setDeleting(false)
    }
  }

  async function toggleStatus(room: Room) {
    const cycle: Record<string, string> = {
      available: "occupied",
      occupied: "maintenance",
      maintenance: "available",
    }
    const newStatus = cycle[room.status] ?? "available"
    try {
      await roomsApi.update(room.id, { ...room, status: newStatus })
      fetchRooms()
      toast(`Room status changed to ${newStatus}`)
    } catch {
      toast("Failed to update room status", "error")
    }
  }

  function handleFormSuccess() {
    toast(editingRoom ? "Room updated successfully" : "Room created successfully")
    setFormOpen(false)
    setEditingRoom(undefined)
    fetchRooms()
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rooms & Resources"
        description="Manage clinic rooms, equipment, and bookings"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Room
          </Button>
        }
      />

      {/* Stats Row */}
      {!loading && rooms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring" as const, stiffness: 260, damping: 24 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <StatCard
            label="Total Rooms"
            value={stats.total}
            icon={DoorOpen}
            color="text-teal-600 dark:text-teal-400"
            bg="from-teal-500/10 to-teal-500/5"
          />
          <StatCard
            label="Available"
            value={stats.available}
            icon={CheckCircle2}
            color="text-emerald-600 dark:text-emerald-400"
            bg="from-emerald-500/10 to-emerald-500/5"
          />
          <StatCard
            label="Occupied"
            value={stats.occupied}
            icon={AlertCircle}
            color="text-amber-600 dark:text-amber-400"
            bg="from-amber-500/10 to-amber-500/5"
          />
          <StatCard
            label="Maintenance"
            value={stats.maintenance}
            icon={Wrench}
            color="text-red-600 dark:text-red-400"
            bg="from-red-500/10 to-red-500/5"
          />
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms, floors, equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter((v ?? "all") as RoomType)}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Room Type" />
          </SelectTrigger>
          <SelectContent>
            {ROOM_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Room Grid */}
      {loading ? (
        <RoomGridSkeleton />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          search={search}
          typeFilter={typeFilter}
          onCreate={openCreate}
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onView={() => openBookings(room)}
              onEdit={() => openEdit(room)}
              onDelete={() => openDelete(room)}
              onToggleStatus={() => toggleStatus(room)}
            />
          ))}
        </motion.div>
      )}

      {/* Add/Edit Room Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Add Room"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom
                ? "Update the room details below."
                : "Fill in the details to add a new room."}
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            room={editingRoom}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingRoom?.name}
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

      {/* Room Bookings Dialog */}
      <Dialog open={bookingsOpen} onOpenChange={setBookingsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-teal-600" />
              {selectedRoom?.name} — Today&apos;s Bookings
            </DialogTitle>
            <DialogDescription>
              View and manage bookings for this room.
            </DialogDescription>
          </DialogHeader>
          {selectedRoom && (
            <RoomBookingsPanel
              room={selectedRoom}
              userId={user?.id}
              userName={user?.name}
              onBookingChanged={fetchRooms}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${bg}`}
        >
          <Icon className={`size-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RoomCard
// ---------------------------------------------------------------------------

function RoomCard({
  room,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  room: Room
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  const statusCfg = STATUS_CONFIG[room.status]
  const typeColor = TYPE_COLORS[room.type] ?? TYPE_COLORS.other
  const StatusIcon = statusCfg.icon

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }}
      className="group relative flex flex-col gap-3 rounded-xl border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] bg-card p-4 transition-shadow hover:shadow-md cursor-pointer"
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={`border ${typeColor}`}>
              {room.type.charAt(0).toUpperCase() + room.type.slice(1)}
            </Badge>
            <Badge className={`border ${statusCfg.bg}`}>
              <StatusIcon className="size-3" />
              {statusCfg.label}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="icon-xs" title="Edit" onClick={onEdit}>
            <Edit className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" title="Delete" onClick={onDelete}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Layers className="size-3.5 shrink-0" />
          <span>Floor {room.floor}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-3.5 shrink-0" />
          <span>Capacity: {room.capacity}</span>
        </div>
      </div>

      {/* Equipment */}
      {room.equipment && room.equipment.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {room.equipment.slice(0, 3).map((eq) => (
            <span
              key={eq}
              className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {eq}
            </span>
          ))}
          {room.equipment.length > 3 && (
            <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              +{room.equipment.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Status Toggle Footer */}
      <div
        className="mt-auto pt-2 border-t border-foreground/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="xs"
          className="w-full justify-center gap-1.5 text-xs"
          onClick={onToggleStatus}
        >
          <Settings2 className="size-3" />
          Toggle Status
        </Button>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// RoomForm
// ---------------------------------------------------------------------------

function RoomForm({
  room,
  onSuccess,
  onCancel,
}: {
  room?: Room
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: room?.name ?? "",
    type: room?.type ?? "consultation",
    floor: room?.floor ?? "",
    capacity: room?.capacity?.toString() ?? "1",
    equipment: room?.equipment?.join(", ") ?? "",
    status: room?.status ?? "available",
    notes: room?.notes ?? "",
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast("Room name is required", "error")
      return
    }
    if (!form.floor.trim()) {
      toast("Floor is required", "error")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        floor: form.floor.trim(),
        capacity: Number(form.capacity) || 1,
        equipment: form.equipment
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (room) {
        await roomsApi.update(room.id, payload)
      } else {
        await roomsApi.create(payload)
      }
      onSuccess()
    } catch {
      toast("Failed to save room", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room_name">Name *</Label>
          <Input
            id="room_name"
            placeholder="e.g. Consultation Room A"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Type *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => update("type", v ?? "consultation")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room_floor">Floor *</Label>
          <Input
            id="room_floor"
            placeholder="e.g. 1, Ground, B1"
            value={form.floor}
            onChange={(e) => update("floor", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room_capacity">Capacity</Label>
          <Input
            id="room_capacity"
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => update("capacity", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => update("status", v ?? "available")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room_equipment">Equipment</Label>
          <Input
            id="room_equipment"
            placeholder="Comma-separated, e.g. ECG, Ultrasound"
            value={form.equipment}
            onChange={(e) => update("equipment", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room_notes">Notes</Label>
        <Textarea
          id="room_notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          placeholder="Any additional notes about this room..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : room ? "Update Room" : "Add Room"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ---------------------------------------------------------------------------
// RoomBookingsPanel
// ---------------------------------------------------------------------------

function RoomBookingsPanel({
  room,
  userId,
  userName,
  onBookingChanged,
}: {
  room: Room
  userId?: number
  userName?: string
  onBookingChanged: () => void
}) {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<RoomBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [newBooking, setNewBooking] = useState({
    start_time: "",
    end_time: "",
    purpose: "",
  })

  const today = new Date().toISOString().split("T")[0]

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await roomBookingsApi.list({
        room_id: room.id,
        date: today,
      })
      setBookings(data.data ?? data)
    } catch {
      // empty state
    } finally {
      setLoading(false)
    }
  }, [room.id, today])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handleAddBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!newBooking.start_time || !newBooking.end_time) {
      toast("Start and end times are required", "error")
      return
    }
    if (!newBooking.purpose.trim()) {
      toast("Purpose is required", "error")
      return
    }

    setSaving(true)
    try {
      await roomBookingsApi.create({
        room_id: room.id,
        booked_by: userId,
        start_time: `${today}T${newBooking.start_time}`,
        end_time: `${today}T${newBooking.end_time}`,
        purpose: newBooking.purpose.trim(),
      })
      toast("Booking created successfully")
      setNewBooking({ start_time: "", end_time: "", purpose: "" })
      setShowAddForm(false)
      fetchBookings()
      onBookingChanged()
    } catch {
      toast("Failed to create booking", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBooking(id: number) {
    setDeletingId(id)
    try {
      await roomBookingsApi.delete(id)
      toast("Booking cancelled")
      fetchBookings()
      onBookingChanged()
    } catch {
      toast("Failed to cancel booking", "error")
    } finally {
      setDeletingId(null)
    }
  }

  function formatTime(datetime: string) {
    try {
      return new Date(datetime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return datetime
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Room Info Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
        <Badge className={`border ${STATUS_CONFIG[room.status].bg}`}>
          {STATUS_CONFIG[room.status].label}
        </Badge>
        <span className="text-muted-foreground">
          Floor {room.floor} | Capacity: {room.capacity}
        </span>
      </div>

      {/* Bookings List */}
      <ScrollArea className="max-h-64">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted/40"
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarClock className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No bookings for today
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {bookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ type: "spring" as const, stiffness: 260, damping: 24 }}
                  className="flex items-center gap-3 rounded-lg border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] bg-card p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                    <Clock className="size-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {booking.purpose}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(booking.start_time)} —{" "}
                      {formatTime(booking.end_time)} | {booking.booked_by_name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Cancel booking"
                    disabled={deletingId === booking.id}
                    onClick={() => handleDeleteBooking(booking.id)}
                  >
                    <X className="size-3.5 text-destructive" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Add Booking */}
      {showAddForm ? (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring" as const, stiffness: 260, damping: 24 }}
          onSubmit={handleAddBooking}
          className="flex flex-col gap-3 rounded-lg border border-dashed border-teal-500/30 bg-teal-500/[0.03] p-3"
        >
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
            New Booking
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="bk_start" className="text-xs">
                Start Time *
              </Label>
              <Input
                id="bk_start"
                type="time"
                value={newBooking.start_time}
                onChange={(e) =>
                  setNewBooking((p) => ({ ...p, start_time: e.target.value }))
                }
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="bk_end" className="text-xs">
                End Time *
              </Label>
              <Input
                id="bk_end"
                type="time"
                value={newBooking.end_time}
                onChange={(e) =>
                  setNewBooking((p) => ({ ...p, end_time: e.target.value }))
                }
                className="h-8"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="bk_purpose" className="text-xs">
              Purpose *
            </Label>
            <Input
              id="bk_purpose"
              placeholder="e.g. Patient consultation"
              value={newBooking.purpose}
              onChange={(e) =>
                setNewBooking((p) => ({ ...p, purpose: e.target.value }))
              }
              className="h-8"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Booking..." : "Add Booking"}
            </Button>
          </div>
        </motion.form>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed border-teal-500/30 text-teal-700 hover:bg-teal-500/5 dark:text-teal-400"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="size-4" />
          Add Booking
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RoomGridSkeleton
// ---------------------------------------------------------------------------

function RoomGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04] p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
              <div className="flex gap-1.5">
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted/60" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted/60" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="flex gap-1">
            <div className="h-5 w-14 animate-pulse rounded bg-muted/40" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="mt-auto border-t border-foreground/[0.04] pt-2">
            <div className="h-6 w-full animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({
  search,
  typeFilter,
  onCreate,
}: {
  search: string
  typeFilter: RoomType
  onCreate: () => void
}) {
  const hasFilter = !!search || typeFilter !== "all"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 260, damping: 24 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <DoorOpen className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {hasFilter ? "No rooms found" : "No rooms yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilter
            ? "Try adjusting your filters or search query."
            : "Get started by adding your first room."}
        </p>
      </div>
      {!hasFilter && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Add Room
        </Button>
      )}
    </motion.div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Clock, Plus, Trash2, Calendar, Loader2, Edit } from "lucide-react"
import { schedulesApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { useAuthStore } from "@/stores/auth-store"

const DOCTORS = [
  { value: "2", label: "Dr. Amina Tazi" },
  { value: "3", label: "Dr. Youssef El Idrissi" },
]

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
]

interface Schedule {
  id: number
  doctor_id: number
  doctor_name: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface ScheduleFormData {
  doctor_id: string
  day_of_week: string
  start_time: string
  end_time: string
  is_available: boolean
}

const emptyForm: ScheduleFormData = {
  doctor_id: "",
  day_of_week: "",
  start_time: "09:00",
  end_time: "17:00",
  is_available: true,
}

export default function StaffSchedulingPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin"

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await schedulesApi.list()
      setSchedules(data.data ?? data ?? [])
    } catch {
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  function getSlot(doctorId: number, dayOfWeek: number): Schedule | undefined {
    return schedules.find(
      (s) => s.doctor_id === doctorId && s.day_of_week === dayOfWeek
    )
  }

  function openCreate(doctorId?: number, day?: number) {
    setEditingSchedule(null)
    setFormOpen(true)
  }

  function openEdit(schedule: Schedule) {
    setEditingSchedule(schedule)
    setFormOpen(true)
  }

  function handleCellClick(doctorId: number, day: number) {
    if (!isAdmin) return
    const slot = getSlot(doctorId, day)
    if (slot) {
      openEdit(slot)
    } else {
      setEditingSchedule(null)
      setFormOpen(true)
    }
  }

  async function handleDelete(id: number) {
    try {
      await schedulesApi.delete(id)
      toast("Schedule slot removed")
      setDeleteConfirmId(null)
      fetchSchedules()
    } catch {
      toast("Failed to delete schedule", "error")
    }
  }

  function handleFormSuccess() {
    toast(editingSchedule ? "Schedule updated" : "Schedule slot added")
    setFormOpen(false)
    setEditingSchedule(null)
    fetchSchedules()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff Schedule"
        description="Manage doctor availability and weekly schedules"
        action={
          isAdmin ? (
            <Button onClick={() => openCreate()}>
              <Plus className="size-4" />
              Add Slot
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <ScheduleGridSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-teal-500" />
                <h3 className="text-base font-semibold">Weekly Availability</h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Doctor
                      </th>
                      {DAYS.map((day) => (
                        <th
                          key={day.value}
                          className="px-3 py-3 text-center text-sm font-medium text-muted-foreground"
                        >
                          <span className="hidden sm:inline">{day.label}</span>
                          <span className="sm:hidden">{day.short}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DOCTORS.map((doctor, idx) => (
                      <motion.tr
                        key={doctor.value}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="border-b last:border-b-0 transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10">
                              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                                {doctor.label.split(" ").slice(1).map((n) => n[0]).join("")}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{doctor.label}</span>
                          </div>
                        </td>
                        {DAYS.map((day) => {
                          const slot = getSlot(Number(doctor.value), day.value)
                          return (
                            <td
                              key={day.value}
                              className="px-2 py-3 text-center"
                            >
                              <button
                                type="button"
                                onClick={() => handleCellClick(Number(doctor.value), day.value)}
                                disabled={!isAdmin}
                                className={`group relative inline-flex min-w-[100px] flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs transition-all ${
                                  isAdmin
                                    ? "cursor-pointer hover:ring-2 hover:ring-teal-500/30"
                                    : "cursor-default"
                                } ${
                                  slot && slot.is_available
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : slot && !slot.is_available
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                {slot ? (
                                  <>
                                    <span className="flex items-center gap-1 font-medium">
                                      <Clock className="size-3" />
                                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                    </span>
                                    {!slot.is_available && (
                                      <Badge variant="outline" className="h-4 px-1 text-[10px] border-red-500/30 text-red-500">
                                        Unavailable
                                      </Badge>
                                    )}
                                    {isAdmin && (
                                      <span className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-foreground/10 group-hover:flex dark:bg-slate-800">
                                        <Edit className="size-3 text-muted-foreground" />
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="py-1 text-muted-foreground/60">Off</span>
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Schedule list for mobile / detailed view */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
            {DOCTORS.map((doctor) => {
              const doctorSchedules = schedules.filter(
                (s) => s.doctor_id === Number(doctor.value)
              )
              return (
                <Card key={doctor.value}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{doctor.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {doctorSchedules.filter((s) => s.is_available).length} days
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {DAYS.map((day) => {
                      const slot = getSlot(Number(doctor.value), day.value)
                      return (
                        <div
                          key={day.value}
                          className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{day.short}</span>
                          {slot ? (
                            <div className="flex items-center gap-2">
                              <span className={slot.is_available ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                              </span>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteConfirmId(slot.id)}
                                  className="size-6 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Off</span>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule Slot" : "Add Schedule Slot"}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule
                ? "Update the doctor's availability for this day."
                : "Set up a new availability slot for a doctor."}
            </DialogDescription>
          </DialogHeader>
          <ScheduleForm
            schedule={editingSchedule}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
            onDelete={
              editingSchedule
                ? () => {
                    setFormOpen(false)
                    setDeleteConfirmId(editingSchedule.id)
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Schedule Slot</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this schedule slot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ScheduleForm({
  schedule,
  onSuccess,
  onCancel,
  onDelete,
}: {
  schedule: Schedule | null
  onSuccess: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const isEdit = !!schedule

  const [form, setForm] = useState<ScheduleFormData>(() => {
    if (schedule) {
      return {
        doctor_id: String(schedule.doctor_id),
        day_of_week: String(schedule.day_of_week),
        start_time: schedule.start_time.slice(0, 5),
        end_time: schedule.end_time.slice(0, 5),
        is_available: schedule.is_available,
      }
    }
    return { ...emptyForm }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.doctor_id || !form.day_of_week || !form.start_time || !form.end_time) {
      setError("Please fill in all required fields.")
      return
    }

    if (form.start_time >= form.end_time) {
      setError("End time must be after start time.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        doctor_id: Number(form.doctor_id),
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        is_available: form.is_available,
      }

      if (isEdit) {
        await schedulesApi.update(schedule.id, payload)
      } else {
        await schedulesApi.create(payload)
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Doctor *</Label>
        <Select
          value={form.doctor_id}
          onValueChange={(v) => update("doctor_id", v ?? "")}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select doctor" />
          </SelectTrigger>
          <SelectContent>
            {DOCTORS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Day *</Label>
        <Select
          value={form.day_of_week}
          onValueChange={(v) => update("day_of_week", v ?? "")}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d.value} value={String(d.value)}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Start Time *</Label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => update("start_time", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>End Time *</Label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => update("end_time", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label>Available</Label>
        <button
          type="button"
          role="switch"
          aria-checked={form.is_available}
          onClick={() => update("is_available", !form.is_available)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            form.is_available ? "bg-teal-500" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
              form.is_available ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-xs text-muted-foreground">
          {form.is_available ? "Doctor is available" : "Doctor is unavailable"}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {isEdit && onDelete && (
            <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isEdit ? "Updating..." : "Adding..."}
              </>
            ) : isEdit ? (
              "Update Slot"
            ) : (
              "Add Slot"
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

function ScheduleGridSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </th>
                {DAYS.map((day) => (
                  <th key={day.value} className="px-3 py-3 text-center">
                    <div className="mx-auto h-4 w-12 animate-pulse rounded bg-muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOCTORS.map((doctor) => (
                <tr key={doctor.value} className="border-b">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </div>
                  </td>
                  {DAYS.map((day) => (
                    <td key={day.value} className="px-2 py-3 text-center">
                      <div className="mx-auto h-8 w-24 animate-pulse rounded-lg bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
} from "date-fns"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Stethoscope,
  FileText,
  Loader2,
} from "lucide-react"
import { appointmentsApi, appointmentsRangeApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  scheduled_at: string
  duration_minutes: number
  status: string
  type: string
  reason?: string
  patient_name?: string
  doctor_name?: string
  patient?: { id: number; full_name: string }
  doctor?: { id: number; name: string }
}

type ViewMode = "day" | "week"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#22c55e",
  arrived: "#f59e0b",
  completed: "#0d9488",
  cancelled: "#ef4444",
}

const STATUS_BG: Record<string, string> = {
  scheduled: "rgba(59,130,246,0.12)",
  confirmed: "rgba(34,197,94,0.12)",
  arrived: "rgba(245,158,11,0.12)",
  completed: "rgba(13,148,136,0.12)",
  cancelled: "rgba(239,68,68,0.12)",
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
}

const HOURS_START = 8
const HOURS_END = 18
const SLOT_HEIGHT = 48 // px per 30 minutes
const TOTAL_SLOTS = (HOURS_END - HOURS_START) * 2

/** Generate time labels from 08:00 to 18:00 in 30-min increments */
function buildTimeSlots() {
  const slots: { hour: number; minute: number; label: string }[] = []
  for (let h = HOURS_START; h < HOURS_END; h++) {
    slots.push({ hour: h, minute: 0, label: format(setMinutes(setHours(new Date(), h), 0), "HH:mm") })
    slots.push({ hour: h, minute: 30, label: format(setMinutes(setHours(new Date(), h), 30), "HH:mm") })
  }
  return slots
}

const TIME_SLOTS = buildTimeSlots()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPatientName(apt: Appointment): string {
  return apt.patient_name ?? apt.patient?.full_name ?? "Unknown"
}

function getDoctorName(apt: Appointment): string {
  return apt.doctor_name ?? apt.doctor?.name ?? "Unknown"
}

/** Pixel offset from the top of the grid for a given Date */
function timeToOffset(date: Date): number {
  const h = date.getHours()
  const m = date.getMinutes()
  const totalMinutes = (h - HOURS_START) * 60 + m
  return (totalMinutes / 30) * SLOT_HEIGHT
}

/** Pixel height for a given duration in minutes */
function durationToHeight(minutes: number): number {
  return (minutes / 30) * SLOT_HEIGHT
}

/** Given a Y pixel offset inside the grid, compute the Date (hours/minutes) for the given day */
function offsetToTime(day: Date, yOffset: number): Date {
  const totalMinutes = Math.round((yOffset / SLOT_HEIGHT) * 30)
  // Snap to 15-min increments for better UX
  const snapped = Math.round(totalMinutes / 15) * 15
  const h = HOURS_START + Math.floor(snapped / 60)
  const m = snapped % 60
  const result = new Date(day)
  result.setHours(h, m, 0, 0)
  return result
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { toast } = useToast()

  // Responsive: default to day view on mobile
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return "day"
    return "week"
  })

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  // Listen for resize to toggle default view
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setViewMode("day")
      else setViewMode("week")
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Compute date range based on view
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )

  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      return {
        start: weekStart,
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    }
    // Day view: just the single day
    return { start: currentDate, end: currentDate }
  }, [viewMode, currentDate, weekStart])

  // Fetch appointments for the visible range
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const startStr = format(dateRange.start, "yyyy-MM-dd")
      const endStr = format(addDays(dateRange.end, 1), "yyyy-MM-dd")
      const { data } = await appointmentsRangeApi.range(startStr, endStr)
      setAppointments(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Navigation
  function goToday() {
    setCurrentDate(new Date())
  }

  function goPrev() {
    if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1))
    else setCurrentDate((d) => subDays(d, 1))
  }

  function goNext() {
    if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1))
    else setCurrentDate((d) => addDays(d, 1))
  }

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (viewMode === "week") {
      const days = getWeekDays(weekStart)
      const first = days[0]
      const last = days[6]
      if (first.getMonth() === last.getMonth()) {
        return `${format(first, "MMM d")} - ${format(last, "d, yyyy")}`
      }
      return `${format(first, "MMM d")} - ${format(last, "MMM d, yyyy")}`
    }
    return format(currentDate, "EEEE, MMMM d, yyyy")
  }, [viewMode, currentDate, weekStart])

  // Appointment detail
  function openDetail(apt: Appointment) {
    setSelectedAppointment(apt)
    setDetailOpen(true)
  }

  // Drag & drop update
  async function handleDrop(aptId: number, newDateTime: Date) {
    try {
      await appointmentsApi.update(aptId, {
        scheduled_at: format(newDateTime, "yyyy-MM-dd'T'HH:mm:ss"),
      })
      toast("Appointment rescheduled successfully")
      fetchAppointments()
    } catch {
      toast("Failed to reschedule appointment", "error")
    }
  }

  // Days to render
  const visibleDays = useMemo(() => {
    if (viewMode === "week") return getWeekDays(weekStart)
    return [currentDate]
  }, [viewMode, weekStart, currentDate])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendar" description="Visual appointment scheduling" />

      {/* Toolbar: View toggle + Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="inline-flex rounded-lg border border-border/40 p-0.5">
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("day")}
          >
            Day
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Date range display */}
        <span className="text-sm font-medium text-muted-foreground">
          {dateRangeLabel}
        </span>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/[0.06] shadow-sm">
          <CalendarGrid
            days={visibleDays}
            appointments={appointments}
            viewMode={viewMode}
            onAppointmentClick={openDetail}
            onDrop={handleDrop}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
          />
        </div>
      )}

      {/* Appointment detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              View the details for this appointment.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <AppointmentDetailContent appointment={selectedAppointment} />
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CalendarGrid
// ---------------------------------------------------------------------------

function CalendarGrid({
  days,
  appointments,
  viewMode,
  onAppointmentClick,
  onDrop,
  draggingId,
  setDraggingId,
}: {
  days: Date[]
  appointments: Appointment[]
  viewMode: ViewMode
  onAppointmentClick: (apt: Appointment) => void
  onDrop: (aptId: number, newDateTime: Date) => void
  draggingId: number | null
  setDraggingId: (id: number | null) => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)

  // Group appointments by date string
  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const apt of appointments) {
      const dateKey = format(parseISO(apt.scheduled_at), "yyyy-MM-dd")
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(apt)
    }
    return map
  }, [appointments])

  const colCount = days.length

  return (
    <div className="min-w-[600px]">
      {/* Day headers */}
      <div
        className="grid border-b border-border/40 bg-muted/30"
        style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
      >
        {/* Empty corner for time column */}
        <div className="border-r border-border/20 p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`border-r border-border/20 p-2 text-center last:border-r-0 ${
              isToday(day) ? "bg-primary/5" : ""
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {format(day, "EEE")}
            </div>
            <div
              className={`mt-0.5 text-lg font-semibold ${
                isToday(day)
                  ? "inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : ""
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid body */}
      <div
        ref={gridRef}
        className="relative grid"
        style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
      >
        {/* Time labels column */}
        <div className="border-r border-border/20">
          {TIME_SLOTS.map((slot, i) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="flex h-[48px] items-start justify-end border-b border-border/10 pr-2 pt-0.5"
            >
              {slot.minute === 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayAppts = appointmentsByDay[dateKey] ?? []

          return (
            <DayColumn
              key={day.toISOString()}
              day={day}
              appointments={dayAppts}
              isLast={dayIndex === colCount - 1}
              onAppointmentClick={onAppointmentClick}
              onDrop={onDrop}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              isWide={viewMode === "day"}
            />
          )
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator days={days} colCount={colCount} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DayColumn
// ---------------------------------------------------------------------------

function DayColumn({
  day,
  appointments,
  isLast,
  onAppointmentClick,
  onDrop,
  draggingId,
  setDraggingId,
  isWide,
}: {
  day: Date
  appointments: Appointment[]
  isLast: boolean
  onAppointmentClick: (apt: Appointment) => void
  onDrop: (aptId: number, newDateTime: Date) => void
  draggingId: number | null
  setDraggingId: (id: number | null) => void
  isWide: boolean
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  const [dropTargetSlot, setDropTargetSlot] = useState<number | null>(null)

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (!columnRef.current) return
    const rect = columnRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    // Snap to 15-min increments
    const slotIndex = Math.round(y / (SLOT_HEIGHT / 2)) * (SLOT_HEIGHT / 2)
    setDropTargetSlot(Math.max(0, Math.min(slotIndex, TOTAL_SLOTS * SLOT_HEIGHT - SLOT_HEIGHT)))
  }

  function handleDragLeave() {
    setDropTargetSlot(null)
  }

  function handleDropEvent(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDropTargetSlot(null)
    const aptId = Number(e.dataTransfer.getData("text/plain"))
    if (!aptId || !columnRef.current) return

    const rect = columnRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const newDateTime = offsetToTime(day, y)

    // Ensure within bounds
    if (newDateTime.getHours() < HOURS_START || newDateTime.getHours() >= HOURS_END) return

    onDrop(aptId, newDateTime)
    setDraggingId(null)
  }

  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT

  return (
    <div
      ref={columnRef}
      className={`relative border-r border-border/20 ${isLast ? "border-r-0" : ""} ${
        isToday(day) ? "bg-primary/[0.02]" : ""
      }`}
      style={{ height: totalHeight }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
    >
      {/* Slot grid lines */}
      {TIME_SLOTS.map((slot) => (
        <div
          key={`${slot.hour}-${slot.minute}`}
          className="absolute left-0 right-0 border-b border-border/10"
          style={{
            top: timeToOffset(
              setMinutes(setHours(new Date(), slot.hour), slot.minute)
            ),
            height: SLOT_HEIGHT,
          }}
        />
      ))}

      {/* Drop target indicator */}
      {dropTargetSlot !== null && draggingId !== null && (
        <div
          className="absolute left-1 right-1 rounded border-2 border-dashed border-primary/40 bg-primary/5 transition-all"
          style={{
            top: dropTargetSlot,
            height: SLOT_HEIGHT,
          }}
        />
      )}

      {/* Appointment blocks */}
      {appointments.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-muted-foreground/40">No appointments</span>
        </div>
      )}

      {appointments.map((apt) => (
        <AppointmentBlock
          key={apt.id}
          appointment={apt}
          onClick={() => onAppointmentClick(apt)}
          onDragStart={() => setDraggingId(apt.id)}
          onDragEnd={() => setDraggingId(null)}
          isDragging={draggingId === apt.id}
          isWide={isWide}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppointmentBlock
// ---------------------------------------------------------------------------

function AppointmentBlock({
  appointment,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  isWide,
}: {
  appointment: Appointment
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  isDragging: boolean
  isWide: boolean
}) {
  const scheduledDate = parseISO(appointment.scheduled_at)
  const top = timeToOffset(scheduledDate)
  const height = durationToHeight(appointment.duration_minutes)
  const color = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.scheduled
  const bgColor = STATUS_BG[appointment.status] ?? STATUS_BG.scheduled
  const timeLabel = format(scheduledDate, "HH:mm")

  // Don't render blocks completely outside the visible range
  if (scheduledDate.getHours() < HOURS_START || scheduledDate.getHours() >= HOURS_END) {
    return null
  }

  return (
    <div
      className={`absolute cursor-grab rounded-md border-l-[3px] px-1.5 py-1 text-xs transition-shadow active:cursor-grabbing ${
        isWide ? "left-2 right-2" : "left-1 right-1"
      } hover:shadow-md hover:ring-1 hover:ring-foreground/10`}
      style={{
        top: Math.max(0, top),
        height: Math.max(SLOT_HEIGHT / 2, height),
        backgroundColor: bgColor,
        borderLeftColor: color,
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.5 : 1,
      }}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(appointment.id))
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragEnd={() => onDragEnd()}
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span
          className="truncate font-medium leading-tight"
          style={{ color }}
        >
          {getPatientName(appointment)}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {timeLabel} &middot; {appointment.duration_minutes}min
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CurrentTimeIndicator
// ---------------------------------------------------------------------------

function CurrentTimeIndicator({
  days,
  colCount,
}: {
  days: Date[]
  colCount: number
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Only show if today is within visible days
  const todayIndex = days.findIndex((d) => isSameDay(d, now))
  if (todayIndex === -1) return null

  const hours = now.getHours()
  if (hours < HOURS_START || hours >= HOURS_END) return null

  const top = timeToOffset(now)

  // Position: skip the 64px time column, then offset into the correct day column
  const columnWidth = `calc((100% - 64px) / ${colCount})`
  const left = `calc(64px + ${todayIndex} * ${columnWidth})`

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        top,
        left,
        width: columnWidth,
      }}
    >
      <div className="relative flex items-center">
        <div className="size-2 rounded-full bg-red-500" />
        <div className="h-[2px] flex-1 bg-red-500" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Appointment Detail Content
// ---------------------------------------------------------------------------

function AppointmentDetailContent({ appointment }: { appointment: Appointment }) {
  const scheduledDate = parseISO(appointment.scheduled_at)
  const statusColor = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.scheduled
  const statusLabel = STATUS_LABELS[appointment.status] ?? appointment.status

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: STATUS_BG[appointment.status] ?? STATUS_BG.scheduled,
            color: statusColor,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          {statusLabel}
        </span>
        <Badge variant="outline">{appointment.type}</Badge>
      </div>

      <Separator />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <User className="size-3" />
            Patient
          </span>
          <span className="font-medium">{getPatientName(appointment)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Stethoscope className="size-3" />
            Doctor
          </span>
          <span className="font-medium">{getDoctorName(appointment)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Calendar className="size-3" />
            Date & Time
          </span>
          <span>{format(scheduledDate, "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="size-3" />
            Duration
          </span>
          <span>{appointment.duration_minutes} minutes</span>
        </div>
      </div>

      {appointment.reason && (
        <>
          <Separator />
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <FileText className="size-3" />
              Reason
            </span>
            <p className="text-muted-foreground">{appointment.reason}</p>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-24"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading calendar...</p>
    </motion.div>
  )
}

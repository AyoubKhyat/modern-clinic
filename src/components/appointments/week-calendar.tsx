"use client"

import { useMemo } from "react"
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns"
import type { Appointment } from "@/types"
import { statusColorMap, appointmentStatusConfig } from "@/lib/constants"

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

interface WeekCalendarProps {
  appointments: Appointment[]
  weekStart: Date
  onAppointmentClick: (apt: Appointment) => void
}

export function WeekCalendar({ appointments, weekStart, onAppointmentClick }: WeekCalendarProps) {
  const days = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [weekStart])

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const apt of appointments) {
      const key = format(parseISO(apt.scheduled_at), "yyyy-MM-dd")
      const arr = map.get(key) ?? []
      arr.push(apt)
      map.set(key, arr)
    }
    return map
  }, [appointments])

  const isToday = (d: Date) => isSameDay(d, new Date())

  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 bg-muted/30">
        <div className="p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center text-xs font-medium ${isToday(day) ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`}
          >
            <div>{format(day, "EEE")}</div>
            <div className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold ${isToday(day) ? "bg-teal-500 text-white" : ""}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="flex h-16 items-start justify-end border-b border-r border-border/20 pr-2 pt-1 text-[10px] text-muted-foreground/60">
                {format(new Date(2000, 0, 1, hour), "h a")}
              </div>
              {days.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd")
                const dayAppts = grouped.get(dateKey) ?? []
                const hourAppts = dayAppts.filter((a) => {
                  const h = parseISO(a.scheduled_at).getHours()
                  return h === hour
                })

                return (
                  <div
                    key={`${dateKey}-${hour}`}
                    className="relative h-16 border-b border-r border-border/20 p-0.5"
                  >
                    {hourAppts.map((apt) => {
                      const colors = statusColorMap[apt.status] ?? ""
                      return (
                        <button
                          key={apt.id}
                          onClick={() => onAppointmentClick(apt)}
                          className={`mb-0.5 w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 ${colors}`}
                          title={`${apt.patient?.full_name} — ${appointmentStatusConfig[apt.status]?.label}`}
                        >
                          <div className="truncate">{apt.patient?.full_name ?? "—"}</div>
                          <div className="opacity-70">{format(parseISO(apt.scheduled_at), "h:mm a")}</div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

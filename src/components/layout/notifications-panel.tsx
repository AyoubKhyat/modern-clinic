"use client"

import { useCallback, useEffect, useState } from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { formatDistanceToNow, parseISO } from "date-fns"
import {
  Bell,
  CalendarDays,
  CreditCard,
  CheckCheck,
  Inbox,
} from "lucide-react"
import { dashboardApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { Appointment, Payment } from "@/types"

interface NotificationItem {
  id: string
  type: "appointment" | "payment"
  title: string
  description: string
  timestamp: string
  read: boolean
}

function getReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem("clinic_notifications_read")
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem("clinic_notifications_read", JSON.stringify([...ids]))
}

function NotificationContent({
  items,
  loading,
  unreadCount,
  onMarkAllRead,
}: {
  items: NotificationItem[]
  loading: boolean
  unreadCount: number
  onMarkAllRead: () => void
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
          >
            <CheckCheck className="size-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[400px] flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg p-2"
              >
                <div className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-40 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
              <Inbox className="size-5 text-teal-600/60 dark:text-teal-400/60" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              No recent activity
            </p>
          </div>
        ) : (
          <div className="flex flex-col p-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30 ${
                  !item.read ? "bg-teal-500/[0.04]" : ""
                }`}
              >
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    item.type === "appointment"
                      ? "bg-blue-500/10"
                      : "bg-emerald-500/10"
                  }`}
                >
                  {item.type === "appointment" ? (
                    <CalendarDays
                      className={`size-3.5 ${
                        item.type === "appointment"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    />
                  ) : (
                    <CreditCard className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.title}
                    </span>
                    {!item.read && (
                      <span className="size-1.5 shrink-0 rounded-full bg-teal-500" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                    {formatDistanceToNow(parseISO(item.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function NotificationsPanel() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 639px)")

  useEffect(() => {
    setReadIds(getReadIds())
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!user?.role) return
    setLoading(true)
    try {
      const endpoint =
        user.role === "admin"
          ? dashboardApi.admin
          : user.role === "doctor"
            ? dashboardApi.doctor
            : dashboardApi.reception

      const { data } = await endpoint()
      const dashboard = data.data ?? data
      const notifications: NotificationItem[] = []

      const appointments: Appointment[] =
        dashboard.recent_appointments ?? dashboard.today_appointments ?? []
      for (const apt of appointments.slice(0, 5)) {
        notifications.push({
          id: `apt-${apt.id}`,
          type: "appointment",
          title: apt.patient
            ? `${apt.patient.first_name} ${apt.patient.last_name}`
            : "Patient",
          description: `${apt.status === "scheduled" ? "Scheduled" : apt.status} — ${apt.type || "consultation"}`,
          timestamp: apt.scheduled_at ?? apt.created_at,
          read: readIds.has(`apt-${apt.id}`),
        })
      }

      const payments: Payment[] =
        dashboard.recent_payments ?? dashboard.pending_payments ?? []
      for (const pay of payments.slice(0, 3)) {
        notifications.push({
          id: `pay-${pay.id}`,
          type: "payment",
          title: pay.patient
            ? `${pay.patient.first_name} ${pay.patient.last_name}`
            : "Payment",
          description: `${pay.amount.toFixed(2)} MAD — ${pay.status}`,
          timestamp: pay.paid_at ?? pay.created_at,
          read: readIds.has(`pay-${pay.id}`),
        })
      }

      notifications.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setItems(notifications.slice(0, 8))
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [user?.role, readIds])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  const unreadCount = items.filter((i) => !i.read).length

  function markAllRead() {
    const newReadIds = new Set(readIds)
    for (const item of items) newReadIds.add(item.id)
    setReadIds(newReadIds)
    saveReadIds(newReadIds)
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
  }

  const triggerContent = (
    <>
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-40" />
          <span className="relative inline-flex size-2 rounded-full bg-red-500" />
        </span>
      )}
      <span className="sr-only">Notifications</span>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative text-muted-foreground hover:text-foreground"
            />
          }
        >
          {triggerContent}
        </SheetTrigger>
        <SheetContent side="right" className="w-full p-0 sm:max-w-sm" showCloseButton={false}>
          <SheetTitle className="sr-only">Notifications</SheetTitle>
          <NotificationContent items={items} loading={loading} unreadCount={unreadCount} onMarkAllRead={markAllRead} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-muted-foreground hover:text-foreground"
          />
        }
      >
        {triggerContent}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="bottom" align="end" sideOffset={8}>
          <PopoverPrimitive.Popup className="z-50 w-80 overflow-hidden rounded-xl bg-popover/80 shadow-xl ring-1 ring-foreground/10 backdrop-blur-2xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-popover/90">
            <NotificationContent items={items} loading={loading} unreadCount={unreadCount} onMarkAllRead={markAllRead} />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

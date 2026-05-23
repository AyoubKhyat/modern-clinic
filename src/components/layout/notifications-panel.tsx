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
  Info,
} from "lucide-react"
import { notificationsApi } from "@/lib/api"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet"

interface NotificationItem {
  id: number
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

const typeIcons: Record<string, typeof CalendarDays> = {
  appointment: CalendarDays,
  payment: CreditCard,
  info: Info,
}

const typeColors: Record<string, { icon: string; bg: string }> = {
  appointment: { icon: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  payment: { icon: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  info: { icon: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
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

      <div className="max-h-[400px] flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg p-2">
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
            <p className="text-sm text-muted-foreground/60">No notifications</p>
          </div>
        ) : (
          <div className="flex flex-col p-1.5">
            {items.map((item) => {
              const colors = typeColors[item.type] ?? typeColors.info
              const Icon = typeIcons[item.type] ?? Info
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30 ${
                    !item.read ? "bg-teal-500/[0.04]" : ""
                  }`}
                >
                  <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
                    <Icon className={`size-3.5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{item.title}</span>
                      {!item.read && <span className="size-1.5 shrink-0 rounded-full bg-teal-500" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{item.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                      {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 639px)")

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await notificationsApi.list()
      setItems(data)
    } catch {
      if (!silent) setItems([])
    }
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications(true)
  }, [fetchNotifications])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  useEffect(() => {
    const interval = setInterval(() => fetchNotifications(true), 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = items.filter((i) => !i.read).length

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    } catch {}
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

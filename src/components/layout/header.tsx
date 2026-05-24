"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/layout/theme-provider"
import {
  Sun,
  Moon,
  Menu,
  LogOut,
  User as UserIcon,
  Search,
  ChevronRight,
} from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { NotificationsPanel } from "@/components/layout/notifications-panel"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { MobileSidebar } from "@/components/layout/sidebar"

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  appointments: "Appointments",
  visits: "Visits",
  prescriptions: "Prescriptions",
  payments: "Payments",
  inventory: "Inventory",
  payroll: "Payroll",
  analytics: "Analytics",
  reports: "Reports",
  "staff-scheduling": "Staff Schedule",
  expenses: "Expenses",
  leaves: "Leave Management",
  "bulk-notify": "Bulk Notifications",
  "waiting-room": "Waiting Room",
  "doctor-performance": "Doctor Performance",
  portal: "Patient Portal",
  calendar: "Calendar",
  chat: "Chat",
  users: "Staff Management",
  surveys: "Surveys",
  rooms: "Rooms",
  tasks: "Task Board",
  "referral-tracking": "Referrals",
  "staff-reviews": "Staff Reviews",
  clinics: "Branches",
  "recurring-appointments": "Recurring Appointments",
  budgeting: "Budgeting",
  "consent-forms": "Consent Forms",
  "audit-log": "Audit Log",
  settings: "Settings",
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:block">
      <ol className="flex items-center gap-1.5 text-sm">
        {segments.map((seg, i) => {
          const label = routeLabels[seg] ?? (isNaN(Number(seg)) ? seg : "Details")
          const isLast = i === segments.length - 1

          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="size-3 text-muted-foreground/30" />
              )}
              <span
                className={
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground/60"
                }
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Header({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/40 bg-white/70 px-4 shadow-[0_1px_3px_oklch(0_0_0/4%)] backdrop-blur-xl dark:bg-slate-950/70 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          className="lg:hidden"
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      <Breadcrumbs />

      {/* Cmd+K search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="ml-4 hidden gap-2 rounded-lg border-border/50 bg-muted/30 px-3 text-muted-foreground/60 hover:text-muted-foreground md:inline-flex"
        onClick={onOpenCommandPalette}
      >
        <Search className="size-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="pointer-events-none ml-2 hidden select-none rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/50 sm:inline-block">
          ⌘K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <NotificationsPanel />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-1 rounded-full outline-none transition-all duration-200 hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
            render={<button type="button" />}
          >
            <Avatar size="default">
              <AvatarFallback className="bg-teal-600 text-xs font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {user?.name ?? "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              variant="destructive"
            >
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

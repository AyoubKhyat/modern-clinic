"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  FileText,
  CreditCard,
  Package,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  ClipboardList,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CalendarOff,
  Bell,
  Monitor,
  UserCog,
  CalendarDays,
  MessageSquare,
  Star,
  DoorOpen,
  ListTodo,
  ArrowRightLeft,
  ClipboardCheck,
  StickyNote,
  Building2,
  LayoutGrid,
  FileSignature,
  Repeat,
  ShieldAlert,
  PieChart,
  BookOpen,
} from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import type { UserRole } from "@/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/app/(dashboard)/layout"
import { useI18n } from "@/lib/i18n"

interface NavItem {
  labelKey: string
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
  badge?: string
}

const navItems: NavItem[] = [
  { labelKey: "nav.dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "doctor", "receptionist", "accountant"] },
  { labelKey: "nav.patients", label: "Patients", href: "/patients", icon: Users, roles: ["admin", "receptionist"] },
  { labelKey: "nav.appointments", label: "Appointments", href: "/appointments", icon: Calendar, roles: ["admin", "receptionist"] },
  { labelKey: "nav.visits", label: "Visits", href: "/visits", icon: Stethoscope, roles: ["admin", "doctor"] },
  { labelKey: "nav.prescriptions", label: "Prescriptions", href: "/prescriptions", icon: FileText, roles: ["admin", "doctor"] },
  { labelKey: "nav.payments", label: "Payments", href: "/payments", icon: CreditCard, roles: ["admin", "accountant", "receptionist"] },
  { labelKey: "nav.inventory", label: "Inventory", href: "/inventory", icon: Package, roles: ["admin"] },
  { labelKey: "nav.payroll", label: "Payroll", href: "/payroll", icon: Wallet, roles: ["admin"] },
  { labelKey: "nav.analytics", label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["admin"] },
  { labelKey: "nav.reports", label: "Reports", href: "/reports", icon: Activity, roles: ["admin"] },
  { labelKey: "nav.staff_scheduling", label: "Staff Schedule", href: "/staff-scheduling", icon: CalendarClock, roles: ["admin"] },
  { labelKey: "nav.calendar", label: "Calendar", href: "/calendar", icon: CalendarDays, roles: ["admin", "doctor", "receptionist"] },
  { labelKey: "nav.expenses", label: "Expenses", href: "/expenses", icon: Receipt, roles: ["admin", "accountant"] },
  { labelKey: "nav.leaves", label: "Leave Mgmt", href: "/leaves", icon: CalendarOff, roles: ["admin"] },
  { labelKey: "nav.surveys", label: "Surveys", href: "/surveys", icon: Star, roles: ["admin"] },
  { labelKey: "nav.chat", label: "Chat", href: "/chat", icon: MessageSquare, roles: ["admin", "doctor", "receptionist", "accountant"] },
  { labelKey: "nav.users", label: "Staff", href: "/users", icon: UserCog, roles: ["admin"] },
  { labelKey: "nav.bulk_notify", label: "Notifications", href: "/bulk-notify", icon: Bell, roles: ["admin"] },
  { labelKey: "nav.waiting_room", label: "Waiting Room", href: "/waiting-room", icon: Monitor, roles: ["admin", "receptionist"] },
  { labelKey: "nav.guide", label: "Guide", href: "/guide", icon: BookOpen, roles: ["admin", "receptionist"] },
  { labelKey: "nav.rooms", label: "Rooms", href: "/rooms", icon: DoorOpen, roles: ["admin", "receptionist"] },
  { labelKey: "nav.tasks", label: "Task Board", href: "/tasks", icon: ListTodo, roles: ["admin", "doctor", "receptionist"] },
  { labelKey: "nav.referral_tracking", label: "Referrals", href: "/referral-tracking", icon: ArrowRightLeft, roles: ["admin", "doctor"] },
  { labelKey: "nav.staff_reviews", label: "Reviews", href: "/staff-reviews", icon: ClipboardCheck, roles: ["admin"] },
  { labelKey: "nav.clinics", label: "Branches", href: "/clinics", icon: Building2, roles: ["admin"] },
  { labelKey: "nav.recurring_appointments", label: "Recurring", href: "/recurring-appointments", icon: Repeat, roles: ["admin", "receptionist"] },
  { labelKey: "nav.budgeting", label: "Budgeting", href: "/budgeting", icon: PieChart, roles: ["admin", "accountant"] },
  { labelKey: "nav.consent_forms", label: "Consents", href: "/consent-forms", icon: FileSignature, roles: ["admin", "doctor"] },
  { labelKey: "nav.audit_log", label: "Audit Log", href: "/audit-log", icon: ClipboardList, roles: ["admin"] },
  { labelKey: "nav.settings", label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
]

function SidebarContent({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { t } = useI18n()
  const userRole = user?.role ?? "receptionist"

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  const clinicName = user?.employee?.clinic?.name ?? "Modern Clinic"
  const { toggle } = useSidebar()

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white dark:bg-slate-950">
      {/* Header / Logo */}
      <div className="relative flex h-16 items-center gap-3 px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 logo-glow">
          <Activity className="size-5 text-teal-400" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex min-w-0 flex-col overflow-hidden"
            >
              <span className="truncate text-sm font-semibold leading-tight">
                {clinicName}
              </span>
              <span className="text-[11px] text-slate-400">Clinic OS</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggle}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white",
            collapsed ? "right-1.5" : "right-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <TooltipProvider delay={100}>
          <nav className="flex flex-col gap-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              const Icon = item.icon

              const linkContent = (
                <motion.div
                  key={item.href}
                  whileHover={collapsed ? { scale: 1.08 } : { x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                      collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                      isActive
                        ? "bg-gradient-to-r from-teal-500/15 to-blue-500/10 text-white"
                        : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        isActive
                          ? "text-teal-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="h-[18px] bg-slate-700/80 px-1.5 text-[10px] text-slate-300"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 h-8 w-[3px] rounded-r-full bg-teal-400 shadow-[2px_0_8px_oklch(0.75_0.15_180/40%)]"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                </motion.div>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={<div />}>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12}>
                      {t(item.labelKey)}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={item.href}>{linkContent}</div>
            })}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      <Separator className="bg-white/[0.06]" />

      {/* User card */}
      <div className="p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl bg-white/[0.04] p-3",
            collapsed && "justify-center p-2"
          )}
        >
          <div className="relative shrink-0">
            <Avatar size="default">
              <AvatarFallback className="bg-teal-600 text-sm font-semibold text-white ring-2 ring-teal-500/30">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </div>
          {!collapsed && (
            <>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium leading-tight">
                  {user?.name ?? "User"}
                </span>
                <Badge
                  variant="secondary"
                  className="mt-0.5 w-fit border border-teal-500/20 bg-teal-500/20 px-1.5 text-[10px] capitalize text-teal-300"
                >
                  {userRole}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-slate-400 hover:bg-white/10 hover:text-white"
                onClick={() => logout()}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { collapsed } = useSidebar()
  const width = collapsed ? 72 : 260

  return (
    <aside
      data-slot="sidebar"
      className="hidden shrink-0 lg:block transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width }}
    >
      <div
        className="fixed inset-y-0 left-0 z-30 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width }}
      >
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  )
}

export function MobileSidebar() {
  return <SidebarContent collapsed={false} />
}

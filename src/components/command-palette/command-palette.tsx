"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/components/layout/theme-provider"
import { patientsApi } from "@/lib/api"
import type { Patient } from "@/types"
import {
  Search,
  Users,
  CalendarDays,
  Stethoscope,
  Pill,
  CreditCard,
  LayoutDashboard,
  UserPlus,
  CalendarPlus,
  Sun,
  Moon,
  User,
  Loader2,
  type LucideIcon,
} from "lucide-react"

interface Command {
  id: string
  label: string
  icon: LucideIcon
  group: string
  action: () => void
  keywords?: string
  subtitle?: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [searchingPatients, setSearchingPatients] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const close = useCallback(() => {
    onOpenChange(false)
    setQuery("")
    setActiveIndex(0)
    setPatientResults([])
  }, [onOpenChange])

  const commands = useMemo<Command[]>(
    () => [
      { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, group: "Navigation", action: () => { router.push("/dashboard"); close() }, keywords: "home overview" },
      { id: "nav-patients", label: "Go to Patients", icon: Users, group: "Navigation", action: () => { router.push("/patients"); close() }, keywords: "patient list" },
      { id: "nav-appointments", label: "Go to Appointments", icon: CalendarDays, group: "Navigation", action: () => { router.push("/appointments"); close() }, keywords: "schedule calendar" },
      { id: "nav-visits", label: "Go to Visits", icon: Stethoscope, group: "Navigation", action: () => { router.push("/visits"); close() }, keywords: "consultation" },
      { id: "nav-prescriptions", label: "Go to Prescriptions", icon: Pill, group: "Navigation", action: () => { router.push("/prescriptions"); close() }, keywords: "medication rx" },
      { id: "nav-payments", label: "Go to Payments", icon: CreditCard, group: "Navigation", action: () => { router.push("/payments"); close() }, keywords: "billing invoice" },
      { id: "action-new-patient", label: "Add New Patient", icon: UserPlus, group: "Quick Actions", action: () => { router.push("/patients?action=new"); close() }, keywords: "create register" },
      { id: "action-new-appointment", label: "New Appointment", icon: CalendarPlus, group: "Quick Actions", action: () => { router.push("/appointments?action=new"); close() }, keywords: "book schedule create" },
      { id: "action-toggle-theme", label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode", icon: theme === "dark" ? Sun : Moon, group: "Settings", action: () => { setTheme(theme === "dark" ? "light" : "dark"); close() }, keywords: "theme appearance" },
    ],
    [router, theme, setTheme, close]
  )

  const patientCommands: Command[] = useMemo(() =>
    patientResults.map((p) => ({
      id: `patient-${p.id}`,
      label: `${p.first_name} ${p.last_name}`,
      subtitle: [p.phone, p.blood_type].filter(Boolean).join(" · "),
      icon: User,
      group: "Patients",
      action: () => { router.push(`/patients/${p.id}`); close() },
    })),
    [patientResults, router, close]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q) ||
        cmd.keywords?.toLowerCase().includes(q)
    )
  }, [commands, query])

  const allItems = useMemo(() => [...patientCommands, ...filtered], [patientCommands, filtered])

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const cmd of allItems) {
      const group = map.get(cmd.group) ?? []
      group.push(cmd)
      map.set(cmd.group, group)
    }
    return map
  }, [allItems])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, patientResults])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    const active = listRef.current?.querySelector("[data-active='true']")
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setPatientResults([])
      return
    }
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setSearchingPatients(true)
      try {
        const { data } = await patientsApi.search(query.trim())
        setPatientResults(data)
      } catch {
        setPatientResults([])
      }
      setSearchingPatients(false)
    }, 250)
    return () => clearTimeout(searchTimerRef.current)
  }, [query])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % allItems.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + allItems.length) % allItems.length)
      } else if (e.key === "Enter" && allItems[activeIndex]) {
        e.preventDefault()
        allItems[activeIndex].action()
      } else if (e.key === "Escape") {
        e.preventDefault()
        close()
      }
    },
    [allItems, activeIndex, close]
  )

  if (typeof window === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[10vh] sm:px-0 sm:pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-xl"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-popover/80 shadow-2xl ring-1 ring-foreground/10 backdrop-blur-2xl dark:bg-popover/90"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-border/40 px-4">
              {searchingPatients ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-teal-500" />
              ) : (
                <Search className="size-4 shrink-0 text-muted-foreground/60" />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="Search patients, commands..."
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="hidden select-none rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/50 sm:inline-block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[360px] overflow-y-auto overscroll-contain p-2">
              {allItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Search className="size-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground/60">No results found</p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([group, cmds]) => {
                  const groupStartIndex = allItems.indexOf(cmds[0])
                  return (
                    <div key={group} className="mb-1">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground/50">{group}</div>
                      {cmds.map((cmd, i) => {
                        const flatIndex = groupStartIndex + i
                        const isActive = flatIndex === activeIndex
                        return (
                          <button
                            key={cmd.id}
                            data-active={isActive}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                              isActive ? "bg-teal-500/10 text-teal-700 dark:text-teal-300" : "text-foreground/80 hover:bg-muted/50"
                            }`}
                            onClick={cmd.action}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                          >
                            <cmd.icon className={`size-4 shrink-0 ${isActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/60"}`} />
                            <div className="flex-1 min-w-0">
                              <span className="block truncate">{cmd.label}</span>
                              {cmd.subtitle && (
                                <span className="block truncate text-[11px] text-muted-foreground/50">{cmd.subtitle}</span>
                              )}
                            </div>
                            {isActive && <kbd className="text-[10px] text-muted-foreground/40">↵</kbd>}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            <div className="hidden items-center gap-4 border-t border-border/40 px-4 py-2 sm:flex">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <kbd className="rounded border border-border/40 px-1 py-0.5 font-mono">↑↓</kbd>
                <span>navigate</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <kbd className="rounded border border-border/40 px-1 py-0.5 font-mono">↵</kbd>
                <span>select</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <kbd className="rounded border border-border/40 px-1 py-0.5 font-mono">esc</kbd>
                <span>close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

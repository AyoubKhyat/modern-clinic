"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Tv,
  Monitor,
  Plus,
  Trash2,
  Edit,
  Clock,
  Users,
  Megaphone,
  AlertTriangle,
  Info,
  Bell,
} from "lucide-react"
import { format } from "date-fns"
import { tvDashboardApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogOverlay,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueuePatient {
  id: number
  queue_number: number
  patient_name: string
  doctor_name: string
  status: string
}

interface NowServing {
  id: number
  queue_number: number
  patient_name: string
  doctor_name: string
}

interface Announcement {
  id: number
  title: string
  message: string
  type: "info" | "warning" | "urgent"
  active: boolean
  priority: number
}

interface TvDashboardData {
  clinic_name: string
  now_serving: NowServing[]
  queue: QueuePatient[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANNOUNCEMENT_TYPE_CONFIG = {
  info: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    tvColor: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    icon: Info,
    label: "Info",
    dot: "bg-blue-500",
    glow: "shadow-blue-500/20",
  },
  warning: {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    tvColor: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    icon: AlertTriangle,
    label: "Warning",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  urgent: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    tvColor: "from-red-500/20 to-red-600/10 border-red-500/30",
    icon: Bell,
    label: "Urgent",
    dot: "bg-red-500",
    glow: "shadow-red-500/20",
  },
}

const announcementVariants = {
  enter: {
    opacity: 0,
    y: 40,
    scale: 0.95,
  },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -40,
    scale: 0.95,
    transition: {
      duration: 0.3,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
    },
  }),
}

const pulseRing = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.4, 1],
    opacity: [0.6, 0, 0.6],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TvDashboardPage() {
  const { t } = useI18n()
  const { toast } = useToast()

  // State
  const [mode, setMode] = useState<"admin" | "tv">("admin")
  const [data, setData] = useState<TvDashboardData>({
    clinic_name: "Modern Clinic",
    now_serving: [],
    queue: [],
  })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [formType, setFormType] = useState<"info" | "warning" | "urgent">("info")
  const [formActive, setFormActive] = useState(true)
  const [formPriority, setFormPriority] = useState("0")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fullscreen
  const containerRef = useRef<HTMLDivElement>(null)

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const res = await tvDashboardApi.getData()
      setData(res.data ?? { clinic_name: "Modern Clinic", now_serving: [], queue: [] })
    } catch {
      // Silently handle - show stale data
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await tvDashboardApi.getAnnouncements()
      setAnnouncements(res.data ?? [])
    } catch {
      // Silently handle
    }
  }, [])

  // Clock tick every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
    fetchAnnouncements()
  }, [fetchData, fetchAnnouncements])

  // Auto-refresh every 30 seconds in TV mode
  useEffect(() => {
    if (mode !== "tv") return
    const interval = setInterval(() => {
      fetchData()
      fetchAnnouncements()
    }, 30000)
    return () => clearInterval(interval)
  }, [mode, fetchData, fetchAnnouncements])

  // Announcement carousel rotation (every 6 seconds)
  const activeAnnouncements = announcements.filter((a) => a.active)
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return
    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => (prev + 1) % activeAnnouncements.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [activeAnnouncements.length])

  // Reset index if it goes out of bounds
  useEffect(() => {
    if (currentAnnouncementIndex >= activeAnnouncements.length) {
      setCurrentAnnouncementIndex(0)
    }
  }, [activeAnnouncements.length, currentAnnouncementIndex])

  // -------------------------------------------------------------------------
  // Announcement CRUD
  // -------------------------------------------------------------------------

  function openCreateDialog() {
    setEditingAnnouncement(null)
    setFormTitle("")
    setFormMessage("")
    setFormType("info")
    setFormActive(true)
    setFormPriority("0")
    setDialogOpen(true)
  }

  function openEditDialog(announcement: Announcement) {
    setEditingAnnouncement(announcement)
    setFormTitle(announcement.title)
    setFormMessage(announcement.message)
    setFormType(announcement.type)
    setFormActive(announcement.active)
    setFormPriority(String(announcement.priority))
    setDialogOpen(true)
  }

  function openDeleteDialog(announcement: Announcement) {
    setDeletingAnnouncement(announcement)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast("Title and message are required", "error")
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        active: formActive,
        priority: parseInt(formPriority) || 0,
      }
      if (editingAnnouncement) {
        await tvDashboardApi.updateAnnouncement(editingAnnouncement.id, payload)
        toast("Announcement updated")
      } else {
        await tvDashboardApi.createAnnouncement(payload)
        toast("Announcement created")
      }
      setDialogOpen(false)
      fetchAnnouncements()
    } catch {
      toast("Failed to save announcement", "error")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deletingAnnouncement) return
    setDeleting(true)
    try {
      await tvDashboardApi.deleteAnnouncement(deletingAnnouncement.id)
      toast("Announcement deleted")
      setDeleteDialogOpen(false)
      setDeletingAnnouncement(null)
      fetchAnnouncements()
    } catch {
      toast("Failed to delete announcement", "error")
    } finally {
      setDeleting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Fullscreen
  // -------------------------------------------------------------------------

  function enterTvMode() {
    setMode("tv")
    containerRef.current?.requestFullscreen?.().catch(() => {})
  }

  function exitTvMode() {
    setMode("admin")
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  useEffect(() => {
    function handleFsChange() {
      if (!document.fullscreenElement && mode === "tv") {
        setMode("admin")
      }
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [mode])

  // =========================================================================
  // TV MODE RENDER
  // =========================================================================

  if (mode === "tv") {
    const currentAnnouncement = activeAnnouncements[currentAnnouncementIndex]

    return (
      <div
        ref={containerRef}
        className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white"
      >
        {/* Subtle animated background patterns */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/[0.04] blur-3xl" />
          <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-blue-500/[0.04] blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/[0.03] blur-3xl" />
        </div>

        {/* Exit TV mode button */}
        <button
          onClick={exitTvMode}
          className="absolute right-6 top-6 z-20 rounded-xl bg-white/10 p-3 backdrop-blur-sm transition-colors hover:bg-white/20"
          title="Exit TV Mode"
        >
          <Monitor className="size-6" />
        </button>

        {/* Header */}
        <div className="relative z-10 flex flex-col items-center gap-3 pb-6 pt-10">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-6xl font-bold tracking-tight text-transparent"
          >
            {data.clinic_name}
          </motion.h1>
          <div className="flex items-center gap-4 text-4xl font-light text-gray-200">
            <Clock className="size-8 text-teal-400/80" />
            <span className="tabular-nums tracking-wide">
              {format(currentTime, "h:mm:ss a")}
            </span>
          </div>
          <p className="text-lg tracking-wide text-gray-500">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-8 pb-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Now Serving - Left Column */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="relative">
                    <div className="rounded-xl bg-teal-500/20 p-2.5">
                      <Users className="size-7 text-teal-400" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-teal-500/20"
                      variants={pulseRing}
                      initial="initial"
                      animate="animate"
                    />
                  </div>
                  <h2 className="text-4xl font-bold text-teal-400">Now Serving</h2>
                </div>

                {data.now_serving.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-10 text-center backdrop-blur-sm">
                    <Users className="mx-auto mb-3 size-12 text-gray-700" />
                    <p className="text-2xl text-gray-600">No patient currently being served</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {data.now_serving.map((patient, i) => (
                        <motion.div
                          key={patient.id}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/5 p-6 shadow-lg shadow-teal-500/5 backdrop-blur-sm"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/20 text-3xl font-black text-teal-400">
                              {patient.queue_number}
                            </span>
                            <div className="relative">
                              <span className="absolute -left-1 -top-1 size-3 animate-ping rounded-full bg-teal-400" />
                              <span className="absolute -left-1 -top-1 size-3 rounded-full bg-teal-400" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-white">
                            {patient.patient_name}
                          </p>
                          <p className="mt-1 text-xl text-teal-300/80">
                            {patient.doctor_name}
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Waiting Queue - Right Column */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/20 p-2.5">
                    <Clock className="size-7 text-blue-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-blue-400">Waiting Queue</h2>
                  {data.queue.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-500/20 px-4 py-1 text-xl font-bold text-blue-400">
                      {data.queue.length}
                    </span>
                  )}
                </div>

                {data.queue.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-10 text-center backdrop-blur-sm">
                    <Clock className="mx-auto mb-3 size-12 text-gray-700" />
                    <p className="text-2xl text-gray-600">No patients waiting</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                    {/* Table header */}
                    <div className="grid grid-cols-[80px_1fr_1fr] gap-4 border-b border-white/5 bg-white/[0.03] px-6 py-4">
                      <span className="text-lg font-semibold text-gray-500">#</span>
                      <span className="text-lg font-semibold text-gray-500">Patient</span>
                      <span className="text-lg font-semibold text-gray-500">Doctor</span>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {data.queue.map((patient, index) => (
                        <motion.div
                          key={patient.id}
                          custom={index}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, x: 20 }}
                          className="grid grid-cols-[80px_1fr_1fr] items-center gap-4 border-b border-white/[0.03] px-6 py-5 transition-colors last:border-0 hover:bg-white/[0.02]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-2xl font-bold text-blue-400">
                            {patient.queue_number}
                          </span>
                          <span className="text-2xl font-semibold text-white">
                            {patient.patient_name}
                          </span>
                          <span className="text-xl text-gray-400">
                            {patient.doctor_name}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Announcement ticker */}
        {activeAnnouncements.length > 0 && currentAnnouncement && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-gray-950/90 px-8 py-5 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-6">
              <div className="flex items-center gap-3">
                <Megaphone className="size-7 text-teal-400" />
                {activeAnnouncements.length > 1 && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-gray-400">
                    {currentAnnouncementIndex + 1}/{activeAnnouncements.length}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAnnouncement.id + "-" + currentAnnouncementIndex}
                    variants={announcementVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex items-center gap-4"
                  >
                    {(() => {
                      const config = ANNOUNCEMENT_TYPE_CONFIG[currentAnnouncement.type]
                      const Icon = config.icon
                      return (
                        <>
                          <div className={`rounded-lg p-2 ${currentAnnouncement.type === "info" ? "bg-blue-500/20" : currentAnnouncement.type === "warning" ? "bg-amber-500/20" : "bg-red-500/20"}`}>
                            <Icon className={`size-5 ${currentAnnouncement.type === "info" ? "text-blue-400" : currentAnnouncement.type === "warning" ? "text-amber-400" : "text-red-400"}`} />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">
                              {currentAnnouncement.title}
                            </p>
                            <p className="text-lg text-gray-400">
                              {currentAnnouncement.message}
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              {activeAnnouncements.length > 1 && (
                <div className="flex gap-2">
                  {activeAnnouncements.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-500 ${
                        i === currentAnnouncementIndex
                          ? "w-6 bg-teal-400"
                          : "w-2 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Auto-refresh indicator */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-gray-600 backdrop-blur-sm">
            <span className="size-2 animate-pulse rounded-full bg-green-500" />
            Auto-refreshing every 30s
          </span>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ADMIN MODE RENDER
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">TV Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your waiting room TV display and announcements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={enterTvMode}>
            <Tv className="mr-2 size-4" />
            Launch TV Mode
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Announcements Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="size-5 text-teal-600 dark:text-teal-400" />
                Announcements
              </CardTitle>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="mr-1.5 size-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
                  <Megaphone className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No announcements yet. Add one to display on the TV screen.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {announcements
                      .sort((a, b) => b.priority - a.priority)
                      .map((announcement) => {
                        const config = ANNOUNCEMENT_TYPE_CONFIG[announcement.type]
                        const Icon = config.icon
                        return (
                          <motion.div
                            key={announcement.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`group relative rounded-xl border p-4 transition-colors ${
                              announcement.active
                                ? "border-foreground/[0.06] bg-background"
                                : "border-foreground/[0.04] bg-muted/30 opacity-60"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 rounded-lg p-1.5 ${announcement.type === "info" ? "bg-blue-500/10" : announcement.type === "warning" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                                <Icon className={`size-4 ${announcement.type === "info" ? "text-blue-600 dark:text-blue-400" : announcement.type === "warning" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{announcement.title}</h3>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${config.color}`}
                                  >
                                    {config.label}
                                  </Badge>
                                  {!announcement.active && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                  {announcement.message}
                                </p>
                                <p className="mt-1.5 text-xs text-muted-foreground/60">
                                  Priority: {announcement.priority}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEditDialog(announcement)}
                                >
                                  <Edit className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openDeleteDialog(announcement)}
                                >
                                  <Trash2 className="size-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* TV Preview */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="size-5 text-blue-600 dark:text-blue-400" />
                TV Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mini preview of TV display */}
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 p-4 text-white">
                {/* Mini header */}
                <div className="mb-3 text-center">
                  <p className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent">
                    {data.clinic_name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {format(currentTime, "h:mm a")}
                  </p>
                </div>

                {/* Mini Now Serving */}
                <div className="mb-3">
                  <p className="mb-1.5 text-[10px] font-semibold text-teal-400">NOW SERVING</p>
                  {data.now_serving.length === 0 ? (
                    <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-600">No patients</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {data.now_serving.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-1.5"
                        >
                          <p className="text-xs font-semibold">#{p.queue_number} {p.patient_name}</p>
                          <p className="text-[10px] text-teal-400/70">{p.doctor_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mini Queue */}
                <div className="mb-3">
                  <p className="mb-1.5 text-[10px] font-semibold text-blue-400">
                    WAITING ({data.queue.length})
                  </p>
                  {data.queue.length === 0 ? (
                    <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-600">Empty queue</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {data.queue.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5"
                        >
                          <span className="text-xs font-bold text-blue-400">
                            #{p.queue_number}
                          </span>
                          <span className="text-[10px] text-gray-300">
                            {p.patient_name}
                          </span>
                        </div>
                      ))}
                      {data.queue.length > 3 && (
                        <p className="text-center text-[10px] text-gray-600">
                          +{data.queue.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Mini announcement */}
                {activeAnnouncements.length > 0 && (
                  <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                    <p className="text-[10px] font-semibold text-teal-400">
                      {activeAnnouncements[0]?.title}
                    </p>
                    <p className="text-[10px] text-gray-500 line-clamp-1">
                      {activeAnnouncements[0]?.message}
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={enterTvMode}
              >
                <Tv className="mr-2 size-4" />
                Open TV Mode
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-teal-500/5 p-4 text-center dark:bg-teal-500/10">
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {data.now_serving.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Now Serving</p>
                </div>
                <div className="rounded-xl bg-blue-500/5 p-4 text-center dark:bg-blue-500/10">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {data.queue.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">In Queue</p>
                </div>
                <div className="rounded-xl bg-purple-500/5 p-4 text-center dark:bg-purple-500/10">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {activeAnnouncements.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Active Notices</p>
                </div>
                <div className="rounded-xl bg-amber-500/5 p-4 text-center dark:bg-amber-500/10">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {announcements.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Total Notices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Announcement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
          </DialogTitle>
          <div className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Clinic Hours Update"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Enter announcement message..."
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formType}
                onValueChange={(v) => v && setFormType(v as "info" | "warning" | "urgent")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="size-3.5 text-blue-500" />
                      Info
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      Warning
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <Bell className="size-3.5 text-red-500" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <input
                type="number"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                min="0"
                max="100"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">Higher values appear first</p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-input px-4 py-3">
              <div>
                <label className="text-sm font-medium">Active</label>
                <p className="text-xs text-muted-foreground">Show on TV display</p>
              </div>
              <Switch
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : editingAnnouncement
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete Announcement</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {deletingAnnouncement?.title}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
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
    </div>
  )
}

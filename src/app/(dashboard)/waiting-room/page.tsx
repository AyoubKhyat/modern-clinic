"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import { Maximize2, Minimize2, Clock, UserCheck, Users } from "lucide-react"
import { waitingRoomApi } from "@/lib/api"

interface WaitingPatient {
  id: number
  patient_name: string
  first_name: string
  last_name: string
  doctor_name: string
  scheduled_at: string
  status: string
}

interface WaitingRoomData {
  queue: WaitingPatient[]
  in_progress: WaitingPatient[]
}

function formatPrivacyName(first_name: string, last_name: string): string {
  const first = first_name || ""
  const last = last_name || ""
  if (last) return `${first} ${last.charAt(0)}.`
  return first
}

function getStatusBadge(status: string) {
  switch (status) {
    case "arrived":
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/20 px-4 py-1.5 text-lg font-semibold text-green-400">
          Arrived
        </span>
      )
    case "confirmed":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/20 px-4 py-1.5 text-lg font-semibold text-blue-400">
          Confirmed
        </span>
      )
    case "scheduled":
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-500/20 px-4 py-1.5 text-lg font-semibold text-gray-400">
          Scheduled
        </span>
      )
  }
}

export default function WaitingRoomPage() {
  const [data, setData] = useState<WaitingRoomData>({ queue: [], in_progress: [] })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await waitingRoomApi.get()
      setData(res.data ?? { queue: [], in_progress: [] })
    } catch {
      // Silently handle errors - display will show stale data
    }
  }, [])

  // Clock: update every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Data: fetch immediately and every 15 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white"
    >
      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-6 right-6 z-10 rounded-xl bg-white/10 p-3 backdrop-blur-sm transition-colors hover:bg-white/20"
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="size-6" />
        ) : (
          <Maximize2 className="size-6" />
        )}
      </button>

      {/* Header */}
      <div className="flex flex-col items-center gap-2 pb-4 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent"
        >
          Modern Clinic
        </motion.h1>
        <div className="flex items-center gap-3 text-3xl font-light text-gray-300">
          <Clock className="size-7" />
          <span className="tabular-nums">
            {format(currentTime, "h:mm:ss a")}
          </span>
        </div>
        <p className="text-lg text-gray-500">
          {format(currentTime, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-8">
        {/* Now Serving */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-3">
            <UserCheck className="size-8 text-teal-400" />
            <h2 className="text-4xl font-bold text-teal-400">Now Serving</h2>
          </div>

          {data.in_progress.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center">
              <p className="text-2xl text-gray-500">No patients currently being seen</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {data.in_progress.map((patient) => (
                  <motion.div
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-blue-500/10 p-6"
                  >
                    <p className="text-3xl font-bold text-white">
                      {formatPrivacyName(patient.first_name, patient.last_name)}
                    </p>
                    <p className="mt-2 text-xl text-teal-300">
                      {patient.doctor_name}
                    </p>
                    <span className="mt-3 inline-flex items-center rounded-full bg-teal-500/20 px-4 py-1.5 text-lg font-semibold text-teal-400">
                      In Progress
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Waiting Queue */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <Users className="size-8 text-blue-400" />
            <h2 className="text-4xl font-bold text-blue-400">Waiting Queue</h2>
            {data.queue.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-500/20 px-4 py-1 text-xl font-bold text-blue-400">
                {data.queue.length}
              </span>
            )}
          </div>

          {data.queue.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center">
              <p className="text-2xl text-gray-500">No patients waiting</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
              {/* Table header */}
              <div className="grid grid-cols-[80px_1fr_1fr_180px_160px] gap-4 border-b border-white/5 bg-white/[0.03] px-6 py-4">
                <span className="text-lg font-semibold text-gray-400">#</span>
                <span className="text-lg font-semibold text-gray-400">Patient</span>
                <span className="text-lg font-semibold text-gray-400">Doctor</span>
                <span className="text-lg font-semibold text-gray-400">Scheduled</span>
                <span className="text-lg font-semibold text-gray-400">Status</span>
              </div>

              <AnimatePresence mode="popLayout">
                {data.queue.map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-[80px_1fr_1fr_180px_160px] items-center gap-4 border-b border-white/[0.03] px-6 py-5 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <span className="text-3xl font-bold text-gray-500">
                      {index + 1}
                    </span>
                    <span className="text-2xl font-semibold text-white">
                      {formatPrivacyName(patient.first_name, patient.last_name)}
                    </span>
                    <span className="text-xl text-gray-300">
                      {patient.doctor_name}
                    </span>
                    <span className="text-xl tabular-nums text-gray-400">
                      {format(parseISO(patient.scheduled_at), "h:mm a")}
                    </span>
                    <div>{getStatusBadge(patient.status)}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-gray-500 backdrop-blur-sm">
          <span className="size-2 animate-pulse rounded-full bg-green-500" />
          Auto-refreshing every 15 seconds
        </span>
      </div>
    </div>
  )
}

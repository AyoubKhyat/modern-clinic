"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "clinic_onboarding_seen"

const features = [
  { icon: Users, title: "Patients", description: "Manage patient records, medical history, and contact information", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Calendar, title: "Appointments", description: "Schedule and track appointments with real-time status updates", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: Stethoscope, title: "Visits", description: "Document consultations with vitals, diagnosis, and prescriptions", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: CreditCard, title: "Payments", description: "Track billing, payments, and generate financial reports", color: "text-amber-500", bg: "bg-amber-500/10" },
]

export function WelcomeModal() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!user) return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) setOpen(true)
  }, [user])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true")
    setOpen(false)
  }

  function handleGetStarted() {
    dismiss()
    router.push("/patients")
  }

  if (!open || !user) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={dismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        <motion.div
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-popover/95 shadow-2xl ring-1 ring-foreground/10 backdrop-blur-2xl dark:bg-popover/95"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
          >
            <X className="size-4" />
          </button>

          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-8 pb-8 pt-10"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div
                      className="absolute inset-[-4px] rounded-2xl bg-gradient-to-r from-teal-400 via-blue-500 to-indigo-500 opacity-60 blur-sm"
                      style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
                    />
                    <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg">
                      <Activity className="size-8 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Welcome, {user.name?.split(" ")[0]}!
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your clinic management system is ready. Here&apos;s a quick overview of what you can do.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {features.map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                      className="flex flex-col gap-2 rounded-xl border border-border/30 bg-muted/20 p-3"
                    >
                      <div className={`flex size-8 items-center justify-center rounded-lg ${f.bg}`}>
                        <f.icon className={`size-4 ${f.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.title}</p>
                        <p className="text-[11px] leading-snug text-muted-foreground/60">{f.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={dismiss}>
                    Skip
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-400 hover:to-blue-500"
                    onClick={() => setStep(1)}
                  >
                    Next
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tips"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="px-8 pb-8 pt-10"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-blue-500/15">
                    <Sparkles className="size-6 text-teal-500" />
                  </div>
                  <h2 className="text-lg font-bold">Quick Tips</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Get the most out of your clinic OS
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {[
                    { key: "Ctrl+K", desc: "Open command palette for quick navigation and search" },
                    { key: "AI Assistant", desc: "Use the sparkle button (bottom-right) for smart visit summaries" },
                    { key: "Dark Mode", desc: "Toggle dark mode from the header or settings page" },
                    { key: "Filters", desc: "Use filters and search on every list page to find data fast" },
                  ].map((tip, i) => (
                    <motion.div
                      key={tip.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.06 }}
                      className="flex items-start gap-3 rounded-lg border border-border/20 bg-muted/15 px-3 py-2.5"
                    >
                      <kbd className="mt-0.5 shrink-0 rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60">
                        {tip.key}
                      </kbd>
                      <p className="text-xs text-muted-foreground">{tip.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6">
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-400 hover:to-blue-500"
                    onClick={handleGetStarted}
                  >
                    Get Started
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center gap-1.5 pb-4">
            {[0, 1].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-teal-500" : "w-1.5 bg-muted-foreground/15"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  Loader2,
  Heart,
  Pill,
  Stethoscope,
  Shield,
  Syringe,
  Cross,
} from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const floatingIcons = [
  { Icon: Heart, top: "8%", left: "12%", duration: 8, delay: 0 },
  { Icon: Pill, top: "18%", right: "10%", duration: 10, delay: -2 },
  { Icon: Stethoscope, bottom: "22%", left: "8%", duration: 9, delay: -4 },
  { Icon: Shield, top: "55%", right: "15%", duration: 11, delay: -6 },
  { Icon: Syringe, bottom: "12%", right: "22%", duration: 7, delay: -3 },
  { Icon: Cross, top: "35%", left: "5%", duration: 12, delay: -8 },
]

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
      router.push("/dashboard")
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err?.request && !err?.response) {
        setError("Unable to connect to the server. Please check that the backend is running.")
      } else {
        setError("Invalid credentials. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Aurora gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      {/* Animated gradient orbs */}
      <div
        className="absolute left-[-10%] top-[-10%] size-[600px] rounded-full opacity-40 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, oklch(0.8 0.15 180 / 40%) 0%, transparent 70%)",
          animation: "aurora-shift 15s ease-in-out infinite",
          backgroundSize: "400% 400%",
        }}
      />
      <div
        className="absolute right-[-5%] top-[20%] size-[500px] rounded-full opacity-30 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, oklch(0.7 0.18 260 / 40%) 0%, transparent 70%)",
          animation: "aurora-shift 18s ease-in-out infinite",
          animationDelay: "-5s",
          backgroundSize: "400% 400%",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] size-[550px] rounded-full opacity-25 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, oklch(0.75 0.15 300 / 35%) 0%, transparent 70%)",
          animation: "aurora-shift 20s ease-in-out infinite",
          animationDelay: "-10s",
          backgroundSize: "400% 400%",
        }}
      />

      {/* Floating medical icons */}
      {floatingIcons.map(({ Icon, duration, delay, ...pos }, i) => (
        <div
          key={i}
          className="absolute text-foreground/[0.04] dark:text-white/[0.06]"
          style={{
            ...pos,
            animation: `float-particle ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
          }}
        >
          <Icon className="size-10" />
        </div>
      ))}

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card noise-overlay rounded-2xl overflow-hidden">
          <div className="relative z-10 px-8 pb-8 pt-10">
            {/* Logo */}
            <div className="flex flex-col items-center gap-4 pb-6">
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="absolute inset-[-4px] rounded-2xl bg-gradient-to-r from-teal-400 via-blue-500 to-indigo-500 blur-sm"
                  style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
                />
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg logo-glow">
                  <Activity className="size-8 text-white" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">
                  Modern AI Clinic OS
                </h1>
                <p className="mt-1.5 text-sm font-medium text-muted-foreground/80">
                  Sign in to your account
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 rounded-xl border-white/20 bg-white/50 transition-all duration-300 focus-visible:border-teal-400/50 focus-visible:bg-white/80 focus-visible:ring-teal-400/20 focus-visible:shadow-[0_0_20px_oklch(0.75_0.15_180/12%)] dark:border-white/10 dark:bg-white/5 dark:focus-visible:bg-white/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-white/20 bg-white/50 transition-all duration-300 focus-visible:border-teal-400/50 focus-visible:bg-white/80 focus-visible:ring-teal-400/20 focus-visible:shadow-[0_0_20px_oklch(0.75_0.15_180/12%)] dark:border-white/10 dark:bg-white/5 dark:focus-visible:bg-white/10"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-shimmer mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:from-teal-400 hover:to-blue-500 hover:shadow-[0_4px_24px_oklch(0.7_0.15_180/30%)]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-foreground/25 dark:text-white/20">
          Modern AI Clinic OS v2.0
        </p>
      </motion.div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export const chartColors: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#6366f1",
  arrived: "#22c55e",
  completed: "#10b981",
  no_show: "#ef4444",
  cancelled: "#6b7280",
  waiting: "#f59e0b",
  in_progress: "#3b82f6",
  pending: "#eab308",
  paid: "#22c55e",
  refunded: "#a855f7",
}

export function AnimatedCounter({
  value,
  isCurrency = false,
  isPercentage = false,
}: {
  value: number
  isCurrency?: boolean
  isPercentage?: boolean
}) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  if (isCurrency) return <>{display.toLocaleString("fr-MA")} MAD</>
  if (isPercentage) return <>{display}%</>
  return <>{display.toLocaleString("fr-MA")}</>
}

export function CustomTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {payload[0].value?.toLocaleString("fr-MA")} {valueSuffix}
      </p>
    </div>
  )
}

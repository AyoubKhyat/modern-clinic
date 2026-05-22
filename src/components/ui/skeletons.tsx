"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function TableSkeleton({
  columns = 5,
  rows = 6,
}: {
  columns?: number
  rows?: number
}) {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-24"]

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: Math.min(columns, 6) }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${widths[i] ?? "w-20"}`} />
          ))}
        </div>
      </div>
      <motion.div variants={container} initial="hidden" animate="show">
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div
            key={i}
            variants={item}
            className="flex items-center gap-4 border-b border-border/20 px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: Math.min(columns, 6) }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-3.5 ${widths[(j + i) % widths.length]}`}
              />
            ))}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export function CardGridSkeleton({
  count = 6,
  cols = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number
  cols?: string
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={`grid gap-4 ${cols}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={item}>
          <Card className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={item}>
          <Card className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="flex flex-col gap-2 py-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

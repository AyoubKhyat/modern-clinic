"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star,
  MessageSquare,
  Plus,
  Loader2,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Search,
  User,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { surveysApi, patientsApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import {
  CustomTooltip,
  containerVariants,
  itemVariants,
} from "@/lib/chart-utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Survey {
  id: number
  visit_id: number | null
  patient_id: number
  doctor_id: number | null
  rating: number
  feedback: string
  patient_name: string
  doctor_name: string
  created_at: string
}

interface SurveyAnalytics {
  total: number
  avg_rating: number
  distribution: { rating: number; count: number }[]
  by_doctor: { doctor_name: string; avg_rating: number; count: number }[]
  recent: Survey[]
}

interface PatientSearchResult {
  id: number
  name: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const RATING_COLORS: Record<number, string> = {
  5: "#10b981", // green
  4: "#14b8a6", // teal
  3: "#f59e0b", // amber
  2: "#f97316", // orange
  1: "#ef4444", // red
}

const RATING_BG: Record<number, string> = {
  5: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  4: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  3: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  2: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  1: "bg-red-500/10 text-red-700 dark:text-red-400",
}

const RATING_RING: Record<number, string> = {
  5: "ring-emerald-500/20",
  4: "ring-teal-500/20",
  3: "ring-amber-500/20",
  2: "ring-orange-500/20",
  1: "ring-red-500/20",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarDisplay({
  rating,
  size = "sm",
}: {
  rating: number
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5"
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  )
}

function getNpsLabel(avg: number): { label: string; color: string } {
  if (avg >= 4.5) return { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400" }
  if (avg >= 3.5) return { label: "Good", color: "text-teal-600 dark:text-teal-400" }
  if (avg >= 2.5) return { label: "Average", color: "text-amber-600 dark:text-amber-400" }
  if (avg >= 1.5) return { label: "Below Average", color: "text-orange-600 dark:text-orange-400" }
  return { label: "Poor", color: "text-red-600 dark:text-red-400" }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SurveysPage() {
  const { toast } = useToast()

  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  // ---------- Fetch ----------

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, surveysRes] = await Promise.all([
        surveysApi.analytics(),
        surveysApi.list(),
      ])
      setAnalytics(analyticsRes.data)
      setSurveys(
        Array.isArray(surveysRes.data)
          ? surveysRes.data
          : surveysRes.data?.data ?? []
      )
    } catch {
      // empty state shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleFormSuccess() {
    toast("Survey recorded successfully")
    setFormOpen(false)
    fetchData()
  }

  // ---------- Derived ----------

  const avgRating = analytics?.avg_rating ?? 0
  const nps = getNpsLabel(avgRating)

  // Ensure distribution covers 1-5
  const distribution = [1, 2, 3, 4, 5].map((r) => {
    const found = analytics?.distribution?.find((d) => d.rating === r)
    return { rating: `${r} Star${r > 1 ? "s" : ""}`, count: found?.count ?? 0, ratingNum: r }
  })

  const byDoctor = (analytics?.by_doctor ?? [])
    .slice()
    .sort((a, b) => b.avg_rating - a.avg_rating)

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patient Surveys"
        description="Track patient satisfaction and feedback"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Record Survey
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : analytics && analytics.total > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* ── Summary Cards ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <Users className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Surveys</p>
                <p className="text-2xl font-bold tabular-nums">
                  {analytics.total.toLocaleString()}
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
                <Star className="size-5 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold tabular-nums">
                    {avgRating.toFixed(1)}
                  </p>
                  <StarDisplay rating={Math.round(avgRating)} size="sm" />
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10">
                <TrendingUp className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Satisfaction Level
                </p>
                <p className={`text-2xl font-bold ${nps.color}`}>
                  {nps.label}
                </p>
              </div>
            </motion.div>
          </div>

          {/* ── Charts ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Rating Distribution */}
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="size-4 text-muted-foreground" />
                    Rating Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distribution}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="rating"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                          allowDecimals={false}
                        />
                        <ReTooltip
                          content={<CustomTooltip valueSuffix="surveys" />}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {distribution.map((entry) => (
                            <Cell
                              key={entry.ratingNum}
                              fill={RATING_COLORS[entry.ratingNum] ?? "#0d9488"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Per-Doctor Ratings */}
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4 text-muted-foreground" />
                    Doctor Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {byDoctor.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={byDoctor}
                          layout="vertical"
                          margin={{ left: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            type="number"
                            domain={[0, 5]}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            className="text-muted-foreground"
                          />
                          <YAxis
                            type="category"
                            dataKey="doctor_name"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            width={100}
                            className="text-muted-foreground"
                          />
                          <ReTooltip
                            content={
                              <DoctorTooltip />
                            }
                          />
                          <Bar
                            dataKey="avg_rating"
                            fill="#0d9488"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      No doctor ratings available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Recent Surveys ── */}
          <motion.div variants={itemVariants}>
            <h2 className="mb-4 text-lg font-semibold">Recent Surveys</h2>
            <SurveyList surveys={analytics.recent ?? surveys} />
          </motion.div>
        </motion.div>
      ) : (
        <EmptyState onCreate={() => setFormOpen(true)} />
      )}

      {/* Record Survey Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Survey</DialogTitle>
            <DialogDescription>
              Capture patient feedback and satisfaction rating.
            </DialogDescription>
          </DialogHeader>
          <SurveyForm
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DoctorTooltip
// ---------------------------------------------------------------------------

function DoctorTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-sm">
      <p className="font-medium">{data.doctor_name}</p>
      <p className="text-muted-foreground">
        Avg: {Number(data.avg_rating).toFixed(1)} / 5
      </p>
      <p className="text-muted-foreground">{data.count} surveys</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SurveyList
// ---------------------------------------------------------------------------

function SurveyList({ surveys }: { surveys: Survey[] }) {
  if (!surveys.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No recent surveys
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {surveys.map((survey, i) => {
          const ratingBg = RATING_BG[survey.rating] ?? RATING_BG[3]
          const ratingRing = RATING_RING[survey.rating] ?? RATING_RING[3]

          return (
            <motion.div
              key={survey.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className={`flex flex-col gap-3 rounded-xl px-4 py-4 ${GLASS} ring-1 ${ratingRing}`}
            >
              {/* Header: patient + rating */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {survey.patient_name}
                  </p>
                  {survey.doctor_name && (
                    <p className="truncate text-xs text-muted-foreground">
                      Dr. {survey.doctor_name}
                    </p>
                  )}
                </div>
                <div
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${ratingBg}`}
                >
                  {survey.rating}/5
                </div>
              </div>

              {/* Stars */}
              <StarDisplay rating={survey.rating} size="sm" />

              {/* Feedback */}
              {survey.feedback && (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{survey.feedback}&rdquo;
                </p>
              )}

              {/* Date */}
              <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                {new Date(survey.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SurveyForm
// ---------------------------------------------------------------------------

function SurveyForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Patient search
  const [patientQuery, setPatientQuery] = useState("")
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fields
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [feedback, setFeedback] = useState("")

  // Patient search effect
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (patientQuery.length < 2) {
      setPatientResults([])
      setShowDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await patientsApi.search(patientQuery)
        const results = Array.isArray(res.data) ? res.data : res.data?.data ?? []
        setPatientResults(results)
        setShowDropdown(results.length > 0)
      } catch {
        setPatientResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [patientQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function selectPatient(patient: PatientSearchResult) {
    setSelectedPatient(patient)
    setPatientQuery(patient.name)
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!selectedPatient) {
      setError("Please select a patient.")
      return
    }
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5.")
      return
    }

    setSaving(true)
    try {
      await surveysApi.create({
        patient_id: selectedPatient.id,
        rating,
        feedback: feedback || undefined,
      })
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : "Something went wrong. Please try again.")
      setError(msg || "Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Patient Search */}
      <div className="flex flex-col gap-1.5">
        <Label>Patient *</Label>
        <div className="relative" ref={dropdownRef}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients by name..."
            value={patientQuery}
            onChange={(e) => {
              setPatientQuery(e.target.value)
              setSelectedPatient(null)
            }}
            className="h-9 pl-9"
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg bg-popover shadow-lg ring-1 ring-foreground/10">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPatient(p)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <User className="size-3.5 shrink-0 text-muted-foreground" />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedPatient && (
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedPatient.name}</span>
          </p>
        )}
      </div>

      {/* Star Rating */}
      <div className="flex flex-col gap-1.5">
        <Label>Rating *</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoveredStar(i)}
              onMouseLeave={() => setHoveredStar(0)}
              className="rounded-sm p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={`size-7 transition-colors ${
                  i <= (hoveredStar || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {rating}/5
            </span>
          )}
        </div>
      </div>

      {/* Feedback */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="survey_feedback">Feedback</Label>
        <Textarea
          id="survey_feedback"
          placeholder="Patient comments and suggestions..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Submit Survey"
          )}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// LoadingSkeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`rounded-xl px-5 py-4 ${GLASS}`}>
            <div className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className={GLASS}>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl px-4 py-4 ${GLASS}`}>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-10 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No surveys recorded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by recording your first patient satisfaction survey.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        Record Survey
      </Button>
    </motion.div>
  )
}

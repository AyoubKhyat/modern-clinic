"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star,
  Plus,
  Loader2,
  Users,
  TrendingUp,
  ClipboardCheck,
  Calendar,
  Search,
  Eye,
  Trash2,
  UserCheck,
  Target,
  Award,
} from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import { staffReviewsApi, usersApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
  id: number
  employee_id: number
  employee_name: string
  employee_role: string
  reviewer_id: number
  reviewer_name: string
  review_period: string
  overall_rating: number
  clinical_skills: number
  communication: number
  punctuality: number
  teamwork: number
  strengths: string
  improvements: string
  goals: string
  notes: string
  created_at: string
}

interface User {
  id: number
  name: string
  role: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const RATING_COLORS: Record<number, string> = {
  5: "#0d9488",
  4: "#14b8a6",
  3: "#f59e0b",
  2: "#f97316",
  1: "#ef4444",
}

const RATING_BG: Record<number, string> = {
  5: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  4: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  3: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  2: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  1: "bg-red-500/10 text-red-700 dark:text-red-400",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, type: "spring" as const },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, type: "spring" as const },
  },
}

const SKILL_LABELS: Record<string, string> = {
  clinical_skills: "Clinical Skills",
  communication: "Communication",
  punctuality: "Punctuality",
  teamwork: "Teamwork",
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
  const sizeClass =
    size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5"
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

function InteractiveStars({
  value,
  onChange,
  size = "md",
}: {
  value: number
  onChange: (v: number) => void
  size?: "sm" | "md" | "lg"
}) {
  const [hovered, setHovered] = useState(0)
  const sizeClass =
    size === "lg" ? "size-7" : size === "md" ? "size-6" : "size-5"
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="rounded-sm p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={`${sizeClass} transition-colors ${
              i <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {value}/5
        </span>
      )}
    </div>
  )
}

function getRatingLabel(avg: number): { label: string; color: string } {
  if (avg >= 4.5)
    return { label: "Excellent", color: "text-teal-600 dark:text-teal-400" }
  if (avg >= 3.5)
    return { label: "Good", color: "text-teal-600 dark:text-teal-400" }
  if (avg >= 2.5)
    return { label: "Average", color: "text-amber-600 dark:text-amber-400" }
  if (avg >= 1.5)
    return {
      label: "Below Average",
      color: "text-orange-600 dark:text-orange-400",
    }
  return { label: "Poor", color: "text-red-600 dark:text-red-400" }
}

function getRadarData(review: Review) {
  return [
    { skill: "Clinical Skills", value: review.clinical_skills, fullMark: 5 },
    { skill: "Communication", value: review.communication, fullMark: 5 },
    { skill: "Punctuality", value: review.punctuality, fullMark: 5 },
    { skill: "Teamwork", value: review.teamwork, fullMark: 5 },
  ]
}

function averageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + r.overall_rating, 0)
  return sum / reviews.length
}

function averageSkills(reviews: Review[]) {
  if (reviews.length === 0)
    return { clinical_skills: 0, communication: 0, punctuality: 0, teamwork: 0 }
  const len = reviews.length
  return {
    clinical_skills:
      reviews.reduce((a, r) => a + r.clinical_skills, 0) / len,
    communication:
      reviews.reduce((a, r) => a + r.communication, 0) / len,
    punctuality:
      reviews.reduce((a, r) => a + r.punctuality, 0) / len,
    teamwork: reviews.reduce((a, r) => a + r.teamwork, 0) / len,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StaffReviewsPage() {
  const { toast } = useToast()

  const [reviews, setReviews] = useState<Review[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [detailReview, setDetailReview] = useState<Review | null>(null)
  const [filterEmployee, setFilterEmployee] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // ---------- Fetch ----------

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [reviewsRes, usersRes] = await Promise.all([
        staffReviewsApi.list(),
        usersApi.list(),
      ])
      const reviewsData = Array.isArray(reviewsRes.data)
        ? reviewsRes.data
        : reviewsRes.data?.data ?? []
      const usersData = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.data ?? []
      setReviews(reviewsData)
      setUsers(usersData)
    } catch {
      toast("Failed to load reviews", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Derived ----------

  const filteredReviews = useMemo(() => {
    let result = reviews
    if (filterEmployee !== "all") {
      result = result.filter(
        (r) => r.employee_id === Number(filterEmployee)
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) ||
          r.reviewer_name.toLowerCase().includes(q) ||
          r.review_period.toLowerCase().includes(q)
      )
    }
    return result
  }, [reviews, filterEmployee, searchQuery])

  const avgOverall = averageRating(filteredReviews)
  const avgSkills = averageSkills(filteredReviews)
  const ratingInfo = getRatingLabel(avgOverall)

  const uniqueEmployees = useMemo(() => {
    const map = new Map<number, string>()
    reviews.forEach((r) => map.set(r.employee_id, r.employee_name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [reviews])

  // ---------- Handlers ----------

  function handleFormSuccess() {
    toast("Review created successfully")
    setFormOpen(false)
    fetchData()
  }

  async function handleDelete(id: number) {
    try {
      await staffReviewsApi.delete(id)
      toast("Review deleted")
      setDetailReview(null)
      fetchData()
    } catch {
      toast("Failed to delete review", "error")
    }
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff Performance Reviews"
        description="Evaluate and track employee performance across key competencies"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New Review
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : reviews.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10">
                <ClipboardCheck className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold tabular-nums">
                  {filteredReviews.length}
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
                    {avgOverall > 0 ? avgOverall.toFixed(1) : "--"}
                  </p>
                  {avgOverall > 0 && (
                    <StarDisplay rating={Math.round(avgOverall)} size="sm" />
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10">
                <TrendingUp className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className={`text-2xl font-bold ${ratingInfo.color}`}>
                  {avgOverall > 0 ? ratingInfo.label : "--"}
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl px-5 py-4 ${GLASS}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <Users className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Employees Reviewed
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {uniqueEmployees.length}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Average Skills Radar */}
          {avgOverall > 0 && (
            <motion.div variants={itemVariants}>
              <Card className={GLASS}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <Target className="size-4 text-muted-foreground" />
                    Average Skill Breakdown
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mx-auto h-64 max-w-md">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={[
                          {
                            skill: "Clinical Skills",
                            value: avgSkills.clinical_skills,
                            fullMark: 5,
                          },
                          {
                            skill: "Communication",
                            value: avgSkills.communication,
                            fullMark: 5,
                          },
                          {
                            skill: "Punctuality",
                            value: avgSkills.punctuality,
                            fullMark: 5,
                          },
                          {
                            skill: "Teamwork",
                            value: avgSkills.teamwork,
                            fullMark: 5,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                      >
                        <PolarGrid stroke="hsl(var(--muted-foreground) / 0.2)" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 5]}
                          tick={{ fontSize: 10 }}
                          className="text-muted-foreground"
                        />
                        <Radar
                          name="Average"
                          dataKey="value"
                          stroke="#0d9488"
                          fill="#0d9488"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    {Object.entries(avgSkills).map(([key, val]) => (
                      <span key={key} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-teal-500" />
                        {SKILL_LABELS[key]}: {val.toFixed(1)}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Filter Bar */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 pl-9"
              />
            </div>
            <Select
              value={filterEmployee}
              onValueChange={(v) => setFilterEmployee(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-52">
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterEmployee !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterEmployee("all")
                  setSearchQuery("")
                }}
                className="text-xs text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </motion.div>

          {/* Review Cards */}
          <motion.div variants={itemVariants}>
            {filteredReviews.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredReviews.map((review, i) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      index={i}
                      onView={() => setDetailReview(review)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No reviews match your filters
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : (
        <EmptyState onCreate={() => setFormOpen(true)} />
      )}

      {/* Create Review Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Performance Review</DialogTitle>
            <DialogDescription>
              Evaluate an employee across key performance areas.
            </DialogDescription>
          </DialogHeader>
          <ReviewForm
            users={users}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Review Detail Dialog */}
      <Dialog
        open={!!detailReview}
        onOpenChange={(open) => {
          if (!open) setDetailReview(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Performance evaluation for {detailReview?.employee_name}
            </DialogDescription>
          </DialogHeader>
          {detailReview && (
            <ReviewDetail
              review={detailReview}
              onDelete={() => handleDelete(detailReview.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReviewCard
// ---------------------------------------------------------------------------

function ReviewCard({
  review,
  index,
  onView,
}: {
  review: Review
  index: number
  onView: () => void
}) {
  const ratingBg = RATING_BG[review.overall_rating] ?? RATING_BG[3]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: index * 0.04, type: "spring" as const }}
      className={`group flex flex-col gap-3 rounded-xl px-4 py-4 ${GLASS} cursor-pointer transition-shadow hover:shadow-md`}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {review.employee_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {review.employee_role}
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${ratingBg}`}
        >
          {review.overall_rating}/5
        </div>
      </div>

      {/* Stars */}
      <StarDisplay rating={review.overall_rating} size="sm" />

      {/* Skills mini-bar */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Clinical: {review.clinical_skills}/5</span>
        <span>Comms: {review.communication}/5</span>
        <span>Punctual: {review.punctuality}/5</span>
        <span>Team: {review.teamwork}/5</span>
      </div>

      {/* Period & Reviewer */}
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3" />
          {review.review_period}
        </span>
        <span className="flex items-center gap-1.5">
          <UserCheck className="size-3" />
          {review.reviewer_name}
        </span>
      </div>

      {/* View hint */}
      <div className="flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-teal-400">
        <Eye className="size-3" />
        View details
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ReviewDetail
// ---------------------------------------------------------------------------

function ReviewDetail({
  review,
  onDelete,
}: {
  review: Review
  onDelete: () => void
}) {
  const radarData = getRadarData(review)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Employee Info */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10">
          <Award className="size-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <p className="font-semibold">{review.employee_name}</p>
          <p className="text-sm text-muted-foreground">
            {review.employee_role} &middot; {review.review_period}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StarDisplay rating={review.overall_rating} size="md" />
          <Badge
            className={
              RATING_BG[review.overall_rating] ?? RATING_BG[3]
            }
          >
            {review.overall_rating}/5
          </Badge>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="mx-auto h-56 w-full max-w-sm">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--muted-foreground) / 0.2)" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 5]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <Radar
              name={review.employee_name}
              dataKey="value"
              stroke="#0d9488"
              fill="#0d9488"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Skill Scores */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["clinical_skills", review.clinical_skills],
            ["communication", review.communication],
            ["punctuality", review.punctuality],
            ["teamwork", review.teamwork],
          ] as [string, number][]
        ).map(([key, val]) => (
          <div
            key={key}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${GLASS}`}
          >
            <span className="text-sm text-muted-foreground">
              {SKILL_LABELS[key]}
            </span>
            <div className="flex items-center gap-1.5">
              <StarDisplay rating={val} size="sm" />
              <span className="text-xs font-semibold tabular-nums">{val}/5</span>
            </div>
          </div>
        ))}
      </div>

      {/* Text Sections */}
      {review.strengths && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Strengths</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.strengths}
          </p>
        </div>
      )}
      {review.improvements && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Areas for Improvement
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.improvements}
          </p>
        </div>
      )}
      {review.goals && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Goals</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.goals}
          </p>
        </div>
      )}
      {review.notes && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Notes</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.notes}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between border-t border-foreground/5 pt-3 text-xs text-muted-foreground">
        <span>
          Reviewed by {review.reviewer_name} on{" "}
          {new Date(review.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Delete
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReviewForm
// ---------------------------------------------------------------------------

function ReviewForm({
  users,
  onSuccess,
  onCancel,
}: {
  users: User[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [employeeId, setEmployeeId] = useState("")
  const [reviewPeriod, setReviewPeriod] = useState("")
  const [overallRating, setOverallRating] = useState(0)
  const [clinicalSkills, setClinicalSkills] = useState(0)
  const [communication, setCommunication] = useState(0)
  const [punctuality, setPunctuality] = useState(0)
  const [teamwork, setTeamwork] = useState(0)
  const [strengths, setStrengths] = useState("")
  const [improvements, setImprovements] = useState("")
  const [goals, setGoals] = useState("")
  const [notes, setNotes] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!employeeId) {
      setError("Please select an employee.")
      return
    }
    if (!reviewPeriod.trim()) {
      setError("Please enter a review period.")
      return
    }
    if (overallRating < 1 || overallRating > 5) {
      setError("Please select an overall rating between 1 and 5.")
      return
    }
    if (clinicalSkills < 1 || communication < 1 || punctuality < 1 || teamwork < 1) {
      setError("Please rate all skill dimensions (1-5).")
      return
    }

    setSaving(true)
    try {
      await staffReviewsApi.create({
        employee_id: Number(employeeId),
        review_period: reviewPeriod.trim(),
        overall_rating: overallRating,
        clinical_skills: clinicalSkills,
        communication,
        punctuality,
        teamwork,
        strengths: strengths.trim() || undefined,
        improvements: improvements.trim() || undefined,
        goals: goals.trim() || undefined,
        notes: notes.trim() || undefined,
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

      {/* Employee Select */}
      <div className="flex flex-col gap-1.5">
        <Label>Employee *</Label>
        <Select
          value={employeeId}
          onValueChange={(v) => setEmployeeId(v ?? "")}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name} ({u.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Review Period */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review_period">Review Period *</Label>
        <Input
          id="review_period"
          placeholder="e.g. Q1 2026"
          value={reviewPeriod}
          onChange={(e) => setReviewPeriod(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Overall Rating */}
      <div className="flex flex-col gap-1.5">
        <Label>Overall Rating *</Label>
        <InteractiveStars
          value={overallRating}
          onChange={setOverallRating}
          size="lg"
        />
      </div>

      {/* Skill Ratings */}
      <div className="rounded-lg border border-foreground/5 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          Skill Dimensions *
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Clinical Skills
            </Label>
            <InteractiveStars
              value={clinicalSkills}
              onChange={setClinicalSkills}
              size="sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Communication
            </Label>
            <InteractiveStars
              value={communication}
              onChange={setCommunication}
              size="sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Punctuality</Label>
            <InteractiveStars
              value={punctuality}
              onChange={setPunctuality}
              size="sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Teamwork</Label>
            <InteractiveStars
              value={teamwork}
              onChange={setTeamwork}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review_strengths">Strengths</Label>
        <Textarea
          id="review_strengths"
          placeholder="Key strengths and achievements..."
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          rows={2}
        />
      </div>

      {/* Improvements */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review_improvements">Areas for Improvement</Label>
        <Textarea
          id="review_improvements"
          placeholder="Areas that need attention..."
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          rows={2}
        />
      </div>

      {/* Goals */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review_goals">Goals</Label>
        <Textarea
          id="review_goals"
          placeholder="Upcoming goals and objectives..."
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review_notes">Additional Notes</Label>
        <Textarea
          id="review_notes"
          placeholder="Any other comments..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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
            "Submit Review"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
      <Card className={GLASS}>
        <CardHeader>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-56 w-64 rounded-lg" />
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-52" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`rounded-xl px-4 py-4 ${GLASS}`}>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-10 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-24" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
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
      transition={{ type: "spring" as const }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <ClipboardCheck className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No performance reviews yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating the first staff performance review.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="size-4" />
        New Review
      </Button>
    </motion.div>
  )
}

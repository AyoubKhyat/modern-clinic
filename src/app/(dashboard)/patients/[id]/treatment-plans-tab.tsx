"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  ClipboardList,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox,
  Calendar,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { treatmentPlansApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Step {
  id: number
  plan_id: number
  title: string
  description: string | null
  status: "pending" | "in_progress" | "completed"
  due_date: string | null
  completed_at: string | null
  order_num: number
}

interface Plan {
  id: number
  patient_id: number
  doctor_id: number
  title: string
  description: string | null
  status: "active" | "completed" | "cancelled"
  start_date: string | null
  end_date: string | null
  doctor_name: string | null
  steps: Step[]
}

interface NewStepDraft {
  title: string
  description: string
  due_date: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const planStatusConfig: Record<
  Plan["status"],
  { label: string; variant: "default" | "secondary" | "destructive"; color: string }
> = {
  active: {
    label: "Active",
    variant: "default",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  completed: {
    label: "Completed",
    variant: "secondary",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
}

const stepStatusConfig: Record<
  Step["status"],
  { label: string; color: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function TreatmentPlansTab({ patientId }: { patientId: number }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const { toast } = useToast()

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await treatmentPlansApi.list({ patient_id: patientId })
      setPlans(data.data ?? data ?? [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  function toggleExpand(planId: number) {
    setExpandedId((prev) => (prev === planId ? null : planId))
  }

  async function handleStatusChange(planId: number, status: "completed" | "cancelled") {
    try {
      await treatmentPlansApi.update(planId, { status })
      toast(
        status === "completed"
          ? "Plan marked as completed"
          : "Plan cancelled"
      )
      setLoading(true)
      await fetchPlans()
    } catch {
      toast("Failed to update plan status", "error")
    }
  }

  if (loading) return <TreatmentPlansSkeleton />

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {plans.length} treatment plan{plans.length !== 1 ? "s" : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New Plan
        </Button>
      </div>

      {/* Empty state */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <ClipboardList className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            No treatment plans found for this patient.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <PlanCard
                plan={plan}
                expanded={expandedId === plan.id}
                onToggle={() => toggleExpand(plan.id)}
                onStatusChange={handleStatusChange}
                onRefresh={() => {
                  setLoading(true)
                  fetchPlans()
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Plan Dialog */}
      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        patientId={patientId}
        onCreated={() => {
          setCreateOpen(false)
          setLoading(true)
          fetchPlans()
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Plan Card                                                          */
/* ------------------------------------------------------------------ */

function PlanCard({
  plan,
  expanded,
  onToggle,
  onStatusChange,
  onRefresh,
}: {
  plan: Plan
  expanded: boolean
  onToggle: () => void
  onStatusChange: (planId: number, status: "completed" | "cancelled") => void
  onRefresh: () => void
}) {
  const completedSteps = plan.steps.filter((s) => s.status === "completed").length
  const totalSteps = plan.steps.length
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const statusCfg = planStatusConfig[plan.status]

  const [editOpen, setEditOpen] = useState(false)

  return (
    <Card className={`${CARD_GLASS} transition-all duration-300 hover:shadow-md hover:ring-foreground/10`}>
      <CardContent className="flex flex-col gap-3 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ClipboardList className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium leading-snug">
                {plan.title}
              </span>
              {plan.doctor_name && (
                <span className="text-xs text-muted-foreground">
                  Dr. {plan.doctor_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Date range */}
        {(plan.start_date || plan.end_date) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>
              {plan.start_date
                ? format(parseISO(plan.start_date), "MMM d, yyyy")
                : "No start date"}
              {" - "}
              {plan.end_date
                ? format(parseISO(plan.end_date), "MMM d, yyyy")
                : "No end date"}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {completedSteps} of {totalSteps} step{totalSteps !== 1 ? "s" : ""} completed
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="xs" onClick={onToggle}>
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {expanded ? "Collapse" : "Expand"}
          </Button>

          {plan.status === "active" && (
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setEditOpen(true)}
              >
                <Edit className="size-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onStatusChange(plan.id, "completed")}
              >
                <CheckCircle2 className="size-3.5 text-green-600" />
                Complete
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onStatusChange(plan.id, "cancelled")}
              >
                <XCircle className="size-3.5 text-red-500" />
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Expanded steps section */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <Separator className="my-1" />
              <StepsList
                plan={plan}
                onRefresh={onRefresh}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Edit Plan Dialog */}
      <EditPlanDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={plan}
        onUpdated={() => {
          setEditOpen(false)
          onRefresh()
        }}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Steps List                                                         */
/* ------------------------------------------------------------------ */

function StepsList({
  plan,
  onRefresh,
}: {
  plan: Plan
  onRefresh: () => void
}) {
  const [addStepOpen, setAddStepOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()

  const sortedSteps = [...plan.steps].sort((a, b) => a.order_num - b.order_num)

  async function handleToggleStep(step: Step) {
    setTogglingId(step.id)
    const newStatus = step.status === "completed" ? "pending" : "completed"
    try {
      await treatmentPlansApi.updateStep(step.id, { status: newStatus })
      toast(
        newStatus === "completed"
          ? "Step marked as completed"
          : "Step marked as pending"
      )
      onRefresh()
    } catch {
      toast("Failed to update step", "error")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteStep(stepId: number) {
    setDeletingId(stepId)
    try {
      await treatmentPlansApi.deleteStep(stepId)
      toast("Step deleted")
      onRefresh()
    } catch {
      toast("Failed to delete step", "error")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Steps</span>
        {plan.status === "active" && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setAddStepOpen(true)}
          >
            <Plus className="size-3" />
            Add Step
          </Button>
        )}
      </div>

      {sortedSteps.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          No steps added yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {sortedSteps.map((step, i) => {
            const stepCfg = stepStatusConfig[step.status]
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
              >
                {/* Checkbox */}
                <button
                  type="button"
                  disabled={togglingId === step.id || plan.status !== "active"}
                  onClick={() => handleToggleStep(step)}
                  className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-input transition-colors hover:border-teal-500 disabled:opacity-50 data-[checked=true]:border-teal-500 data-[checked=true]:bg-teal-500"
                  data-checked={step.status === "completed"}
                >
                  {togglingId === step.id ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  ) : step.status === "completed" ? (
                    <Check className="size-3 text-white" />
                  ) : null}
                </button>

                {/* Step content */}
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        step.status === "completed"
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${stepCfg.color}`}
                    >
                      {stepCfg.label}
                    </span>
                  </div>
                  {step.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Due: {format(parseISO(step.due_date), "MMM d, yyyy")}
                    </span>
                  )}
                  {step.description && (
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Step actions */}
                {plan.status === "active" && (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingStep(step)}
                    >
                      <Edit className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={deletingId === step.id}
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      {deletingId === step.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3 text-destructive" />
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Step Dialog */}
      <AddStepDialog
        open={addStepOpen}
        onOpenChange={setAddStepOpen}
        planId={plan.id}
        onAdded={() => {
          setAddStepOpen(false)
          onRefresh()
        }}
      />

      {/* Edit Step Dialog */}
      {editingStep && (
        <EditStepDialog
          open={!!editingStep}
          onOpenChange={(open) => {
            if (!open) setEditingStep(null)
          }}
          step={editingStep}
          onUpdated={() => {
            setEditingStep(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Plan Dialog                                                 */
/* ------------------------------------------------------------------ */

function CreatePlanDialog({
  open,
  onOpenChange,
  patientId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number
  onCreated: () => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [steps, setSteps] = useState<NewStepDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setTitle("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setSteps([])
  }

  function addStepDraft() {
    setSteps((prev) => [...prev, { title: "", description: "", due_date: "" }])
  }

  function updateStepDraft(index: number, field: keyof NewStepDraft, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  function removeStepDraft(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const stepsPayload = steps
        .filter((s) => s.title.trim())
        .map((s) => ({
          title: s.title,
          description: s.description || undefined,
          due_date: s.due_date || undefined,
        }))

      await treatmentPlansApi.create({
        patient_id: patientId,
        title,
        description: description || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        steps: stepsPayload,
      })

      toast("Treatment plan created successfully")
      resetForm()
      onCreated()
    } catch {
      toast("Failed to create treatment plan", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Treatment Plan</DialogTitle>
          <DialogDescription>
            Create a new treatment plan with steps for this patient.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Plan details */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-title">Title</Label>
            <Input
              id="plan-title"
              placeholder="e.g. Post-Surgery Recovery"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-desc">Description</Label>
            <Textarea
              id="plan-desc"
              placeholder="Describe the treatment plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-start">Start Date</Label>
              <Input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-end">End Date</Label>
              <Input
                id="plan-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Steps section */}
          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Steps</span>
            <Button variant="ghost" size="xs" onClick={addStepDraft}>
              <Plus className="size-3" />
              Add Step
            </Button>
          </div>

          {steps.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              No steps added yet. Click "Add Step" to begin.
            </p>
          )}

          <AnimatePresence initial={false}>
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Step {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeStepDraft(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Step title"
                    value={step.title}
                    onChange={(e) => updateStepDraft(index, "title", e.target.value)}
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      placeholder="Description (optional)"
                      value={step.description}
                      onChange={(e) =>
                        updateStepDraft(index, "description", e.target.value)
                      }
                    />
                    <Input
                      type="date"
                      className="w-auto"
                      value={step.due_date}
                      onChange={(e) =>
                        updateStepDraft(index, "due_date", e.target.value)
                      }
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Create Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Plan Dialog                                                   */
/* ------------------------------------------------------------------ */

function EditPlanDialog({
  open,
  onOpenChange,
  plan,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan
  onUpdated: () => void
}) {
  const [title, setTitle] = useState(plan.title)
  const [description, setDescription] = useState(plan.description ?? "")
  const [startDate, setStartDate] = useState(plan.start_date ?? "")
  const [endDate, setEndDate] = useState(plan.end_date ?? "")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setTitle(plan.title)
    setDescription(plan.description ?? "")
    setStartDate(plan.start_date ?? "")
    setEndDate(plan.end_date ?? "")
  }, [plan])

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await treatmentPlansApi.update(plan.id, {
        title,
        description: description || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      toast("Plan updated successfully")
      onUpdated()
    } catch {
      toast("Failed to update plan", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Treatment Plan</DialogTitle>
          <DialogDescription>
            Update the plan details below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-plan-title">Title</Label>
            <Input
              id="edit-plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-plan-desc">Description</Label>
            <Textarea
              id="edit-plan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-plan-start">Start Date</Label>
              <Input
                id="edit-plan-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-plan-end">End Date</Label>
              <Input
                id="edit-plan-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Step Dialog                                                    */
/* ------------------------------------------------------------------ */

function AddStepDialog({
  open,
  onOpenChange,
  planId,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: number
  onAdded: () => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  function resetForm() {
    setTitle("")
    setDescription("")
    setDueDate("")
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await treatmentPlansApi.addStep(planId, {
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
      })
      toast("Step added successfully")
      resetForm()
      onAdded()
    } catch {
      toast("Failed to add step", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Step</DialogTitle>
          <DialogDescription>
            Add a new step to this treatment plan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="step-title">Title</Label>
            <Input
              id="step-title"
              placeholder="e.g. Follow-up appointment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="step-desc">Description</Label>
            <Textarea
              id="step-desc"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="step-due">Due Date</Label>
            <Input
              id="step-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Add Step
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Step Dialog                                                   */
/* ------------------------------------------------------------------ */

function EditStepDialog({
  open,
  onOpenChange,
  step,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: Step
  onUpdated: () => void
}) {
  const [title, setTitle] = useState(step.title)
  const [status, setStatus] = useState(step.status)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setTitle(step.title)
    setStatus(step.status)
  }, [step])

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await treatmentPlansApi.updateStep(step.id, { title, status })
      toast("Step updated successfully")
      onUpdated()
    } catch {
      toast("Failed to update step", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Step</DialogTitle>
          <DialogDescription>
            Update this step's details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-step-title">Title</Label>
            <Input
              id="edit-step-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-step-status">Status</Label>
            <div className="flex gap-2">
              {(["pending", "in_progress", "completed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === s
                      ? stepStatusConfig[s].color
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {stepStatusConfig[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function TreatmentPlansSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card
          key={i}
          className="border-0 ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"
        >
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

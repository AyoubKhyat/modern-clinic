"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO, isPast, isToday } from "date-fns"
import {
  Plus,
  GripVertical,
  Calendar,
  User,
  Trash2,
  Pencil,
  Loader2,
  ListFilter,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { tasksApi, usersApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

/* ── Types ── */

interface Task {
  id: number
  title: string
  description: string
  status: string
  priority: string
  assigned_to: number | null
  assigned_to_name: string | null
  created_by: number | null
  created_by_name: string | null
  due_date: string | null
  completed_at: string | null
  category: string
}

interface UserRecord {
  id: number
  name: string
  role: string
}

/* ── Constants ── */

const COLUMNS = [
  { key: "todo", label: "To Do", icon: Circle, color: "text-gray-500" },
  { key: "in_progress", label: "In Progress", icon: Clock, color: "text-teal-600" },
  { key: "done", label: "Done", icon: CheckCircle2, color: "text-green-600" },
] as const

type ColumnKey = (typeof COLUMNS)[number]["key"]

const PRIORITIES = ["urgent", "high", "medium", "low"] as const
const CATEGORIES = ["general", "clinical", "administrative", "follow-up", "maintenance"] as const

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: {
    label: "Urgent",
    className: "bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400",
  },
  high: {
    label: "High",
    className: "bg-orange-500/10 text-orange-700 border border-orange-500/20 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400",
  },
  low: {
    label: "Low",
    className: "bg-gray-500/10 text-gray-700 border border-gray-500/20 dark:text-gray-400",
  },
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  general: {
    label: "General",
    className: "bg-slate-500/10 text-slate-700 border border-slate-500/20 dark:text-slate-400",
  },
  clinical: {
    label: "Clinical",
    className: "bg-teal-500/10 text-teal-700 border border-teal-500/20 dark:text-teal-400",
  },
  administrative: {
    label: "Administrative",
    className: "bg-purple-500/10 text-purple-700 border border-purple-500/20 dark:text-purple-400",
  },
  "follow-up": {
    label: "Follow-up",
    className: "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 dark:text-indigo-400",
  },
}

/* ── Animation Variants ── */

const columnVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      delay: i * 0.1,
    },
  }),
}

const cardListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      type: "spring" as const,
      staggerChildren: 0.05,
    },
  },
}

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.15 },
  },
}

/* ── Main Page ── */

export default function TasksPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Drag state
  const draggedTaskId = useRef<number | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  /* ── Data Fetching ── */

  const fetchTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list()
      setTasks(res.data ?? [])
    } catch {
      toast("Failed to load tasks", "error")
    }
  }, [toast])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await usersApi.list()
      setUsers(res.data ?? [])
    } catch {
      // Users list is non-critical for page load
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchTasks(), fetchUsers()]).finally(() => setLoading(false))
  }, [fetchTasks, fetchUsers])

  /* ── Filtered & Grouped Tasks ── */

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (assigneeFilter !== "all" && String(t.assigned_to) !== assigneeFilter) return false
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false
      return true
    })
  }, [tasks, assigneeFilter, categoryFilter])

  const groupedTasks = useMemo(() => {
    const groups: Record<ColumnKey, Task[]> = { todo: [], in_progress: [], done: [] }
    for (const task of filteredTasks) {
      const col = (task.status as ColumnKey) in groups ? (task.status as ColumnKey) : "todo"
      groups[col].push(task)
    }
    return groups
  }, [filteredTasks])

  /* ── Drag & Drop ── */

  function handleDragStart(e: React.DragEvent, taskId: number) {
    draggedTaskId.current = taskId
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(taskId))
    // Make the drag ghost slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    draggedTaskId.current = null
    setDragOverColumn(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }

  function handleDragOver(e: React.DragEvent, columnKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(columnKey)
  }

  function handleDragLeave() {
    setDragOverColumn(null)
  }

  async function handleDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault()
    setDragOverColumn(null)

    const taskId = Number(e.dataTransfer.getData("text/plain"))
    if (!taskId) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === targetStatus) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    )

    try {
      await tasksApi.updateStatus(taskId, targetStatus)
      toast("Task moved successfully")
    } catch {
      toast("Failed to move task", "error")
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      )
    }
  }

  /* ── Task CRUD ── */

  function openCreateDialog() {
    setEditingTask(null)
    setDialogOpen(true)
  }

  function openEditDialog(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  async function handleDelete(taskId: number) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    try {
      await tasksApi.delete(taskId)
      toast("Task deleted")
    } catch {
      toast("Failed to delete task", "error")
      fetchTasks()
    }
  }

  function handleFormSuccess() {
    setDialogOpen(false)
    setEditingTask(null)
    fetchTasks()
  }

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader title="Tasks" description="Manage clinic tasks with drag and drop" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Tasks"
        description="Manage clinic tasks with drag and drop"
        action={
          <Button onClick={openCreateDialog} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="size-4" />
            Add Task
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListFilter className="size-4" />
          <span>Filters</span>
        </div>
        <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryConfig[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(assigneeFilter !== "all" || categoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAssigneeFilter("all")
              setCategoryFilter("all")
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col, colIndex) => {
          const colTasks = groupedTasks[col.key]
          const Icon = col.icon
          const isOver = dragOverColumn === col.key

          return (
            <motion.div
              key={col.key}
              custom={colIndex}
              variants={columnVariants}
              initial="hidden"
              animate="visible"
              className={`flex flex-col rounded-xl border bg-muted/30 transition-colors ${
                isOver
                  ? "border-teal-500/40 bg-teal-500/5 ring-2 ring-teal-500/20"
                  : "border-border/50"
              }`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <Icon className={`size-4 ${col.color}`} />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2 p-3" style={{ minHeight: 120 }}>
                  <AnimatePresence mode="popLayout">
                    {colTasks.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground"
                      >
                        <Circle className="mb-2 size-6 opacity-30" />
                        No tasks
                      </motion.div>
                    ) : (
                      <motion.div
                        key="list"
                        variants={cardListVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col gap-2"
                      >
                        {colTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            variants={cardItemVariants}
                            layout
                            exit="exit"
                          >
                            <div
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => openEditDialog(task)}
                              className="group cursor-grab rounded-lg border-0 bg-card p-3 shadow-sm ring-1 ring-foreground/[0.06] transition-all hover:shadow-md hover:ring-foreground/[0.1] active:cursor-grabbing dark:ring-foreground/[0.04]"
                            >
                              {/* Card Top: Priority + Grip */}
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <h4 className="text-sm font-medium leading-snug line-clamp-2">
                                  {task.title}
                                </h4>
                                <GripVertical className="size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60" />
                              </div>

                              {/* Badges Row */}
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {task.priority && priorityConfig[task.priority] && (
                                  <Badge className={priorityConfig[task.priority].className}>
                                    {task.priority === "urgent" && (
                                      <AlertCircle className="mr-0.5 size-3" />
                                    )}
                                    {priorityConfig[task.priority].label}
                                  </Badge>
                                )}
                                {task.category && categoryConfig[task.category] && (
                                  <Badge className={categoryConfig[task.category].className}>
                                    {categoryConfig[task.category].label}
                                  </Badge>
                                )}
                              </div>

                              {/* Meta Row */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {task.assigned_to_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="size-3" />
                                    <span className="max-w-[80px] truncate">
                                      {task.assigned_to_name}
                                    </span>
                                  </span>
                                )}
                                {task.due_date && (
                                  <span
                                    className={`flex items-center gap-1 ${
                                      task.status !== "done" &&
                                      isPast(parseISO(task.due_date)) &&
                                      !isToday(parseISO(task.due_date))
                                        ? "font-medium text-red-500"
                                        : ""
                                    }`}
                                  >
                                    <Calendar className="size-3" />
                                    {format(parseISO(task.due_date), "MMM d")}
                                  </span>
                                )}
                              </div>

                              {/* Quick Actions (visible on hover) */}
                              <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditDialog(task)
                                  }}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(task.id)
                                  }}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          )
        })}
      </div>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update the task details below."
                : "Fill in the details to create a new task."}
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            users={users}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
            onDelete={
              editingTask
                ? () => {
                    handleDelete(editingTask.id)
                    setDialogOpen(false)
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Task Form ── */

function TaskForm({
  task,
  users,
  onSuccess,
  onCancel,
  onDelete,
}: {
  task: Task | null
  users: UserRecord[]
  onSuccess: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const { toast } = useToast()

  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [priority, setPriority] = useState(task?.priority ?? "medium")
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ? String(task.assigned_to) : "")
  const [dueDate, setDueDate] = useState(task?.due_date ?? "")
  const [category, setCategory] = useState(task?.category ?? "general")
  const [status, setStatus] = useState(task?.status ?? "todo")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!title.trim()) {
      setError("Title is required.")
      return
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigned_to: assignedTo ? Number(assignedTo) : undefined,
      due_date: dueDate || undefined,
      category,
      status,
    }

    setSaving(true)
    try {
      if (task) {
        await tasksApi.update(task.id, payload)
        toast("Task updated successfully")
      } else {
        await tasksApi.create(payload)
        toast("Task created successfully")
      }
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          rows={3}
        />
      </div>

      {/* Priority & Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {priorityConfig[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? "general")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryConfig[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignee & Due Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Assign To</Label>
          <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      {/* Status (only when editing) */}
      {task && (
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "todo")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map((col) => (
                <SelectItem key={col.key} value={col.key}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {task ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  )
}

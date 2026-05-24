"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Users,
  Calendar,
  CreditCard,
  Monitor,
  CalendarDays,
  MessageSquare,
  DoorOpen,
  ListTodo,
  Repeat,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  MousePointerClick,
  LayoutDashboard,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

interface GuideSection {
  id: string
  title: string
  icon: React.ElementType
  href: string
  color: string
  description: string
  steps: {
    title: string
    detail: string
  }[]
  tips?: string[]
}

const sections: GuideSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-blue-500 bg-blue-500/10",
    description:
      "Your home screen shows today's appointments, recent activity, and key stats at a glance.",
    steps: [
      {
        title: "Check today's overview",
        detail:
          "When you log in, the dashboard shows the number of patients expected today, appointments status, and quick stats.",
      },
      {
        title: "Use Quick Actions",
        detail:
          "Click the quick action buttons to jump directly to adding a new patient, booking an appointment, or recording a payment.",
      },
      {
        title: "Review recent activity",
        detail:
          "Scroll down to see the latest appointments and payments across the clinic.",
      },
    ],
    tips: [
      "The dashboard refreshes automatically — no need to reload the page.",
      "Use the search bar (Ctrl+K) from any page to quickly find patients or appointments.",
    ],
  },
  {
    id: "patients",
    title: "Patient Management",
    icon: Users,
    href: "/patients",
    color: "text-teal-500 bg-teal-500/10",
    description:
      "Register new patients, update their information, and access their complete medical history.",
    steps: [
      {
        title: 'Click "Add Patient" button',
        detail:
          "Fill in the patient's first name, last name, phone number (required), and optional fields like email, date of birth, gender, blood type, and address.",
      },
      {
        title: "Search for existing patients",
        detail:
          'Use the search bar at the top to find patients by name or phone number. You can also use the global search (Ctrl+K) from any page.',
      },
      {
        title: "View patient details",
        detail:
          "Click on any patient row to see their full profile: appointments history, visits, payments, documents, allergies, lab results, and more.",
      },
      {
        title: "Edit patient information",
        detail:
          'On the patient detail page, click the "Edit" button to update their contact info, allergies, insurance details, or emergency contacts.',
      },
      {
        title: "Upload documents",
        detail:
          'In the patient detail page, go to the "Documents" tab to upload scans, lab results, insurance cards, or any files related to the patient.',
      },
    ],
    tips: [
      "Always verify the patient's phone number — it's required and used for identification.",
      "Check the Allergies tab before scheduling procedures to flag any risks.",
      "Use the Timeline tab to see a chronological view of all patient events.",
    ],
  },
  {
    id: "appointments",
    title: "Appointments",
    icon: Calendar,
    href: "/appointments",
    color: "text-purple-500 bg-purple-500/10",
    description:
      "Schedule, reschedule, and manage patient appointments. Track appointment status from scheduled to completed.",
    steps: [
      {
        title: 'Click "New Appointment"',
        detail:
          "Select the patient (search by name), choose a doctor, pick a date and time, set the duration, select the appointment type (consultation, follow-up, etc.), and add a reason.",
      },
      {
        title: "Check for conflicts",
        detail:
          "The system automatically checks for scheduling conflicts. If the doctor already has an appointment at that time, you'll see a warning.",
      },
      {
        title: "Update appointment status",
        detail:
          'Use the status dropdown on each appointment to update it: Scheduled → Confirmed → Arrived → In Progress → Completed. You can also mark as "Cancelled" or "No Show".',
      },
      {
        title: "Filter and search",
        detail:
          "Use the status filter tabs and the search bar to quickly find appointments. Filter by today, upcoming, or past appointments.",
      },
      {
        title: "Send reminders",
        detail:
          "Click the bell icon on an appointment to send a reminder notification to the patient.",
      },
    ],
    tips: [
      "When a patient arrives, update status to 'Arrived' so the doctor knows they're waiting.",
      "Double-check the doctor's schedule before booking to avoid overlaps.",
      "Use the Calendar page for a visual overview of all appointments.",
    ],
  },
  {
    id: "calendar",
    title: "Calendar View",
    icon: CalendarDays,
    href: "/calendar",
    color: "text-orange-500 bg-orange-500/10",
    description:
      "Visual calendar showing all appointments in month or week view. Drag and drop to reschedule.",
    steps: [
      {
        title: "Switch between views",
        detail:
          "Toggle between Month and Week views using the buttons at the top. Week view gives you a detailed hour-by-hour breakdown.",
      },
      {
        title: "Navigate dates",
        detail:
          'Use the arrow buttons to go to previous/next month or week. Click "Today" to jump back to the current date.',
      },
      {
        title: "Drag to reschedule",
        detail:
          "In the calendar, you can drag an appointment block to a different day or time slot to quickly reschedule it.",
      },
      {
        title: "Click to view details",
        detail:
          "Click on any appointment block to see the full details — patient name, doctor, time, status, and reason.",
      },
    ],
    tips: [
      "Color-coded appointments make it easy to see different statuses at a glance.",
      "The week view is best for managing a busy day with many appointments.",
    ],
  },
  {
    id: "waiting-room",
    title: "Waiting Room",
    icon: Monitor,
    href: "/waiting-room",
    color: "text-cyan-500 bg-cyan-500/10",
    description:
      "Monitor patients who have arrived and are waiting to be seen. Track wait times in real-time.",
    steps: [
      {
        title: "Check who's waiting",
        detail:
          'The waiting room shows all patients with "Arrived" status. You can see their name, appointment time, doctor, and how long they\'ve been waiting.',
      },
      {
        title: "Update arrival status",
        detail:
          'When a patient arrives, go to their appointment and change the status to "Arrived". They will automatically appear in the waiting room.',
      },
      {
        title: "Monitor wait times",
        detail:
          "Wait times are calculated automatically. If someone has been waiting too long, the time display will turn red.",
      },
    ],
    tips: [
      "Keep this page open on a separate screen for real-time waiting room monitoring.",
      "Notify the doctor when a patient has been waiting longer than expected.",
    ],
  },
  {
    id: "payments",
    title: "Payments",
    icon: CreditCard,
    href: "/payments",
    color: "text-emerald-500 bg-emerald-500/10",
    description:
      "Record and track patient payments. Manage invoices and payment status.",
    steps: [
      {
        title: 'Click "Record Payment"',
        detail:
          "Select the patient, enter the amount, choose the payment type (consultation, procedure, lab, etc.), payment method (cash, card, transfer), and add a description.",
      },
      {
        title: "Mark as paid",
        detail:
          'For pending payments, click the "Mark as Paid" button to record the payment date and update the status.',
      },
      {
        title: "Print invoice",
        detail:
          "Click the print icon on any payment to generate a printable invoice with clinic details, patient info, and payment breakdown.",
      },
      {
        title: "Filter payments",
        detail:
          "Use the status filters (All, Pending, Paid) and search bar to find specific payments.",
      },
    ],
    tips: [
      "Always record the payment method (cash/card) for accurate accounting.",
      "Print receipts for patients who pay in cash as proof of payment.",
    ],
  },
  {
    id: "rooms",
    title: "Rooms & Resources",
    icon: DoorOpen,
    href: "/rooms",
    color: "text-pink-500 bg-pink-500/10",
    description:
      "Manage clinic rooms, check availability, and book rooms for appointments or procedures.",
    steps: [
      {
        title: "View room availability",
        detail:
          "Each room card shows its current status: Available (green), Occupied (yellow), or Maintenance (red).",
      },
      {
        title: "Book a room",
        detail:
          "Click on a room to see today's bookings. Use the booking form to reserve a time slot — the system will prevent double-booking.",
      },
      {
        title: "Toggle room status",
        detail:
          'Use the "Toggle Status" button to cycle a room through Available → Occupied → Maintenance states.',
      },
    ],
    tips: [
      "Set rooms to 'Maintenance' when they need cleaning or are under repair.",
      "Check room bookings before scheduling procedures that need specific equipment.",
    ],
  },
  {
    id: "recurring",
    title: "Recurring Appointments",
    icon: Repeat,
    href: "/recurring-appointments",
    color: "text-violet-500 bg-violet-500/10",
    description:
      "Set up repeating appointment patterns for patients who need regular visits (weekly checkups, monthly follow-ups, etc.).",
    steps: [
      {
        title: "Create a recurring pattern",
        detail:
          "Click 'Add Recurring', select the patient, doctor, frequency (daily/weekly/monthly), specific day, time, and duration. Set a start and optional end date.",
      },
      {
        title: "Generate appointments",
        detail:
          'Click the "Generate" button on a pattern to automatically create individual appointments based on the schedule. You can set how far ahead to generate (up to 1 year).',
      },
      {
        title: "Activate or deactivate",
        detail:
          "Toggle a pattern on/off without deleting it. Deactivated patterns won't generate new appointments.",
      },
    ],
    tips: [
      "Generate appointments in batches (e.g., one month at a time) so you can adjust if needed.",
      "Patients with chronic conditions often need weekly or bi-weekly recurring patterns.",
    ],
  },
  {
    id: "tasks",
    title: "Task Board",
    icon: ListTodo,
    href: "/tasks",
    color: "text-amber-500 bg-amber-500/10",
    description:
      "Kanban board for managing clinic tasks and to-dos. Track what needs to be done, what's in progress, and what's completed.",
    steps: [
      {
        title: "Create a task",
        detail:
          'Click "Add Task", enter a title, description, set priority (Low/Medium/High/Urgent), assign it to a staff member, set a due date, and choose a category.',
      },
      {
        title: "Drag to update status",
        detail:
          'Drag task cards between the three columns: "To Do" → "In Progress" → "Done" to update their status.',
      },
      {
        title: "Filter tasks",
        detail:
          "Use the assignee and category filters to see only relevant tasks.",
      },
    ],
    tips: [
      "Use 'Urgent' priority for tasks that need immediate attention — they appear at the top.",
      "Assign tasks to specific staff members so everyone knows their responsibilities.",
    ],
  },
  {
    id: "chat",
    title: "Staff Chat",
    icon: MessageSquare,
    href: "/chat",
    color: "text-indigo-500 bg-indigo-500/10",
    description:
      "Send messages to doctors and other staff members. Coordinate patient care and share updates.",
    steps: [
      {
        title: "Select a conversation",
        detail:
          "The left panel shows all staff members you can chat with. Click on a name to open the conversation.",
      },
      {
        title: "Send a message",
        detail:
          "Type your message in the input box at the bottom and press Enter or click the send button.",
      },
      {
        title: "Check unread messages",
        detail:
          "Red badges on conversations show how many unread messages you have from that person.",
      },
    ],
    tips: [
      "Use chat to quickly notify a doctor when their patient has arrived.",
      "Messages update every few seconds — no need to refresh.",
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
}

export default function GuidePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.steps.some(
          (step) =>
            step.title.toLowerCase().includes(q) ||
            step.detail.toLowerCase().includes(q)
        )
    )
  }, [searchQuery])

  const toggleStep = (key: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const totalSteps = sections.reduce((sum, s) => sum + s.steps.length, 0)
  const completedCount = completedSteps.size
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title="Receptionist Guide"
        description="Step-by-step instructions for every feature you'll use daily"
      />

      {/* Progress & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${GLASS} bg-card`}>
            <BookOpen className="size-5 text-teal-500" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-sm font-semibold">
                {completedCount}/{totalSteps} steps
              </span>
            </div>
            <div className="ml-2 h-2 w-24 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: "spring" as const, stiffness: 200, damping: 25 }}
              />
            </div>
            <span className="text-xs font-medium text-teal-600">{progressPercent}%</span>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon
          const sectionSteps = s.steps.map((_, i) => `${s.id}-${i}`)
          const sectionCompleted = sectionSteps.filter((k) => completedSteps.has(k)).length
          const allDone = sectionCompleted === s.steps.length

          return (
            <button
              key={s.id}
              onClick={() => {
                setExpandedSection(expandedSection === s.id ? null : s.id)
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                expandedSection === s.id
                  ? "bg-teal-600 text-white"
                  : allDone
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-3.5" />
              {s.title}
              {allDone && <CheckCircle2 className="size-3 text-emerald-500" />}
            </button>
          )
        })}
      </div>

      {/* Sections */}
      <ScrollArea className="flex-1">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4 pb-8"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="mb-3 size-10 opacity-30" />
              <p className="text-sm">No sections match your search.</p>
            </div>
          ) : (
            filtered.map((section) => {
              const Icon = section.icon
              const isExpanded = expandedSection === section.id
              const sectionSteps = section.steps.map((_, i) => `${section.id}-${i}`)
              const sectionCompleted = sectionSteps.filter((k) => completedSteps.has(k)).length

              return (
                <motion.div key={section.id} variants={itemVariants} id={`section-${section.id}`}>
                  <Card className={`overflow-hidden ${GLASS} transition-shadow hover:shadow-md`}>
                    {/* Section Header */}
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className="flex w-full items-center gap-4 p-4 text-left sm:p-5"
                    >
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${section.color}`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold sm:text-base">{section.title}</h3>
                          <Badge variant="secondary" className="text-[10px]">
                            {sectionCompleted}/{section.steps.length}
                          </Badge>
                          {sectionCompleted === section.steps.length && (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 sm:text-sm">
                          {section.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hidden gap-1 text-teal-600 hover:text-teal-700 sm:inline-flex"
                          render={<Link href={section.href} />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open
                          <ArrowRight className="size-3.5" />
                        </Button>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="size-5 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t px-4 pb-5 pt-4 sm:px-5">
                            {/* Steps */}
                            <div className="flex flex-col gap-3">
                              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <MousePointerClick className="size-3.5" />
                                Step-by-step
                              </h4>
                              {section.steps.map((step, i) => {
                                const stepKey = `${section.id}-${i}`
                                const isDone = completedSteps.has(stepKey)

                                return (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`group flex gap-3 rounded-xl p-3 transition-colors ${
                                      isDone
                                        ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                                        : "bg-muted/30 hover:bg-muted/50"
                                    }`}
                                  >
                                    <button
                                      onClick={() => toggleStep(stepKey)}
                                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                                        isDone
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-muted-foreground/30 text-muted-foreground hover:border-teal-500"
                                      }`}
                                    >
                                      {isDone ? (
                                        <CheckCircle2 className="size-3.5" />
                                      ) : (
                                        i + 1
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <p
                                        className={`text-sm font-medium ${
                                          isDone
                                            ? "text-emerald-700 line-through decoration-emerald-300 dark:text-emerald-400"
                                            : ""
                                        }`}
                                      >
                                        {step.title}
                                      </p>
                                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        {step.detail}
                                      </p>
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </div>

                            {/* Tips */}
                            {section.tips && section.tips.length > 0 && (
                              <div className="mt-4 rounded-xl bg-amber-50/60 p-4 dark:bg-amber-950/20">
                                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                  <Lightbulb className="size-3.5" />
                                  Pro Tips
                                </h4>
                                <ul className="flex flex-col gap-1.5">
                                  {section.tips.map((tip, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300"
                                    >
                                      <ChevronRight className="mt-0.5 size-3 shrink-0" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Link to page */}
                            <div className="mt-4 sm:hidden">
                              <Button
                                size="sm"
                                className="w-full gap-2 bg-teal-600 text-white hover:bg-teal-700"
                                render={<Link href={section.href} />}
                              >
                                Go to {section.title}
                                <ArrowRight className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </ScrollArea>
    </div>
  )
}

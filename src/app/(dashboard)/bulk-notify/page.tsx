"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Send,
  Bell,
  Users,
  MessageSquare,
  Loader2,
  Info,
  AlertTriangle,
} from "lucide-react"
import { bulkNotifyApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

const GLASS = "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const MAX_TITLE_LENGTH = 100
const MAX_MESSAGE_LENGTH = 500

const targetOptions = [
  { value: "all", label: "All Users", icon: Users, description: "Doctors, receptionists, and patients" },
  { value: "doctors", label: "Doctors Only", icon: Users, description: "All registered doctors" },
  { value: "receptionists", label: "Receptionists Only", icon: Users, description: "All front-desk staff" },
  { value: "patients", label: "Patients Only", icon: Users, description: "All registered patients" },
]

export default function BulkNotifyPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()

  const [target, setTarget] = useState("all")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const targetLabel = targetOptions.find((t) => t.value === target)?.label ?? "All Users"
  const canSend = title.trim().length > 0 && message.trim().length > 0

  function handleSendClick() {
    if (!canSend) return
    setConfirmOpen(true)
  }

  async function handleConfirmSend() {
    setConfirmOpen(false)
    setSending(true)
    try {
      const { data } = await bulkNotifyApi.send({ title: title.trim(), message: message.trim(), target })
      const count = data?.count ?? data?.recipients ?? 0
      toast(
        count > 0
          ? `Notification sent to ${count} recipient${count !== 1 ? "s" : ""}`
          : "Notification sent successfully"
      )
      setTitle("")
      setMessage("")
      setTarget("all")
    } catch {
      toast("Failed to send notification", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk Notifications"
        description="Send notifications to staff and patients"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className={GLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Send className="size-4" />
                Compose Notification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendClick()
                }}
                className="flex flex-col gap-5"
              >
                {/* Target audience */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Target Audience</Label>
                  <Select value={target} onValueChange={(v) => setTarget(v ?? "all")}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {targetOptions.find((t) => t.value === target)?.description}
                  </p>
                </div>

                <Separator />

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Notification Title</Label>
                    <span
                      className={`text-xs tabular-nums ${
                        title.length > MAX_TITLE_LENGTH
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {title.length}/{MAX_TITLE_LENGTH}
                    </span>
                  </div>
                  <Input
                    placeholder="e.g. System Maintenance Notice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                    className="h-9"
                    required
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Message</Label>
                    <span
                      className={`text-xs tabular-nums ${
                        message.length > MAX_MESSAGE_LENGTH
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    placeholder="Write your notification message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    rows={5}
                    required
                  />
                </div>

                {/* Send button */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    Sending to: <span className="font-medium text-foreground">{targetLabel}</span>
                  </p>
                  <Button type="submit" disabled={!canSend || sending}>
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar cards */}
        <div className="flex flex-col gap-4">
          {/* Info card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className={GLASS}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Info className="size-4 text-blue-500" />
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-xs font-semibold text-teal-600 dark:text-teal-400">
                      1
                    </div>
                    <span>Choose the target audience for your notification</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-xs font-semibold text-teal-600 dark:text-teal-400">
                      2
                    </div>
                    <span>Write a clear title and descriptive message</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-xs font-semibold text-teal-600 dark:text-teal-400">
                      3
                    </div>
                    <span>Review and confirm before sending</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-xs font-semibold text-teal-600 dark:text-teal-400">
                      4
                    </div>
                    <span>Recipients see it instantly in their notification bell</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Delivery note card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className={GLASS}>
              <CardContent className="flex items-start gap-3 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-blue-500/10">
                  <Bell className="size-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">In-app delivery</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Notifications are delivered in-app via the notification bell.
                    Recipients will see a badge indicator when new notifications arrive.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tips card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className={GLASS}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="size-4" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    Keep titles short and action-oriented
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    Include relevant dates or deadlines in the message
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    Use targeted audiences to avoid notification fatigue
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    Review your message carefully before sending
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Confirm Send
            </DialogTitle>
            <DialogDescription>
              You are about to send a notification to <strong>{targetLabel.toLowerCase()}</strong>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{message}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSend}>
              <Send className="size-4" />
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

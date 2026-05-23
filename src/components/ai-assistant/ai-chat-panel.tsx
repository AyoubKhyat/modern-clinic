"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  X,
  FileText,
  ClipboardList,
  User,
  Lightbulb,
  Send,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { visitsApi, patientsApi, aiApi } from "@/lib/api"
import type { Visit, Patient } from "@/types"

interface Message {
  role: "user" | "assistant"
  content: string
}

const TOOLS = [
  { id: "summarize", label: "Summarize Visit", icon: FileText, color: "text-blue-500" },
  { id: "soap", label: "SOAP Note", icon: ClipboardList, color: "text-violet-500" },
  { id: "recap", label: "Patient Recap", icon: User, color: "text-emerald-500" },
  { id: "next-steps", label: "Next Steps", icon: Lightbulb, color: "text-amber-500" },
] as const

type ToolId = (typeof TOOLS)[number]["id"]

export function AiChatPanel({ initialTool }: { initialTool?: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [displayedText, setDisplayedText] = useState("")
  const [contextType, setContextType] = useState<"visit" | "patient">("visit")
  const [contextItems, setContextItems] = useState<Array<{ id: number; label: string }>>([])
  const [selectedContextId, setSelectedContextId] = useState<number | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [freeInput, setFreeInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fullTextRef = useRef("")

  useEffect(() => {
    if (initialTool && !open) setOpen(true)
  }, [initialTool, open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, displayedText])

  const fetchContextItems = useCallback(async (type: "visit" | "patient") => {
    setLoadingContext(true)
    try {
      if (type === "visit") {
        const res = await visitsApi.list({ per_page: 20 })
        const visits: Visit[] = res.data.data ?? res.data
        setContextItems(visits.map((v) => ({
          id: v.id,
          label: `#${v.id} — ${v.patient?.first_name ?? "?"} ${v.patient?.last_name ?? ""} (${v.status})`,
        })))
      } else {
        const res = await patientsApi.list({ per_page: 20 })
        const patients: Patient[] = res.data.data ?? res.data
        setContextItems(patients.map((p) => ({
          id: p.id,
          label: `${p.first_name} ${p.last_name}`,
        })))
      }
    } catch {
      setContextItems([])
    }
    setLoadingContext(false)
  }, [])

  useEffect(() => {
    if (open) fetchContextItems(contextType)
  }, [open, contextType, fetchContextItems])

  const typeText = useCallback((text: string) => {
    fullTextRef.current = text
    setIsTyping(true)
    setDisplayedText("")
    let i = 0
    const interval = setInterval(() => {
      i += 3
      if (i >= text.length) {
        setDisplayedText(text)
        setIsTyping(false)
        clearInterval(interval)
      } else {
        setDisplayedText(text.slice(0, i))
      }
    }, 12)
    return () => clearInterval(interval)
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }])
    try {
      const context: { visitId?: number; patientId?: number } = {}
      if (selectedContextId) {
        if (contextType === "visit") context.visitId = selectedContextId
        else context.patientId = selectedContextId
      }
      const { data } = await aiApi.chat(message, context)
      setMessages((prev) => [...prev, { role: "assistant", content: "" }])
      typeText(data.response)
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to get a response. Make sure the backend is running.",
      }])
    }
  }, [selectedContextId, contextType, typeText])

  const runTool = useCallback((toolId: ToolId) => {
    if (!selectedContextId) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Please select a context item first (visit or patient) from the dropdown above.",
      }])
      return
    }
    const toolLabel = TOOLS.find((t) => t.id === toolId)?.label ?? toolId
    const messageMap: Record<ToolId, string> = {
      summarize: "Summarize this visit",
      soap: "Generate a SOAP note",
      recap: "Give me a patient recap",
      "next-steps": "Recommend next steps",
    }
    sendMessage(messageMap[toolId] || toolLabel)
  }, [selectedContextId, sendMessage])

  function handleFreeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!freeInput.trim() || isTyping) return
    sendMessage(freeInput.trim())
    setFreeInput("")
  }

  useEffect(() => {
    if (!isTyping && displayedText && messages.length > 0) {
      setMessages((prev) => {
        const copy = [...prev]
        if (copy[copy.length - 1]?.role === "assistant") {
          copy[copy.length - 1] = { role: "assistant", content: displayedText }
        }
        return copy
      })
    }
  }, [isTyping, displayedText, messages.length])

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          data-ai-fab
          onClick={() => setOpen((v) => !v)}
          className="group relative size-14 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 p-0 shadow-lg shadow-teal-500/20 transition-all hover:shadow-xl hover:shadow-teal-500/30"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="size-5 text-white" />
              </motion.div>
            ) : (
              <motion.div key="sparkle" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Sparkles className="size-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          {!open && (
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-300 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-teal-400" />
            </span>
          )}
        </Button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex h-dvh flex-col overflow-hidden bg-popover/80 shadow-2xl ring-1 ring-foreground/10 backdrop-blur-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[520px] sm:w-[400px] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl dark:bg-popover/90"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/20 to-blue-500/20">
                <Sparkles className="size-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">AI Assistant</h3>
                <p className="text-[10px] text-muted-foreground/60">Context-aware clinic assistant</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setOpen(false)}>
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2">
              <select
                className="h-7 rounded-md border border-border/50 bg-muted/30 px-2 text-xs outline-none"
                value={contextType}
                onChange={(e) => { setContextType(e.target.value as "visit" | "patient"); setSelectedContextId(null) }}
              >
                <option value="visit">Visit</option>
                <option value="patient">Patient</option>
              </select>
              <div className="relative flex-1">
                <select
                  className="h-7 w-full appearance-none rounded-md border border-border/50 bg-muted/30 px-2 pr-6 text-xs outline-none"
                  value={selectedContextId ?? ""}
                  onChange={(e) => setSelectedContextId(Number(e.target.value) || null)}
                  disabled={loadingContext}
                >
                  <option value="">{loadingContext ? "Loading..." : `Select ${contextType}...`}</option>
                  {contextItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
                    <Sparkles className="size-6 text-teal-500/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/70">Smart Clinic Assistant</p>
                    <p className="mt-1 text-xs text-muted-foreground/50">Select a context above, then pick a tool or type a message</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((msg, i) => {
                    const isLast = i === messages.length - 1
                    const showTyping = isLast && msg.role === "assistant" && isTyping
                    return (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-teal-500/10 text-teal-800 dark:text-teal-200" : "bg-muted/50 text-foreground/80"}`}>
                          {showTyping ? displayedText : msg.content}
                          {showTyping && <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-foreground/50" />}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border/40 px-3 py-2">
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    disabled={isTyping}
                    onClick={() => runTool(tool.id)}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5 text-left text-[11px] transition-all hover:bg-muted/60 disabled:opacity-40"
                  >
                    <tool.icon className={`size-3 shrink-0 ${tool.color}`} />
                    <span className="truncate font-medium">{tool.label}</span>
                  </button>
                ))}
              </div>
              <form onSubmit={handleFreeSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about the selected context..."
                  className="h-8 flex-1 rounded-lg border border-border/40 bg-muted/20 px-3 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-teal-500/30"
                  value={freeInput}
                  onChange={(e) => setFreeInput(e.target.value)}
                  disabled={isTyping}
                />
                <Button type="submit" size="icon-xs" disabled={isTyping || !freeInput.trim()} className="size-8 rounded-lg bg-teal-500 text-white hover:bg-teal-600">
                  <Send className="size-3" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Search, MessageSquare, ArrowLeft, User } from "lucide-react"
import { messagesApi } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/toast"

/* ── Types ── */

interface Conversation {
  id: number
  name: string
  role: string
  avatar: string | null
  last_message: string
  last_message_at: string
  unread_count: number
}

interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  created_at: string
}

/* ── Helpers ── */

const GLASS =
  "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "admin":
      return "destructive" as const
    case "doctor":
      return "default" as const
    default:
      return "secondary" as const
  }
}

/* ── Animation variants ── */

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 350, damping: 30 } },
  exit: { opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.15 } },
}

const listItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, type: "spring" as const, stiffness: 300, damping: 28 },
  }),
}

/* ── Page Component ── */

export default function ChatPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  /* ── State ── */
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ── Fetch conversations ── */
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await messagesApi.conversations()
      setConversations(data)
    } catch {
      toast("Failed to load conversations", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  /* ── Fetch messages for active conversation ── */
  const fetchMessages = useCallback(async (userId: number) => {
    try {
      const { data } = await messagesApi.get(userId)
      setMessages(data)
    } catch {
      toast("Failed to load messages", "error")
    }
  }, [toast])

  /* ── Initial load ── */
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  /* ── Load messages when conversation changes ── */
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id)
    }
  }, [activeConversation, fetchMessages])

  /* ── Poll for new messages every 5s ── */
  useEffect(() => {
    if (!activeConversation) return
    const interval = setInterval(() => {
      fetchMessages(activeConversation.id)
      fetchConversations()
    }, 5000)
    return () => clearInterval(interval)
  }, [activeConversation, fetchMessages, fetchConversations])

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || !activeConversation || sending) return
    const content = messageInput.trim()
    setMessageInput("")
    setSending(true)
    try {
      const { data: newMsg } = await messagesApi.send(activeConversation.id, content)
      setMessages((prev) => [...prev, newMsg])
      fetchConversations()
    } catch {
      toast("Failed to send message", "error")
      setMessageInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [messageInput, activeConversation, sending, toast, fetchConversations])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Select conversation ── */
  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv)
    setMobileShowChat(true)
  }

  /* ── Filtered conversations ── */
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter((c) => c.name.toLowerCase().includes(q))
  }, [conversations, searchQuery])

  /* ── Conversation List Panel ── */
  const ConversationList = (
    <div className={`flex h-full flex-col rounded-2xl bg-card ${GLASS}`}>
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-0.5 px-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv, i) => (
              <motion.button
                key={conv.id}
                custom={i}
                variants={listItemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => selectConversation(conv)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60 ${
                  activeConversation?.id === conv.id
                    ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                  {conv.name.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{conv.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant={roleBadgeVariant(conv.role)} className="text-[10px] px-1.5 h-4">
                      {conv.role}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conv.last_message || "No messages yet"}
                  </p>
                </div>

                {/* Unread count */}
                {conv.unread_count > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                    {conv.unread_count}
                  </span>
                )}
              </motion.button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )

  /* ── Chat Area Panel ── */
  const ChatArea = activeConversation ? (
    <div className={`flex h-full flex-col rounded-2xl bg-card ${GLASS}`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {/* Back button (mobile) */}
        <button
          onClick={() => setMobileShowChat(false)}
          className="shrink-0 rounded-lg p-1.5 hover:bg-muted md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
          {activeConversation.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-tight">{activeConversation.name}</h2>
          <Badge variant={roleBadgeVariant(activeConversation.role)} className="mt-0.5 text-[10px] px-1.5 h-4">
            {activeConversation.role}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 p-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isSent = msg.sender_id === user?.id
              return (
                <motion.div
                  key={msg.id}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isSent
                        ? "bg-teal-600 text-white"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isSent ? "text-teal-100" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageInput.trim() || sending}
            className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  ) : (
    /* Empty state */
    <div className={`flex h-full flex-col items-center justify-center rounded-2xl bg-card ${GLASS}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-3 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/30">
          <MessageSquare className="h-8 w-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-semibold">Select a conversation</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Choose a conversation from the list to start messaging your colleagues.
        </p>
      </motion.div>
    </div>
  )

  /* ── Render ── */
  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Staff Chat"
        description="Communicate with your team members"
      />

      <div className="relative flex flex-1 gap-4 overflow-hidden">
        {/* Desktop: side-by-side */}
        {/* Mobile: toggle between list and chat */}

        {/* Conversation list */}
        <div
          className={`h-full w-full shrink-0 md:w-80 md:block ${
            mobileShowChat ? "hidden" : "block"
          }`}
        >
          {ConversationList}
        </div>

        {/* Chat area */}
        <div
          className={`h-full flex-1 md:block ${
            mobileShowChat ? "block" : "hidden"
          }`}
        >
          {ChatArea}
        </div>
      </div>
    </div>
  )
}

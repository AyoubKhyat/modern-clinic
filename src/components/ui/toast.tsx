"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  dismiss: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = crypto.randomUUID()
      setToasts((prev) => {
        const next = [...prev, { id, message, variant }]
        return next.length > 3 ? next.slice(-3) : next
      })

      const duration = variant === "error" ? 5000 : 3000
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  return (
    <ToastContext value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  )
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    border: "border-l-2 border-teal-500",
    iconColor: "text-teal-500",
  },
  error: {
    icon: XCircle,
    border: "border-l-2 border-red-500",
    iconColor: "text-red-500",
  },
  info: {
    icon: Info,
    border: "border-l-2 border-blue-500",
    iconColor: "text-blue-500",
  },
}

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="fixed bottom-6 left-3 right-3 z-50 flex flex-col-reverse gap-2 sm:left-6 sm:right-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const config = variantConfig[t.variant]
          const Icon = config.icon
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={`flex w-full items-center gap-3 rounded-xl bg-popover/80 px-4 py-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur-xl sm:w-auto dark:bg-popover/90 ${config.border}`}
            >
              <Icon className={`size-4 shrink-0 ${config.iconColor}`} />
              <p className="text-sm font-medium">{t.message}</p>
              <button
                onClick={() => onDismiss(t.id)}
                className="ml-2 shrink-0 text-muted-foreground/40 transition-colors hover:text-foreground/60"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

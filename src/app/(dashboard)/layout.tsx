"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useAuthStore } from "@/stores/auth-store"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/components/ui/skeleton"
import { CommandPalette } from "@/components/command-palette/command-palette"
import { AiChatPanel } from "@/components/ai-assistant/ai-chat-panel"
import { ToastProvider } from "@/components/ui/toast"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { I18nProvider } from "@/lib/i18n"

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("sidebar-collapsed") === "true"
  })

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }, [])

  const set = useCallback((v: boolean) => {
    setCollapsed(v)
    localStorage.setItem("sidebar-collapsed", String(v))
  }, [])

  return (
    <SidebarContext value={{ collapsed, toggle, setCollapsed: set }}>
      {children}
    </SidebarContext>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCmdPaletteOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <ThemeProvider defaultTheme="system">
      <AuthGuard>
        <I18nProvider>
        <SidebarProvider>
          <ToastProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header onOpenCommandPalette={() => setCmdPaletteOpen(true)} />
                <main className="flex-1 overflow-y-auto">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="mx-auto max-w-7xl px-4 py-6 lg:px-8"
                  >
                    {children}
                  </motion.div>
                </main>
              </div>
            </div>
            <CommandPalette open={cmdPaletteOpen} onOpenChange={setCmdPaletteOpen} />
            <AiChatPanel />
            <WelcomeModal />
          </ToastProvider>
        </SidebarProvider>
        </I18nProvider>
      </AuthGuard>
    </ThemeProvider>
  )
}

"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: Theme
  enableSystem?: boolean
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? defaultTheme
  })
  const [resolvedTheme, setResolved] = useState<"light" | "dark">(() =>
    theme === "system" ? getSystemTheme() : theme
  )

  const applyTheme = useCallback((t: Theme) => {
    const resolved = t === "system" ? getSystemTheme() : t
    setResolved(resolved)
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolved)
    root.style.colorScheme = resolved
  }, [])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      localStorage.setItem(STORAGE_KEY, t)
      applyTheme(t)
    },
    [applyTheme]
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme, applyTheme])

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [theme, setTheme, resolvedTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}

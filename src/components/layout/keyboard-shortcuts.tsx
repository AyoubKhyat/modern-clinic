"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const shortcuts = [
  { keys: ["Ctrl", "K"], alt: ["Cmd", "K"], description: "Search" },
  { keys: ["Ctrl", "N"], description: "New appointment" },
  { keys: ["Ctrl", "Shift", "P"], description: "New patient" },
  { keys: ["Ctrl", ","], description: "Settings" },
  { keys: ["?"], description: "Show shortcuts" },
  { keys: ["Esc"], description: "Close dialog" },
  { keys: ["1", "-", "9"], description: "Navigate to sidebar item" },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "?" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)
        )
      ) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {shortcut.alt && (
                  <>
                    {shortcut.alt.map((key, i) => (
                      <span key={`alt-${i}`} className="contents">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">+</span>
                        )}
                        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                          {key}
                        </kbd>
                      </span>
                    ))}
                    <span className="mx-1 text-xs text-muted-foreground">/</span>
                  </>
                )}
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="contents">
                    {i > 0 && key !== "-" && shortcut.keys[i - 1] !== "-" && (
                      <span className="text-xs text-muted-foreground">+</span>
                    )}
                    {key === "-" ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {key}
                      </kbd>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

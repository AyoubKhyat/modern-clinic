"use client"

import { motion } from "framer-motion"
import {
  Sparkles,
  FileText,
  ClipboardList,
  User,
  Lightbulb,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const AI_FEATURES = [
  {
    id: "summarize",
    title: "Summarize Visit",
    description: "Generate a concise summary of the current consultation",
    icon: FileText,
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderGradient: "from-blue-500/30 to-cyan-500/30",
  },
  {
    id: "soap",
    title: "Generate SOAP Note",
    description: "Create a structured SOAP note from visit data",
    icon: ClipboardList,
    gradient: "from-violet-500/20 to-purple-500/20",
    borderGradient: "from-violet-500/30 to-purple-500/30",
  },
  {
    id: "recap",
    title: "Patient Recap",
    description: "Compile patient history and current visit summary",
    icon: User,
    gradient: "from-emerald-500/20 to-teal-500/20",
    borderGradient: "from-emerald-500/30 to-teal-500/30",
  },
  {
    id: "next-steps",
    title: "Suggest Next Steps",
    description: "Get follow-up suggestions based on visit data",
    icon: Lightbulb,
    gradient: "from-amber-500/20 to-orange-500/20",
    borderGradient: "from-amber-500/30 to-orange-500/30",
  },
]

export function AiPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-violet-500" />
              AI Assistant
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
              Beta
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {AI_FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
            >
              <button
                className={`group relative w-full rounded-lg bg-gradient-to-br ${feature.gradient} p-[1px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
                onClick={() => {
                  const el = document.querySelector<HTMLButtonElement>("[data-ai-fab]")
                  el?.click()
                }}
              >
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${feature.borderGradient} opacity-50 transition-opacity group-hover:opacity-80`} />
                <div className="relative flex items-start gap-3 rounded-lg bg-background/80 p-3 backdrop-blur-sm">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-teal-500/10 to-blue-500/10">
                    <feature.icon className="size-4 text-foreground/70" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{feature.title}</span>
                      <ArrowRight className="size-3 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60" />
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}

          <p className="mt-2 text-center text-xs text-muted-foreground/50">
            Click a tool or use the AI button at bottom-right
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

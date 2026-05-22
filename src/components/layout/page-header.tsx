import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-teal-500/[0.04] via-blue-500/[0.04] to-indigo-500/[0.04] px-5 py-4 dark:from-teal-500/[0.03] dark:via-blue-500/[0.03] dark:to-indigo-500/[0.03]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2 sm:mt-0">{action}</div>}
    </div>
  )
}

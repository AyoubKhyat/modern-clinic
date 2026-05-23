"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { format, parseISO } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  UserPlus,
  Calendar,
  CreditCard,
  Trash2,
  Edit,
  Database,
  ClipboardList,
} from "lucide-react"
import { auditLogApi } from "@/lib/api"
import type { PaginatedResponse } from "@/types"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeletons"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

interface AuditEntry {
  id: number
  user_id: number
  user_name: string
  action: string
  entity: string
  entity_id?: number
  detail?: string
  created_at: string
}

const actionIcons: Record<string, typeof LogIn> = {
  login: LogIn,
  create: UserPlus,
  update: Edit,
  delete: Trash2,
  backup: Database,
}

const actionColors: Record<string, string> = {
  login: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  create: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  update: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  backup: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<AuditEntry>["meta"] | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await auditLogApi.list({ page })
      setEntries(data.data ?? [])
      setMeta(data.meta ?? null)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        description="Track all actions performed in the system"
      />

      {loading ? (
        <TableSkeleton columns={5} />
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
            <ClipboardList className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No audit entries yet</p>
          <p className="text-sm text-muted-foreground">Actions will appear here as they happen.</p>
        </motion.div>
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="hidden md:table-cell">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => {
                  const Icon = actionIcons[entry.action] ?? ClipboardList
                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(entry.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {entry.user_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`inline-flex items-center gap-1 capitalize ${actionColors[entry.action] ?? ""}`}
                        >
                          <Icon className="size-3" />
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {entry.entity}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell max-w-[300px] truncate">
                        {entry.detail || "—"}
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {meta.last_page} ({meta.total} entries)
              </p>
              <div className="inline-flex items-center gap-1">
                <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon-sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

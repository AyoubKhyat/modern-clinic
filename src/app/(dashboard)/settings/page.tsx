"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  User,
  Info,
  PanelLeftClose,
  Shield,
  Mail,
  Briefcase,
  Building2,
  Database,
  Download,
  Upload,
  Loader2,
  Lock,
  Wand2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Table2,
} from "lucide-react"
import { useTheme } from "@/components/layout/theme-provider"
import { useAuthStore } from "@/stores/auth-store"
import { backupApi, passwordApi, seedApi, importApi } from "@/lib/api"
import { useI18n, localeLabels, type Locale } from "@/lib/i18n"
import { useSidebar } from "@/app/(dashboard)/layout"
import { useToast } from "@/components/ui/toast"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const GLASS = "border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]"

const themes = [
  { value: "light" as const, label: "Light", icon: Sun, description: "Classic light appearance" },
  { value: "dark" as const, label: "Dark", icon: Moon, description: "Easy on the eyes" },
  { value: "system" as const, label: "System", icon: Monitor, description: "Match your OS" },
]

const techStack = [
  { name: "Next.js 16", color: "bg-black text-white dark:bg-white dark:text-black" },
  { name: "React 19", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { name: "Tailwind CSS 4", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  { name: "Base-UI", color: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  { name: "Framer Motion", color: "bg-pink-500/10 text-pink-700 dark:text-pink-300" },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuthStore()
  const { collapsed, setCollapsed } = useSidebar()
  const { toast } = useToast()
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Configure your preferences" />

      <Tabs defaultValue="appearance">
        <TabsList variant="line">
          <TabsTrigger value="appearance">
            <Palette className="size-3.5" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="size-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="size-3.5" />
            About
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="data">
              <Database className="size-3.5" />
              Data
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="appearance" className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex max-w-2xl flex-col gap-6"
          >
            <Card className={GLASS}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Theme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {themes.map((t) => {
                    const isActive = theme === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => {
                          setTheme(t.value)
                          toast(`Theme set to ${t.label}`)
                        }}
                        className={`flex flex-col items-center gap-2 rounded-xl p-4 ring-1 transition-all duration-200 ${
                          isActive
                            ? "bg-teal-500/[0.08] ring-2 ring-teal-500 shadow-sm"
                            : "ring-foreground/[0.06] hover:bg-muted/30 hover:ring-foreground/10 dark:ring-foreground/[0.04]"
                        }`}
                      >
                        <div
                          className={`flex size-10 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-teal-500/15"
                              : "bg-muted/50"
                          }`}
                        >
                          <t.icon
                            className={`size-5 ${
                              isActive
                                ? "text-teal-600 dark:text-teal-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <span className="text-sm font-medium">{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {t.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className={GLASS}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/10 to-blue-500/10">
                      <PanelLeftClose className="size-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Collapse sidebar by default
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Start with a compact sidebar on each visit
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={collapsed}
                    onCheckedChange={(checked) => {
                      setCollapsed(checked)
                      toast(checked ? "Sidebar collapsed" : "Sidebar expanded")
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={GLASS}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("settings.language")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(["en", "fr", "ar"] as Locale[]).map((l) => {
                    const isActive = locale === l
                    return (
                      <button
                        key={l}
                        onClick={() => {
                          setLocale(l)
                          toast(`Language set to ${localeLabels[l]}`)
                        }}
                        className={`flex flex-col items-center gap-1 rounded-xl p-4 ring-1 transition-all duration-200 ${
                          isActive
                            ? "bg-teal-500/[0.08] ring-2 ring-teal-500 shadow-sm"
                            : "ring-foreground/[0.06] hover:bg-muted/30 hover:ring-foreground/10 dark:ring-foreground/[0.04]"
                        }`}
                      >
                        <span className="text-lg">{l === "en" ? "🇬🇧" : l === "fr" ? "🇫🇷" : "🇲🇦"}</span>
                        <span className="text-sm font-medium">{localeLabels[l]}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="profile" className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex max-w-2xl flex-col gap-4"
          >
            <Card className={GLASS}>
              <CardContent className="flex flex-col gap-6 py-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-xl font-bold text-white shadow-lg">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {user?.name ?? "User"}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="mt-1 capitalize"
                    >
                      {user?.role ?? "—"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileRow icon={Mail} label="Email" value={user?.email} />
                  <ProfileRow
                    icon={Shield}
                    label="Role"
                    value={user?.role}
                    capitalize
                  />
                  {user?.employee?.specialty && (
                    <ProfileRow
                      icon={Briefcase}
                      label="Specialty"
                      value={user.employee.specialty}
                    />
                  )}
                  {user?.employee?.clinic?.name && (
                    <ProfileRow
                      icon={Building2}
                      label="Clinic"
                      value={user.employee.clinic.name}
                    />
                  )}
                  {user?.employee?.phone && (
                    <ProfileRow
                      icon={User}
                      label="Phone"
                      value={user.employee.phone}
                    />
                  )}
                  {user?.employee?.license_number && (
                    <ProfileRow
                      icon={Shield}
                      label="License"
                      value={user.employee.license_number}
                    />
                  )}
                </div>

                <p className="text-xs text-muted-foreground/50">
                  Profile information is managed by your administrator.
                </p>
              </CardContent>
            </Card>

            <PasswordChangeForm />
          </motion.div>
        </TabsContent>

        <TabsContent value="about" className="pt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl"
          >
            <Card className={GLASS}>
              <CardContent className="flex flex-col items-center gap-5 py-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg">
                  <span className="text-2xl font-bold text-white">M</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    Modern AI Clinic OS
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Version 1.0.0
                  </p>
                </div>

                <p className="max-w-sm text-sm text-muted-foreground">
                  A modern clinic management system with AI-assisted workflows,
                  real-time dashboards, and an intuitive interface.
                </p>

                <Separator className="my-1" />

                <div>
                  <p className="mb-3 text-xs font-medium text-muted-foreground">
                    Built with
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {techStack.map((tech) => (
                      <Badge
                        key={tech.name}
                        variant="secondary"
                        className={`text-xs ${tech.color}`}
                      >
                        {tech.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        {user?.role === "admin" && (
          <TabsContent value="data" className="pt-4">
            <DataTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function PasswordChangeForm() {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      await passwordApi.change(currentPassword, newPassword)
      toast("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast("Failed to change password", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={GLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lock className="size-4" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="self-start">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DataTab() {
  const { toast } = useToast()
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleBackup() {
    setBackingUp(true)
    try {
      const { data } = await backupApi.download()
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = `clinic-backup-${new Date().toISOString().slice(0, 10)}.db`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast("Backup downloaded")
    } catch {
      toast("Backup failed", "error")
    } finally {
      setBackingUp(false)
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    try {
      await backupApi.restore(file)
      toast("Database restored successfully")
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toast("Restore failed — invalid database file", "error")
    } finally {
      setRestoring(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex max-w-2xl flex-col gap-4"
    >
      <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Database Backup</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Download a complete backup of your clinic database. This includes all patients, appointments, visits, prescriptions, and payments.
          </p>
          <Button variant="outline" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {backingUp ? "Downloading..." : "Download Backup"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-red-500/10 dark:ring-red-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-red-600 dark:text-red-400">Restore Database</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Upload a previously downloaded backup file to restore your database. This will replace all current data.
          </p>
          <input ref={fileRef} type="file" accept=".db" onChange={handleRestore} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={restoring} className="border-red-500/20 text-red-600 hover:bg-red-500/5 dark:text-red-400">
            {restoring ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {restoring ? "Restoring..." : "Upload & Restore"}
          </Button>
        </CardContent>
      </Card>

      <SeedDataCard />
      <CsvImportCard />
    </motion.div>
  )
}

function SeedDataCard() {
  const { toast } = useToast()
  const [count, setCount] = useState(20)
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    try {
      const { data } = await seedApi.generate(count)
      toast(data.message ?? `Generated ${count} demo records`)
    } catch {
      toast("Failed to generate demo data", "error")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wand2 className="size-4" />
          Generate Demo Data
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Populate the database with realistic demo patients, appointments, and visits for testing purposes.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Number of records</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-28"
            />
          </div>
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seeding} className="self-start">
          {seeding ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {seeding ? "Generating..." : "Generate"}
        </Button>
      </CardContent>
    </Card>
  )
}

// --- CSV helpers ---

const PATIENT_FIELDS = ["first_name", "last_name", "phone", "email", "gender", "date_of_birth", "address", "blood_type"] as const
const APPOINTMENT_FIELDS = ["patient_id", "scheduled_at", "doctor_id", "duration_minutes", "type", "reason"] as const

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(",").map((h) => h.trim())
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim())
    const record: Record<string, string> = {}
    headers.forEach((h, i) => {
      record[h] = values[i] ?? ""
    })
    return record
  })
  return { headers, rows }
}

function matchColumns(csvHeaders: string[], expectedFields: readonly string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const field of expectedFields) {
    const match = csvHeaders.find((h) => h.toLowerCase().replace(/\s+/g, "_") === field)
    if (match) mapping[field] = match
  }
  return mapping
}

function mapRows(rows: Record<string, string>[], columnMapping: Record<string, string>): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const [field, csvHeader] of Object.entries(columnMapping)) {
      if (row[csvHeader] !== undefined) mapped[field] = row[csvHeader]
    }
    return mapped
  })
}

function CsvImportSection({
  title,
  expectedFields,
  onImport,
}: {
  title: string
  expectedFields: readonly string[]
  onImport: (rows: Record<string, string>[]) => Promise<{ imported: number; skipped: number; total: number }>
}) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState("")

  function reset() {
    setCsvHeaders([])
    setCsvRows([])
    setColumnMapping({})
    setResult(null)
    setError("")
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null)
    setError("")
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      setError("Please select a valid .csv file")
      if (fileRef.current) fileRef.current.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string
        const { headers, rows } = parseCsv(text)
        if (headers.length === 0 || rows.length === 0) {
          setError("CSV file is empty or contains no data rows")
          return
        }
        setCsvHeaders(headers)
        setCsvRows(rows)
        const mapping = matchColumns(headers, expectedFields)
        setColumnMapping(mapping)
      } catch {
        setError("Failed to parse CSV file")
      }
    }
    reader.onerror = () => setError("Failed to read file")
    reader.readAsText(file)
  }

  async function handleImport() {
    if (csvRows.length === 0) return
    if (Object.keys(columnMapping).length === 0) {
      toast("No columns matched. Check your CSV headers.", "error")
      return
    }

    setImporting(true)
    setError("")
    try {
      const mapped = mapRows(csvRows, columnMapping)
      const res = await onImport(mapped)
      setResult({ imported: res.imported, skipped: res.skipped })
      toast(`${res.imported} imported, ${res.skipped} skipped`)
    } catch {
      toast(`Failed to import ${title.toLowerCase()}`, "error")
    } finally {
      setImporting(false)
    }
  }

  const previewRows = csvRows.slice(0, 5)
  const matchedCount = Object.keys(columnMapping).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {csvRows.length > 0 && (
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted/50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80 file:cursor-pointer file:transition-colors"
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {csvRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Table2 className="size-3.5" />
              {csvRows.length} row{csvRows.length !== 1 && "s"} detected
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400" />
              {matchedCount}/{expectedFields.length} columns matched
            </span>
          </div>

          {/* Column mapping */}
          <div className="flex flex-wrap gap-1.5">
            {expectedFields.map((field) => {
              const matched = field in columnMapping
              return (
                <Badge
                  key={field}
                  variant="secondary"
                  className={
                    matched
                      ? "bg-teal-500/10 text-teal-700 dark:text-teal-300"
                      : "bg-muted/50 text-muted-foreground line-through"
                  }
                >
                  {field}
                </Badge>
              )
            })}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-foreground/[0.06] bg-muted/30 dark:border-foreground/[0.04]">
                  {csvHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-foreground/[0.04] last:border-0">
                    {csvHeaders.map((h) => (
                      <td key={h} className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                        {row[h] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvRows.length > 5 && (
            <p className="text-xs text-muted-foreground">
              Showing first 5 of {csvRows.length} rows
            </p>
          )}

          {result ? (
            <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="size-4" />
              {result.imported} imported, {result.skipped} skipped
            </div>
          ) : (
            <Button variant="outline" onClick={handleImport} disabled={importing} className="self-start">
              {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {importing ? "Importing..." : `Import ${csvRows.length} row${csvRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  )
}

function CsvImportCard() {
  return (
    <Card className={GLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="size-4" />
          Import Data
        </CardTitle>
        <p className="text-xs text-muted-foreground">Import patients or appointments from CSV</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <CsvImportSection
          title="Import Patients"
          expectedFields={PATIENT_FIELDS}
          onImport={async (rows) => {
            const { data } = await importApi.patients(rows)
            return data
          }}
        />
        <Separator />
        <CsvImportSection
          title="Import Appointments"
          expectedFields={APPOINTMENT_FIELDS}
          onImport={async (rows) => {
            const { data } = await importApi.appointments(rows)
            return data
          }}
        />
      </CardContent>
    </Card>
  )
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${capitalize ? "capitalize" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  )
}

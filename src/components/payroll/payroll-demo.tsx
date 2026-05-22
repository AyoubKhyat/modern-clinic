"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AnimatedCounter,
  containerVariants,
  itemVariants,
} from "@/lib/chart-utils"

const MOCK_EMPLOYEES = [
  { id: 1, name: "Dr. Amina Tazi", role: "Doctor", specialty: "General Medicine", baseSalary: 25000, bonus: 3000, deductions: 2500, netSalary: 25500, status: "paid" as const, paidAt: "2026-05-01" },
  { id: 2, name: "Dr. Youssef El Idrissi", role: "Doctor", specialty: "Pediatrics", baseSalary: 28000, bonus: 2000, deductions: 3000, netSalary: 27000, status: "pending" as const, paidAt: null },
  { id: 3, name: "Fatima Zahra Bennani", role: "Receptionist", specialty: null, baseSalary: 8000, bonus: 500, deductions: 800, netSalary: 7700, status: "paid" as const, paidAt: "2026-05-01" },
  { id: 4, name: "Dr. Karim Ouazzani", role: "Doctor", specialty: "Cardiology", baseSalary: 32000, bonus: 4000, deductions: 3500, netSalary: 32500, status: "pending" as const, paidAt: null },
  { id: 5, name: "Nadia Alaoui", role: "Nurse", specialty: null, baseSalary: 12000, bonus: 1000, deductions: 1200, netSalary: 11800, status: "paid" as const, paidAt: "2026-05-01" },
  { id: 6, name: "Omar Chraibi", role: "Accountant", specialty: null, baseSalary: 15000, bonus: 1500, deductions: 1500, netSalary: 15000, status: "paid" as const, paidAt: "2026-05-01" },
]

export function PayrollDemo() {
  const totalPayroll = MOCK_EMPLOYEES.reduce((s, e) => s + e.netSalary, 0)
  const paidCount = MOCK_EMPLOYEES.filter((e) => e.status === "paid").length
  const pendingCount = MOCK_EMPLOYEES.filter(
    (e) => e.status === "pending"
  ).length

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Monthly Overview banner card */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 bg-gradient-to-r from-teal-500/[0.08] via-blue-500/[0.06] to-indigo-500/[0.05] shadow-sm ring-1 ring-teal-500/10 dark:from-teal-500/[0.06]">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                May 2026 — Total Payroll
              </p>
              <p className="text-3xl font-bold tracking-tight">
                <AnimatedCounter value={totalPayroll} isCurrency />
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {paidCount}
                </p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {pendingCount}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Table */}
      <motion.div variants={itemVariants}>
        <div className="overflow-hidden rounded-xl border-0 ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">
                  Base Salary
                </TableHead>
                <TableHead className="hidden lg:table-cell">Bonus</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Deductions
                </TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_EMPLOYEES.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{emp.name}</span>
                      {emp.specialty && (
                        <p className="text-xs text-muted-foreground">
                          {emp.specialty}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {emp.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {emp.baseSalary.toLocaleString("fr-MA")} MAD
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-emerald-600 dark:text-emerald-400">
                    +{emp.bonus.toLocaleString("fr-MA")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-red-600 dark:text-red-400">
                    -{emp.deductions.toLocaleString("fr-MA")}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {emp.netSalary.toLocaleString("fr-MA")} MAD
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={emp.status === "paid" ? "default" : "outline"}
                      className="capitalize"
                    >
                      {emp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </motion.div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Package, AlertTriangle, DollarSign } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

const MOCK_INVENTORY = [
  { id: 1, name: "Amoxicillin 500mg", category: "Antibiotic", stock: 245, minStock: 50, unit: "capsules", unitPrice: 12, supplier: "PharmaMed", expiresAt: "2027-03-15" },
  { id: 2, name: "Paracetamol 500mg", category: "Analgesic", stock: 18, minStock: 100, unit: "tablets", unitPrice: 5, supplier: "MedSupply", expiresAt: "2026-11-20" },
  { id: 3, name: "Ibuprofen 400mg", category: "Anti-inflammatory", stock: 320, minStock: 80, unit: "tablets", unitPrice: 8, supplier: "PharmaMed", expiresAt: "2027-06-10" },
  { id: 4, name: "Omeprazole 20mg", category: "Gastrointestinal", stock: 12, minStock: 40, unit: "capsules", unitPrice: 15, supplier: "GastroPharm", expiresAt: "2026-09-30" },
  { id: 5, name: "Metformin 850mg", category: "Antidiabetic", stock: 180, minStock: 60, unit: "tablets", unitPrice: 10, supplier: "DiabetiCare", expiresAt: "2027-01-15" },
  { id: 6, name: "Amlodipine 5mg", category: "Cardiovascular", stock: 95, minStock: 30, unit: "tablets", unitPrice: 18, supplier: "CardioMed", expiresAt: "2027-08-20" },
  { id: 7, name: "Cetirizine 10mg", category: "Antihistamine", stock: 8, minStock: 50, unit: "tablets", unitPrice: 7, supplier: "AllergyFree", expiresAt: "2026-12-01" },
  { id: 8, name: "Azithromycin 250mg", category: "Antibiotic", stock: 65, minStock: 25, unit: "capsules", unitPrice: 22, supplier: "PharmaMed", expiresAt: "2027-04-18" },
  { id: 9, name: "Diclofenac Gel 1%", category: "Topical", stock: 42, minStock: 20, unit: "tubes", unitPrice: 35, supplier: "DermaCare", expiresAt: "2027-02-28" },
  { id: 10, name: "Salbutamol Inhaler", category: "Respiratory", stock: 5, minStock: 15, unit: "inhalers", unitPrice: 85, supplier: "RespiraMed", expiresAt: "2026-10-15" },
]

export function InventoryDemo() {
  const [search, setSearch] = useState("")

  const filtered = MOCK_INVENTORY.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = MOCK_INVENTORY.filter(
    (i) => i.stock < i.minStock
  ).length
  const totalValue = MOCK_INVENTORY.reduce(
    (s, i) => s + i.stock * i.unitPrice,
    0
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Stat cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Items */}
        <Card className="border-0 bg-gradient-to-br from-blue-500/[0.08] to-indigo-500/[0.05] shadow-sm ring-1 ring-blue-500/10 dark:from-blue-500/[0.06] dark:to-indigo-500/[0.04]">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Package className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold tracking-tight">
                <AnimatedCounter value={MOCK_INVENTORY.length} />
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-0 bg-gradient-to-br from-red-500/[0.08] to-rose-500/[0.05] shadow-sm ring-1 ring-red-500/10 dark:from-red-500/[0.06] dark:to-rose-500/[0.04]">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
              <p className="text-2xl font-bold tracking-tight">
                <AnimatedCounter value={lowStockCount} />
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="border-0 bg-gradient-to-br from-emerald-500/[0.08] to-green-500/[0.05] shadow-sm ring-1 ring-emerald-500/10 dark:from-emerald-500/[0.06] dark:to-green-500/[0.04]">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <DollarSign className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold tracking-tight">
                <AnimatedCounter value={totalValue} isCurrency />
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search medications or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <div className="overflow-hidden rounded-xl border-0 ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="hidden md:table-cell">Unit Price</TableHead>
                <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                <TableHead className="hidden lg:table-cell">Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isLow = item.stock < item.minStock
                const stockPercent = Math.min(
                  (item.stock / item.minStock) * 100,
                  100
                )
                const barColor =
                  stockPercent < 30
                    ? "bg-red-500"
                    : stockPercent < 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"

                return (
                  <TableRow
                    key={item.id}
                    className={isLow ? "bg-red-500/[0.03]" : ""}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {isLow && (
                          <Badge
                            variant="destructive"
                            className="ml-2 text-[10px]"
                          >
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.stock} / {item.minStock}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.unitPrice} MAD
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {item.supplier}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {format(parseISO(item.expiresAt), "MMM yyyy")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </motion.div>
  )
}

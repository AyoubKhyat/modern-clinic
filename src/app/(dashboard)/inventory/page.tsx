"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { inventoryApi } from "@/lib/api"
import type { PaginatedResponse } from "@/types"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from "@/components/ui/skeletons"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InventoryItem {
  id: number
  name: string
  sku: string
  category: string
  quantity: number
  min_quantity: number
  unit: string
  unit_price: number
  supplier: string
  expiry_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Category = "all" | "medication" | "supplies" | "equipment"

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "medication", label: "Medication" },
  { value: "supplies", label: "Supplies" },
  { value: "equipment", label: "Equipment" },
]

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== "all")

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  const { toast } = useToast()

  // Data
  const [items, setItems] = useState<InventoryItem[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<InventoryItem>["meta"] | null>(null)
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<Category>("all")
  const [lowStockOnly, setLowStockOnly] = useState(false)

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)

  // ---------- Fetch ----------

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await inventoryApi.list({
        page,
        search: search || undefined,
        category: category !== "all" ? category : undefined,
        low_stock: lowStockOnly || undefined,
      })
      setItems(data.data)
      setMeta(data.meta)
    } catch {
      // empty state shown
    } finally {
      setLoading(false)
    }
  }, [page, search, category, lowStockOnly])

  const fetchLowStock = useCallback(async () => {
    try {
      const { data } = await inventoryApi.lowStock()
      setLowStockItems(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetchLowStock()
  }, [fetchLowStock])

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  // ---------- Handlers ----------

  function openCreate() {
    setEditingItem(undefined)
    setFormOpen(true)
  }

  function openEdit(item: InventoryItem) {
    setEditingItem(item)
    setFormOpen(true)
  }

  function openDelete(item: InventoryItem) {
    setDeletingItem(item)
    setDeleteOpen(true)
  }

  function openAdjust(item: InventoryItem) {
    setAdjustingItem(item)
    setAdjustOpen(true)
  }

  async function confirmDelete() {
    if (!deletingItem) return
    setDeleting(true)
    try {
      await inventoryApi.delete(deletingItem.id)
      setDeleteOpen(false)
      setDeletingItem(null)
      fetchItems()
      fetchLowStock()
      toast("Item deleted successfully")
    } catch {
      toast("Failed to delete item", "error")
    } finally {
      setDeleting(false)
    }
  }

  function handleFormSuccess() {
    toast(editingItem ? "Item updated successfully" : "Item created successfully")
    setFormOpen(false)
    setEditingItem(undefined)
    fetchItems()
    fetchLowStock()
  }

  function handleAdjustSuccess() {
    toast("Stock adjusted successfully")
    setAdjustOpen(false)
    setAdjustingItem(null)
    fetchItems()
    fetchLowStock()
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description="Manage medication and supply stock"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Item
          </Button>
        }
      />

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Low Stock Alert
            </p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/70">
              {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} below
              minimum stock level:{" "}
              {lowStockItems
                .slice(0, 3)
                .map((i) => i.name)
                .join(", ")}
              {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
            onClick={() => {
              setLowStockOnly(true)
              setPage(1)
            }}
          >
            View All
          </Button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select value={category} onValueChange={(v) => { setCategory((v ?? "all") as Category); setPage(1) }}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          onClick={() => { setLowStockOnly((v) => !v); setPage(1) }}
          className="h-9"
        >
          <AlertTriangle className="size-3.5" />
          Low Stock
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={8} />
      ) : items.length === 0 ? (
        <EmptyState search={search} lowStockOnly={lowStockOnly} onCreate={openCreate} />
      ) : (
        <>
          <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="hidden lg:table-cell">Min Qty</TableHead>
                  <TableHead className="hidden lg:table-cell">Unit Price</TableHead>
                  <TableHead className="hidden xl:table-cell">Supplier</TableHead>
                  <TableHead className="hidden xl:table-cell">Expiry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => {
                  const isLow = item.quantity <= item.min_quantity
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {item.sku}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <CategoryBadge category={item.category} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isLow
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : "text-foreground"
                          }
                        >
                          {item.quantity}
                          {isLow && (
                            <AlertTriangle className="ml-1 inline size-3.5 text-red-500" />
                          )}
                        </span>
                        {item.unit && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {item.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {item.min_quantity}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {Number(item.unit_price).toFixed(2)} MAD
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {item.supplier || "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Add Stock"
                            onClick={() => openAdjust(item)}
                          >
                            <ArrowUpCircle className="size-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(item)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDelete(item)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {meta && meta.last_page > 1 && (
            <Pagination meta={meta} page={page} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the inventory item details below."
                : "Fill in the details to add a new inventory item."}
            </DialogDescription>
          </DialogHeader>
          <InventoryForm
            item={editingItem}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingItem?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock adjustment dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust stock for{" "}
              <span className="font-medium text-foreground">
                {adjustingItem?.name}
              </span>
              . Current quantity: {adjustingItem?.quantity} {adjustingItem?.unit}.
            </DialogDescription>
          </DialogHeader>
          {adjustingItem && (
            <StockAdjustForm
              item={adjustingItem}
              onSuccess={handleAdjustSuccess}
              onCancel={() => setAdjustOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// InventoryForm
// ---------------------------------------------------------------------------

function InventoryForm({
  item,
  onSuccess,
  onCancel,
}: {
  item?: InventoryItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category: item?.category ?? "medication",
    sku: item?.sku ?? "",
    quantity: item?.quantity?.toString() ?? "",
    min_quantity: item?.min_quantity?.toString() ?? "0",
    unit: item?.unit ?? "",
    unit_price: item?.unit_price?.toString() ?? "",
    supplier: item?.supplier ?? "",
    expiry_date: item?.expiry_date ?? "",
    notes: item?.notes ?? "",
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.sku.trim()) {
      toast("Name and SKU are required", "error")
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 0,
        min_quantity: Number(form.min_quantity) || 0,
        unit_price: Number(form.unit_price) || 0,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      }
      if (item) {
        await inventoryApi.update(item.id, payload)
      } else {
        await inventoryApi.create(payload)
      }
      onSuccess()
    } catch {
      toast("Failed to save item", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_name">Name *</Label>
          <Input
            id="inv_name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v ?? "medication")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_sku">SKU *</Label>
          <Input
            id="inv_sku"
            value={form.sku}
            onChange={(e) => update("sku", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_unit">Unit</Label>
          <Input
            id="inv_unit"
            placeholder="e.g. box, tablet, piece"
            value={form.unit}
            onChange={(e) => update("unit", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_quantity">Quantity</Label>
          <Input
            id="inv_quantity"
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_min_quantity">Min Quantity</Label>
          <Input
            id="inv_min_quantity"
            type="number"
            min="0"
            value={form.min_quantity}
            onChange={(e) => update("min_quantity", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_unit_price">Unit Price (MAD)</Label>
          <Input
            id="inv_unit_price"
            type="number"
            step="0.01"
            min="0"
            value={form.unit_price}
            onChange={(e) => update("unit_price", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inv_supplier">Supplier</Label>
          <Input
            id="inv_supplier"
            value={form.supplier}
            onChange={(e) => update("supplier", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="inv_expiry_date">Expiry Date</Label>
          <Input
            id="inv_expiry_date"
            type="date"
            value={form.expiry_date}
            onChange={(e) => update("expiry_date", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inv_notes">Notes</Label>
        <Textarea
          id="inv_notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : item ? "Update Item" : "Add Item"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ---------------------------------------------------------------------------
// StockAdjustForm
// ---------------------------------------------------------------------------

function StockAdjustForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: InventoryItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState<"in" | "out">("in")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      toast("Please enter a valid quantity", "error")
      return
    }
    if (type === "out" && qty > item.quantity) {
      toast("Cannot remove more than current stock", "error")
      return
    }

    setSaving(true)
    try {
      await inventoryApi.adjust(item.id, { type, quantity: qty, reason: reason || undefined })
      onSuccess()
    } catch {
      toast("Failed to adjust stock", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === "in" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setType("in")}
        >
          <ArrowUpCircle className="size-4" />
          Add Stock
        </Button>
        <Button
          type="button"
          variant={type === "out" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setType("out")}
        >
          <ArrowDownCircle className="size-4" />
          Remove Stock
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adj_quantity">Quantity *</Label>
        <Input
          id="adj_quantity"
          type="number"
          min="1"
          max={type === "out" ? item.quantity : undefined}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="h-9"
          placeholder={type === "out" ? `Max: ${item.quantity}` : "Enter quantity"}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adj_reason">Reason</Label>
        <Textarea
          id="adj_reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={
            type === "in"
              ? "e.g. New shipment received"
              : "e.g. Used for patient treatment"
          }
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? "Adjusting..."
            : type === "in"
              ? "Add Stock"
              : "Remove Stock"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ---------------------------------------------------------------------------
// CategoryBadge
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    medication: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    supplies: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    equipment: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  }

  return (
    <Badge className={`border ${styles[category] ?? "bg-muted text-muted-foreground"}`}>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PaginatedResponse<InventoryItem>["meta"]
  page: number
  onPageChange: (p: number) => void
}) {
  const pages: number[] = []
  for (let i = 1; i <= meta.last_page; i++) {
    if (i === 1 || i === meta.last_page || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(page - 1) * meta.per_page + 1}–
        {Math.min(page * meta.per_page, meta.total)} of {meta.total}
      </p>
      <div className="inline-flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((p, idx) => {
          const prevPage = pages[idx - 1]
          const showEllipsis = prevPage !== undefined && p - prevPage > 1
          return (
            <span key={p} className="inline-flex items-center">
              {showEllipsis && (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              )}
              <Button
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </span>
          )
        })}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= meta.last_page}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({
  search,
  lowStockOnly,
  onCreate,
}: {
  search: string
  lowStockOnly: boolean
  onCreate: () => void
}) {
  const hasFilter = !!search || lowStockOnly

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-muted/20 py-16"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10">
        <Package className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">
          {hasFilter ? "No items found" : "No inventory items yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilter
            ? "Try adjusting your filters or search query."
            : "Get started by adding your first inventory item."}
        </p>
      </div>
      {!hasFilter && (
        <Button onClick={onCreate} className="mt-2">
          <Plus className="size-4" />
          Add Item
        </Button>
      )}
    </motion.div>
  )
}

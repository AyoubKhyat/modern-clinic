"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Truck,
  Users,
  ShoppingCart,
  DollarSign,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  X,
} from "lucide-react"
import { suppliersApi, supplierOrdersApi } from "@/lib/api"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { TableSkeleton } from "@/components/ui/skeletons"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  id: number
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  category: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface SupplierOrder {
  id: number
  order_number?: string
  supplier_id: number
  supplier_name?: string
  supplier?: Supplier
  items: any
  total_amount: number
  status: string
  order_date: string
  expected_delivery: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPLIER_CATEGORIES = [
  { value: "pharmaceuticals", label: "Pharmaceuticals" },
  { value: "medical_equipment", label: "Medical Equipment" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "laboratory", label: "Laboratory" },
  { value: "other", label: "Other" },
] as const

const CATEGORY_COLORS: Record<string, string> = {
  pharmaceuticals: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  medical_equipment: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  office_supplies: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  laboratory: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  other: "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400",
}

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  shipped: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-400",
  delivered: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
}

const EMPTY_SUPPLIER = {
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  category: "pharmaceuticals",
  status: "active",
  notes: "",
}

const EMPTY_ORDER = {
  supplier_id: "",
  items: "",
  total_amount: "",
  status: "pending",
  order_date: new Date().toISOString().slice(0, 10),
  expected_delivery: "",
  notes: "",
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SuppliersPage() {
  const { toast } = useToast()
  const { t } = useI18n()

  // Supplier data
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [supplierSearch, setSupplierSearch] = useState("")

  // Order data
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [orderSearch, setOrderSearch] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState("all")

  // Supplier dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({ ...EMPTY_SUPPLIER })
  const [savingSupplier, setSavingSupplier] = useState(false)

  // Order dialog
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null)
  const [orderForm, setOrderForm] = useState({ ...EMPTY_ORDER })
  const [savingOrder, setSavingOrder] = useState(false)

  // Delete dialogs
  const [deleteSupplierOpen, setDeleteSupplierOpen] = useState(false)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState<SupplierOrder | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---------- Fetch ----------

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true)
    try {
      const { data } = await suppliersApi.list()
      const list = Array.isArray(data) ? data : data.data ?? []
      setSuppliers(list)
    } catch {
      toast("Failed to load suppliers", "error")
    } finally {
      setLoadingSuppliers(false)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const params: Record<string, any> = {}
      if (orderStatusFilter !== "all") params.status = orderStatusFilter
      const { data } = await suppliersApi.list()
      const suppliersList = Array.isArray(data) ? data : data.data ?? []
      setSuppliers(suppliersList)

      const ordersRes = await supplierOrdersApi.list(params)
      const list = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.data ?? []
      setOrders(list)
    } catch {
      toast("Failed to load orders", "error")
    } finally {
      setLoadingOrders(false)
    }
  }, [orderStatusFilter])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // ---------- Computed ----------

  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearch) return true
    const q = supplierSearch.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.contact_person?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    )
  })

  const filteredOrders = orders.filter((o) => {
    if (!orderSearch) return true
    const q = orderSearch.toLowerCase()
    const supplierName = o.supplier_name ?? o.supplier?.name ?? ""
    return (
      supplierName.toLowerCase().includes(q) ||
      o.order_number?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q)
    )
  })

  const activeSuppliers = suppliers.filter((s) => s.status === "active").length
  const pendingOrders = orders.filter((o) => o.status === "pending").length
  const totalOrderValue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  // ---------- Supplier Handlers ----------

  function openCreateSupplier() {
    setEditingSupplier(null)
    setSupplierForm({ ...EMPTY_SUPPLIER })
    setSupplierDialogOpen(true)
  }

  function openEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      category: supplier.category || "other",
      status: supplier.status || "active",
      notes: supplier.notes || "",
    })
    setSupplierDialogOpen(true)
  }

  function openDeleteSupplier(supplier: Supplier) {
    setDeletingSupplier(supplier)
    setDeleteSupplierOpen(true)
  }

  async function handleSaveSupplier() {
    if (!supplierForm.name.trim()) {
      toast("Supplier name is required", "error")
      return
    }
    setSavingSupplier(true)
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, supplierForm)
        toast("Supplier updated successfully")
      } else {
        await suppliersApi.create(supplierForm)
        toast("Supplier created successfully")
      }
      setSupplierDialogOpen(false)
      fetchSuppliers()
    } catch {
      toast("Failed to save supplier", "error")
    } finally {
      setSavingSupplier(false)
    }
  }

  async function confirmDeleteSupplier() {
    if (!deletingSupplier) return
    setDeleting(true)
    try {
      await suppliersApi.delete(deletingSupplier.id)
      toast("Supplier deleted successfully")
      setDeleteSupplierOpen(false)
      setDeletingSupplier(null)
      fetchSuppliers()
    } catch {
      toast("Failed to delete supplier", "error")
    } finally {
      setDeleting(false)
    }
  }

  // ---------- Order Handlers ----------

  function openCreateOrder() {
    setEditingOrder(null)
    setOrderForm({ ...EMPTY_ORDER, order_date: new Date().toISOString().slice(0, 10) })
    setOrderDialogOpen(true)
  }

  function openEditOrder(order: SupplierOrder) {
    setEditingOrder(order)
    setOrderForm({
      supplier_id: String(order.supplier_id),
      items: typeof order.items === "string" ? order.items : JSON.stringify(order.items, null, 2),
      total_amount: String(order.total_amount || ""),
      status: order.status || "pending",
      order_date: order.order_date ? order.order_date.slice(0, 10) : "",
      expected_delivery: order.expected_delivery ? order.expected_delivery.slice(0, 10) : "",
      notes: order.notes || "",
    })
    setOrderDialogOpen(true)
  }

  function openDeleteOrder(order: SupplierOrder) {
    setDeletingOrder(order)
    setDeleteOrderOpen(true)
  }

  async function handleSaveOrder() {
    if (!orderForm.supplier_id) {
      toast("Please select a supplier", "error")
      return
    }
    if (!orderForm.total_amount) {
      toast("Total amount is required", "error")
      return
    }
    setSavingOrder(true)
    try {
      let parsedItems: any = orderForm.items
      try {
        parsedItems = JSON.parse(orderForm.items)
      } catch {
        // Keep as string if not valid JSON
      }

      const payload = {
        supplier_id: Number(orderForm.supplier_id),
        items: parsedItems,
        total_amount: Number(orderForm.total_amount),
        status: orderForm.status,
        order_date: orderForm.order_date || undefined,
        expected_delivery: orderForm.expected_delivery || undefined,
        notes: orderForm.notes || undefined,
      }

      if (editingOrder) {
        await supplierOrdersApi.update(editingOrder.id, payload)
        toast("Order updated successfully")
      } else {
        await supplierOrdersApi.create(payload)
        toast("Order created successfully")
      }
      setOrderDialogOpen(false)
      fetchOrders()
    } catch {
      toast("Failed to save order", "error")
    } finally {
      setSavingOrder(false)
    }
  }

  async function handleUpdateOrderStatus(order: SupplierOrder, newStatus: string) {
    try {
      await supplierOrdersApi.update(order.id, { status: newStatus })
      toast("Order status updated")
      fetchOrders()
    } catch {
      toast("Failed to update order status", "error")
    }
  }

  async function confirmDeleteOrder() {
    if (!deletingOrder) return
    setDeleting(true)
    try {
      await supplierOrdersApi.delete(deletingOrder.id)
      toast("Order deleted successfully")
      setDeleteOrderOpen(false)
      setDeletingOrder(null)
      fetchOrders()
    } catch {
      toast("Failed to delete order", "error")
    } finally {
      setDeleting(false)
    }
  }

  // ---------- Helpers ----------

  function getSupplierName(order: SupplierOrder) {
    if (order.supplier_name) return order.supplier_name
    if (order.supplier?.name) return order.supplier.name
    const s = suppliers.find((sup) => sup.id === order.supplier_id)
    return s?.name ?? "Unknown"
  }

  function formatCurrency(amount: number | string) {
    return `${Number(amount).toLocaleString("en-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
  }

  function formatItems(items: any): string {
    if (!items) return "—"
    if (typeof items === "string") return items
    if (Array.isArray(items)) {
      return items
        .map((item: any) => {
          if (typeof item === "string") return item
          if (item.name && item.quantity) return `${item.name} x${item.quantity}`
          if (item.name) return item.name
          return JSON.stringify(item)
        })
        .join(", ")
    }
    return JSON.stringify(items)
  }

  function getCategoryLabel(value: string) {
    return SUPPLIER_CATEGORIES.find((c) => c.value === value)?.label ?? value
  }

  function getOrderStatusLabel(value: string) {
    return ORDER_STATUSES.find((s) => s.value === value)?.label ?? value
  }

  // ---------- Render ----------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Supplier Management"
        description="Manage medical suppliers and purchase orders"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <Users className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold tabular-nums">{suppliers.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                <Truck className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Suppliers</p>
                <p className="text-2xl font-bold tabular-nums">{activeSuppliers}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                <ClipboardList className="size-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold tabular-nums">{pendingOrders}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="border-0 shadow-sm ring-1 ring-foreground/[0.06] dark:ring-foreground/[0.04]">
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <DollarSign className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Order Value</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalOrderValue)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">
            <Package className="size-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="size-4" />
            Orders
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* Suppliers Tab                                                     */}
        {/* ================================================================ */}
        <TabsContent value="suppliers">
          <div className="flex flex-col gap-4 pt-4">
            {/* Filters & Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-sm">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search suppliers..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                {supplierSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSupplierSearch("")}
                  >
                    <X className="size-3.5" />
                    Clear
                  </Button>
                )}
              </div>
              <Button onClick={openCreateSupplier}>
                <Plus className="size-4" />
                Add Supplier
              </Button>
            </div>

            {/* Table */}
            {loadingSuppliers ? (
              <TableSkeleton columns={7} />
            ) : filteredSuppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <Package className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  {supplierSearch ? "No suppliers match your search" : "No suppliers yet"}
                </p>
                {!supplierSearch && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={openCreateSupplier}>
                    <Plus className="size-3.5" />
                    Add your first supplier
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier, i) => (
                      <motion.tr
                        key={supplier.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell>
                          <span className="font-medium text-foreground">{supplier.name}</span>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {supplier.contact_person || "—"}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {supplier.email ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3.5" />
                              {supplier.email}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {supplier.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="size-3.5" />
                              {supplier.phone}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={CATEGORY_COLORS[supplier.category] ?? CATEGORY_COLORS.other}
                          >
                            {getCategoryLabel(supplier.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              supplier.status === "active"
                                ? "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400"
                                : "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400"
                            }
                          >
                            {supplier.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditSupplier(supplier)}
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteSupplier(supplier)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* Orders Tab                                                        */}
        {/* ================================================================ */}
        <TabsContent value="orders">
          <div className="flex flex-col gap-4 pt-4">
            {/* Filters & Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-sm">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                <Select
                  value={orderStatusFilter}
                  onValueChange={(v) => v && setOrderStatusFilter(v)}
                >
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(orderSearch || orderStatusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOrderSearch("")
                      setOrderStatusFilter("all")
                    }}
                  >
                    <X className="size-3.5" />
                    Clear
                  </Button>
                )}
              </div>
              <Button onClick={openCreateOrder}>
                <Plus className="size-4" />
                New Order
              </Button>
            </div>

            {/* Table */}
            {loadingOrders ? (
              <TableSkeleton columns={7} />
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <ShoppingCart className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  {orderSearch || orderStatusFilter !== "all"
                    ? "No orders match your filters"
                    : "No orders yet"}
                </p>
                {!orderSearch && orderStatusFilter === "all" && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={openCreateOrder}>
                    <Plus className="size-3.5" />
                    Create your first order
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border-0 overflow-hidden overflow-x-auto ring-1 ring-foreground/[0.06] shadow-sm dark:ring-foreground/[0.04]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="hidden md:table-cell">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Order Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Expected Delivery</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order, i) => (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell>
                          <span className="font-medium text-foreground">
                            #{order.order_number ?? order.id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground">{getSupplierName(order)}</span>
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                          {formatItems(order.items)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(v) => v && handleUpdateOrderStatus(order, v)}
                          >
                            <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none">
                              <Badge
                                className={ORDER_STATUS_COLORS[order.status] ?? ORDER_STATUS_COLORS.pending}
                              >
                                {getOrderStatusLabel(order.status)}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {order.order_date
                            ? new Date(order.order_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {order.expected_delivery
                            ? new Date(order.expected_delivery).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditOrder(order)}
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteOrder(order)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* Supplier Dialog                                                    */}
      {/* ================================================================ */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update supplier information below."
                : "Fill in the details to add a new supplier."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="supplier-name">Name *</Label>
              <Input
                id="supplier-name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-contact">Contact Person</Label>
                <Input
                  id="supplier-contact"
                  value={supplierForm.contact_person}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, contact_person: e.target.value })
                  }
                  placeholder="Contact name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  placeholder="+212 ..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-category">Category</Label>
                <Select
                  value={supplierForm.category}
                  onValueChange={(v) =>
                    v && setSupplierForm({ ...supplierForm, category: v })
                  }
                >
                  <SelectTrigger id="supplier-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Input
                id="supplier-address"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                placeholder="Full address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-status">Status</Label>
              <Select
                value={supplierForm.status}
                onValueChange={(v) =>
                  v && setSupplierForm({ ...supplierForm, status: v })
                }
              >
                <SelectTrigger id="supplier-status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier-notes">Notes</Label>
              <Textarea
                id="supplier-notes"
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSupplierDialogOpen(false)}
              disabled={savingSupplier}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSupplier} disabled={savingSupplier}>
              {savingSupplier && <Loader2 className="size-4 animate-spin" />}
              {editingSupplier ? "Update Supplier" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Order Dialog                                                       */}
      {/* ================================================================ */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "Edit Order" : "Create Order"}
            </DialogTitle>
            <DialogDescription>
              {editingOrder
                ? "Update order details below."
                : "Fill in the details to create a new purchase order."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="order-supplier">Supplier *</Label>
              <Select
                value={orderForm.supplier_id}
                onValueChange={(v) =>
                  v && setOrderForm({ ...orderForm, supplier_id: v })
                }
              >
                <SelectTrigger id="order-supplier" className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s) => s.status === "active")
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order-items">Items</Label>
              <Textarea
                id="order-items"
                value={orderForm.items}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, items: e.target.value })
                }
                placeholder={'[{"name": "Item 1", "quantity": 10, "unit_price": 50}]'}
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Enter items as a JSON array or plain text description.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="order-total">Total Amount (MAD) *</Label>
                <Input
                  id="order-total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={orderForm.total_amount}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, total_amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-status">Status</Label>
                <Select
                  value={orderForm.status}
                  onValueChange={(v) =>
                    v && setOrderForm({ ...orderForm, status: v })
                  }
                >
                  <SelectTrigger id="order-status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="order-date">Order Date</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={orderForm.order_date}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, order_date: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-delivery">Expected Delivery</Label>
                <Input
                  id="order-delivery"
                  type="date"
                  value={orderForm.expected_delivery}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, expected_delivery: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order-notes">Notes</Label>
              <Textarea
                id="order-notes"
                value={orderForm.notes}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrderDialogOpen(false)}
              disabled={savingOrder}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveOrder} disabled={savingOrder}>
              {savingOrder && <Loader2 className="size-4 animate-spin" />}
              {editingOrder ? "Update Order" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Delete Supplier Confirmation                                       */}
      {/* ================================================================ */}
      <Dialog open={deleteSupplierOpen} onOpenChange={setDeleteSupplierOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingSupplier?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSupplierOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSupplier}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Delete Order Confirmation                                          */}
      {/* ================================================================ */}
      <Dialog open={deleteOrderOpen} onOpenChange={setDeleteOrderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order{" "}
              <span className="font-medium text-foreground">
                #{deletingOrder?.order_number ?? deletingOrder?.id}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOrderOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useAuthStore } from "@/stores/auth-store"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard"
import { DoctorDashboardView } from "@/components/dashboard/doctor-dashboard"
import { ReceptionDashboardView } from "@/components/dashboard/reception-dashboard"

export default function DashboardPage() {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  switch (user.role) {
    case "admin":
    case "accountant":
      return <AdminDashboardView />
    case "doctor":
      return <DoctorDashboardView />
    case "receptionist":
      return <ReceptionDashboardView />
    default:
      return <AdminDashboardView />
  }
}

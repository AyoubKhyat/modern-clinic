import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <StatCardsSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <TableSkeleton columns={4} rows={4} />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          <TableSkeleton columns={3} rows={4} />
        </div>
      </div>
    </div>
  )
}

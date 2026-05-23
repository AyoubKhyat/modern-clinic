import { TableSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function PaymentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <TableSkeleton columns={6} rows={6} />
    </div>
  )
}

import { StatCardsSkeleton, CardGridSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-32" />
      <StatCardsSkeleton />
      <CardGridSkeleton count={4} cols="sm:grid-cols-2" />
    </div>
  )
}

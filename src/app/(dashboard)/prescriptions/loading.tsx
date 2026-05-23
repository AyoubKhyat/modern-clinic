import { CardGridSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function PrescriptionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-28" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-border/40 p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
      </div>
    </div>
  )
}

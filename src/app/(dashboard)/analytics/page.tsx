"use client"

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { PageHeader } from "@/components/layout/page-header"

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="Insights and performance metrics" />
      <AnalyticsDashboard />
    </div>
  )
}

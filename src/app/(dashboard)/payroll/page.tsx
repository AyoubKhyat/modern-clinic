"use client"

import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { PayrollDemo } from "@/components/payroll/payroll-demo"

export default function PayrollPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        description="Employee salary management"
        action={
          <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400">
            Demo Mode
          </Badge>
        }
      />
      <PayrollDemo />
    </div>
  )
}

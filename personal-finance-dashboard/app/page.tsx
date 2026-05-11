"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { BudgetStatus } from "@/components/dashboard/budget-status"
import { SavingsGoals } from "@/components/dashboard/savings-goals"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"

export default function DashboardPage() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Cards */}
            <StatsCards />

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <SpendingChart />
              <CashFlowChart />
            </div>

            {/* Budget, Goals, and Alerts */}
            <div className="grid gap-6 lg:grid-cols-3">
              <BudgetStatus />
              <SavingsGoals />
              <AlertsPanel />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

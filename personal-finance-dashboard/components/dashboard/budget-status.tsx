"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const budgets = [
  {
    category: "Groceries",
    spent: 1250,
    limit: 1200,
    color: "bg-destructive",
  },
  {
    category: "Entertainment",
    spent: 850,
    limit: 1000,
    color: "bg-chart-2",
  },
  {
    category: "Utilities",
    spent: 620,
    limit: 800,
    color: "bg-chart-3",
  },
  {
    category: "Transport",
    spent: 480,
    limit: 600,
    color: "bg-chart-4",
  },
  {
    category: "Dining Out",
    spent: 385,
    limit: 400,
    color: "bg-warning",
  },
]

export function BudgetStatus() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Budget Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((budget) => {
          const percentage = Math.min((budget.spent / budget.limit) * 100, 100)
          const isOverBudget = budget.spent > budget.limit
          const isNearLimit = percentage >= 90 && !isOverBudget

          return (
            <div key={budget.category} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{budget.category}</span>
                <span
                  className={`${
                    isOverBudget
                      ? "text-destructive"
                      : isNearLimit
                      ? "text-warning"
                      : "text-muted-foreground"
                  }`}
                >
                  ${budget.spent.toLocaleString()} / ${budget.limit.toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={percentage}
                  className={`h-2 ${
                    isOverBudget
                      ? "[&>[data-slot=progress-indicator]]:bg-destructive"
                      : isNearLimit
                      ? "[&>[data-slot=progress-indicator]]:bg-warning"
                      : "[&>[data-slot=progress-indicator]]:bg-primary"
                  }`}
                />
              </div>
              {isOverBudget && (
                <p className="text-xs text-destructive">
                  Over budget by ${(budget.spent - budget.limit).toLocaleString()}
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

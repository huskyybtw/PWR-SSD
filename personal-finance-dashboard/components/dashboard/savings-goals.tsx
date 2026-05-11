"use client"

import { Target, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const goals = [
  {
    name: "Emergency Fund",
    target: 10000,
    current: 6800,
    deadline: "Dec 2026",
    icon: "🛡️",
  },
  {
    name: "Vacation",
    target: 3000,
    current: 1850,
    deadline: "Aug 2026",
    icon: "✈️",
  },
  {
    name: "New Laptop",
    target: 2000,
    current: 1200,
    deadline: "Oct 2026",
    icon: "💻",
  },
]

export function SavingsGoals() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Savings Goals</CardTitle>
          <Target className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const percentage = (goal.current / goal.target) * 100

          return (
            <div
              key={goal.name}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goal.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{goal.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {goal.deadline}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ${goal.current.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of ${goal.target.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={percentage} className="h-1.5" />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {percentage.toFixed(0)}% complete
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

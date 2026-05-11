"use client"

import { DollarSign, Wallet, PiggyBank, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const stats = [
  {
    title: "Total Expenses",
    value: "$4,285.50",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    description: "This month",
  },
  {
    title: "Remaining Budget",
    value: "$1,714.50",
    change: "-8.2%",
    trend: "down" as const,
    icon: Wallet,
    description: "From $6,000",
  },
  {
    title: "Savings Progress",
    value: "68%",
    change: "+5.3%",
    trend: "up" as const,
    icon: PiggyBank,
    description: "$3,400 of $5,000",
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="py-4">
          <CardContent className="px-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className="flex items-center gap-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="size-3 text-success" />
                  ) : (
                    <TrendingDown className="size-3 text-destructive" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      stat.trend === "up" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stat.description}
                  </span>
                </div>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

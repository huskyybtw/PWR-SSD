"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const dailyData = [
  { name: "Mon", income: 0, expenses: 120 },
  { name: "Tue", income: 0, expenses: 85 },
  { name: "Wed", income: 500, expenses: 200 },
  { name: "Thu", income: 0, expenses: 150 },
  { name: "Fri", income: 0, expenses: 320 },
  { name: "Sat", income: 0, expenses: 180 },
  { name: "Sun", income: 0, expenses: 95 },
]

const weeklyData = [
  { name: "Week 1", income: 1500, expenses: 980 },
  { name: "Week 2", income: 500, expenses: 1200 },
  { name: "Week 3", income: 2000, expenses: 850 },
  { name: "Week 4", income: 1200, expenses: 1255 },
]

const monthlyData = [
  { name: "Jan", income: 5200, expenses: 4100 },
  { name: "Feb", income: 4800, expenses: 3850 },
  { name: "Mar", income: 5500, expenses: 4200 },
  { name: "Apr", income: 5200, expenses: 4500 },
  { name: "May", income: 6000, expenses: 4285 },
]

export function CashFlowChart() {
  const [period, setPeriod] = useState("weekly")

  const data =
    period === "daily"
      ? dailyData
      : period === "weekly"
      ? weeklyData
      : monthlyData

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Monthly Cash Flow</CardTitle>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-8">
            <TabsTrigger value="daily" className="text-xs px-2 h-6">
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs px-2 h-6">
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-2 h-6">
              Monthly
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-foreground)",
                }}
                formatter={(value: number) => [`$${value}`, ""]}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                fill="url(#incomeGradient)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fill="url(#expenseGradient)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-chart-2" />
            <span className="text-sm text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-chart-1" />
            <span className="text-sm text-muted-foreground">Expenses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { AlertTriangle, TrendingUp, Bell, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const alerts = [
  {
    id: 1,
    type: "warning",
    title: "Groceries Budget Exceeded",
    message: "You've exceeded your groceries budget by $50 (4.2%)",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "info",
    title: "Dining Budget Alert",
    message: "You're at 96% of your dining out budget",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "success",
    title: "Savings Goal Progress",
    message: "Great progress! Emergency fund is now at 68%",
    time: "1 day ago",
  },
]

export function AlertsPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">
              Notifications
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {alerts.length}
            </Badge>
          </div>
          <Bell className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`relative flex gap-3 rounded-lg border p-3 ${
              alert.type === "warning"
                ? "border-destructive/30 bg-destructive/5"
                : alert.type === "success"
                ? "border-success/30 bg-success/5"
                : "border-border bg-secondary/30"
            }`}
          >
            <div className="mt-0.5">
              {alert.type === "warning" ? (
                <AlertTriangle className="size-4 text-destructive" />
              ) : alert.type === "success" ? (
                <TrendingUp className="size-4 text-success" />
              ) : (
                <Bell className="size-4 text-warning" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.message}</p>
              <p className="text-xs text-muted-foreground/70">{alert.time}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 size-6"
            >
              <X className="size-3" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

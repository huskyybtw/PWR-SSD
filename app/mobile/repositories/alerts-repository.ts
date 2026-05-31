import { AlertMessage } from "@/shared/types/finance";

let alertsStore: AlertMessage[] = [];

export async function listAlerts(): Promise<AlertMessage[]> {
  return [...alertsStore];
}

export async function createAlert(value: AlertMessage): Promise<void> {
  alertsStore = [value, ...alertsStore];
}

export async function markAlertRead(alertId: string): Promise<void> {
  alertsStore = alertsStore.map((alert) =>
    alert.id === alertId ? { ...alert, read: true } : alert,
  );
}

export async function replaceAlerts(value: AlertMessage[]): Promise<void> {
  alertsStore = [...value];
}

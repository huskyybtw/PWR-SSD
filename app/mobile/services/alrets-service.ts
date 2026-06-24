import { useCallback, useEffect, useState } from "react";

import {
  createAlert,
  listAlerts,
  markAlertRead,
} from "@/repositories/alerts-repository";
import { AlertMessage } from "@/shared/types/finance";

export function useAlertsService() {
  const [alerts, setLocalAlerts] = useState<AlertMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    const storedAlerts = await listAlerts();
    if (storedAlerts) {
      setLocalAlerts(storedAlerts);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      await loadAlerts();
      if (!active) return;
      setIsReady(true);
    }

    initialLoad();

    return () => {
      active = false;
    };
  }, [loadAlerts]);

  const refreshAlerts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAlerts();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAlerts]);

  const addAlert = useCallback(
    async (alert: Omit<AlertMessage, "id" | "createdAt" | "read">) => {
      // 1. Fire the repository insert statement first and await the actual SQLite row returns
      const persistedAlert = await createAlert(alert);

      // 2. Commit the validated entity down to local React UI state counters
      setLocalAlerts((current) => [persistedAlert, ...current]);

      // 3. Return the exact database-synced alert back to callers
      return persistedAlert;
    },
    [],
  );

  const markRead = useCallback(async (alertId: string) => {
    setLocalAlerts((current) => {
      const next = current.map((alert) =>
        alert.id === alertId ? { ...alert, read: true } : alert,
      );
      markAlertRead(alertId);
      return next;
    });
  }, []);

  return {
    alerts,
    unreadAlerts: alerts.filter((alert) => !alert.read),
    isReady,
    isRefreshing,
    refreshAlerts,
    addAlert,
    markAlertRead: markRead,
    unreadAlertsCount: alerts.filter((alert) => !alert.read).length,
  };
}

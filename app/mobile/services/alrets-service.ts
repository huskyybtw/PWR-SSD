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
    try {
      const storedAlerts = await listAlerts();
      setLocalAlerts(
        [...storedAlerts].sort((a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
        ),
      );
    } catch (error) {
      console.error("Failed to load alerts", error);
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
      const persistedAlert = await createAlert(alert);

      setLocalAlerts((current) => [persistedAlert, ...current]);

      return persistedAlert;
    },
    [],
  );

  const markRead = useCallback(async (alertId: string) => {
    try {
      await markAlertRead(alertId);
    } catch (error) {
      console.error("Failed to mark alert as read", error);
    }
    setLocalAlerts((current) =>
      current.map((alert) =>
        alert.id === alertId ? { ...alert, read: true } : alert,
      ),
    );
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

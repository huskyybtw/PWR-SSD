import { useCallback, useEffect, useState } from "react";

import {
  createAlert,
  listAlerts,
  markAlertRead,
} from "@/repositories/alerts-repository";
import { AlertMessage } from "@/shared/types/finance";
import { generateId } from "@/shared/utils";

export function useAlertsService() {
  const [alerts, setLocalAlerts] = useState<AlertMessage[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshAlerts = useCallback(async () => {
    const storedAlerts = await listAlerts();
    setLocalAlerts(storedAlerts);
    return storedAlerts;
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!active) return;

      await refreshAlerts();

      setIsReady(true);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addAlert = useCallback(
    async (alert: Omit<AlertMessage, "id" | "createdAt" | "read">) => {
      const newAlert: AlertMessage = {
        ...alert,
        id: generateId(),
        createdAt: new Date().toISOString(),
        read: false,
      };

      await createAlert(newAlert);
      await refreshAlerts();

      return newAlert;
    },
    [refreshAlerts],
  );

  const markRead = useCallback(
    async (alertId: string) => {
      await markAlertRead(alertId);
      await refreshAlerts();
    },
    [refreshAlerts],
  );

  return {
    alerts,
    isReady,
    refreshAlerts,
    addAlert,
    markAlertRead: markRead,
    unreadAlertsCount: alerts.filter((alert) => !alert.read).length,
  };
}

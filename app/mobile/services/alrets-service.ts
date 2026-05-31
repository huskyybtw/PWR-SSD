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

  useEffect(() => {
    let active = true;

    async function load() {
      const storedAlerts = await listAlerts();

      if (!active) return;

      if (storedAlerts) {
        setLocalAlerts(storedAlerts);
      }

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

      setLocalAlerts((current) => {
        const next = [newAlert, ...current];
        createAlert(newAlert);
        return next;
      });

      return newAlert;
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
    isReady,
    addAlert,
    markAlertRead: markRead,
    unreadAlertsCount: alerts.filter((alert) => !alert.read).length,
  };
}

import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { useFinance } from "@/lib/finance-context";
import { formatDate } from "@/lib/utils";

export function NotificationBell() {
  const [visible, setVisible] = useState(false);
  const { alerts, unreadAlertsCount, markAlertRead } = useFinance();

  return (
    <>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Bell size={22} color={Colors.text} />
        {unreadAlertsCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {alerts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                  <Text style={styles.emptySub}>
                    Alerts about budgets and goals will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.alertsList}>
                  {alerts.map((alert) => (
                    <TouchableOpacity
                      key={alert.id}
                      style={[
                        styles.alertCard,
                        !alert.read && styles.alertUnread,
                        alert.type === "budget_exceeded"
                          ? styles.alertDanger
                          : alert.type === "budget_near_limit"
                            ? styles.alertWarning
                            : styles.alertSuccess,
                      ]}
                      onPress={() => markAlertRead(alert.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.alertIcon}>
                        {alert.type === "budget_exceeded" ? (
                          <AlertTriangle size={18} color={Colors.danger} />
                        ) : alert.type === "budget_near_limit" ? (
                          <AlertTriangle size={18} color={Colors.accent} />
                        ) : (
                          <CheckCircle2 size={18} color={Colors.primary} />
                        )}
                      </View>
                      <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                        <Text style={styles.alertMessage}>{alert.message}</Text>
                        <Text style={styles.alertDate}>
                          {formatDate(alert.createdAt)}
                        </Text>
                      </View>
                      {!alert.read && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  alertsList: {
    gap: 10,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  alertUnread: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  alertDanger: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  alertWarning: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  alertSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  alertMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  alertDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
});

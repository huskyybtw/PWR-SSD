import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
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
        className="w-[42px] h-[42px] rounded-full bg-appSurface items-center justify-center"
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Bell size={22} color={Colors.text} />
        {unreadAlertsCount > 0 && (
          <View className="absolute -top-0.5 -right-0.5 bg-appDanger rounded-full min-w-[20px] h-[20px] items-center justify-center border-2 border-appBackground">
            <Text className="text-white text-[10px] font-bold">
              {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-appText">Notifications</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {alerts.length === 0 ? (
                <View className="items-center py-15 gap-3">
                  <Bell size={32} color={Colors.textMuted} />
                  <Text className="text-appText text-base font-semibold">No notifications yet</Text>
                  <Text className="text-appText-muted text-[13px] text-center px-5">
                    Alerts about budgets and goals will appear here
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {alerts.map((alert) => (
                    <TouchableOpacity
                      key={alert.id}
                      className={`flex-row items-start gap-3 p-3.5 rounded-2xl bg-appSurface ${!alert.read ? "border border-appBorder-light" : ""} ${alert.type === "budget_exceeded" ? "border-l-4 border-l-appDanger" : alert.type === "budget_near_limit" ? "border-l-4 border-l-appAccent" : "border-l-4 border-l-appPrimary"}`}
                      onPress={() => markAlertRead(alert.id)}
                      activeOpacity={0.8}
                    >
                      <View className="mt-0.5">
                        {alert.type === "budget_exceeded" ? (
                          <AlertTriangle size={18} color={Colors.danger} />
                        ) : alert.type === "budget_near_limit" ? (
                          <AlertTriangle size={18} color={Colors.accent} />
                        ) : (
                          <CheckCircle2 size={18} color={Colors.primary} />
                        )}
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-sm font-bold text-appText">{alert.title}</Text>
                        <Text className="text-[13px] text-appText-secondary leading-[18px]">{alert.message}</Text>
                        <Text className="text-[11px] text-appText-muted mt-1">
                          {formatDate(alert.createdAt)}
                        </Text>
                      </View>
                      {!alert.read && <View className="w-2 h-2 rounded-full bg-appPrimary mt-1" />}
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



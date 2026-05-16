import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRightLeft,
  BarChart3,
  LayoutDashboard,
  Target,
  Wallet,
} from "lucide-react-native";

import { Colors } from "@/constants/Colors";

export default function TabLayout() {
  return (
    <SafeAreaView className="flex-1 bg-appBackground" edges={["top"]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            ...Platform.select({
              ios: {
                backgroundColor: Colors.surface,
              },
            }),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: "Transactions",
            tabBarIcon: ({ color }) => (
              <ArrowRightLeft size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: "Budgets",
            tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: "Goals",
            tabBarIcon: ({ color }) => <Target size={24} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

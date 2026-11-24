import { useLocalSearchParams } from "expo-router";
import { ChevronRight, PiggyBank, Plus, Wallet, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import { BudgetsPanel } from "@/components/budgets-panel";
import { GoalsPanel } from "@/components/goals-panel";
import { Colors } from "@/constants/colors";

type PlanningTab = "budgets" | "goals";

const TABS: {
  key: PlanningTab;
  label: string;
  newLabel: string;
  newHint: string;
  Icon: typeof Wallet;
}[] = [
  {
    key: "budgets",
    label: "Budgets",
    newLabel: "New budget",
    newHint: "Set a spending limit for a category",
    Icon: Wallet,
  },
  {
    key: "goals",
    label: "Savings Goals",
    newLabel: "New savings goal",
    newHint: "Save towards a target amount",
    Icon: PiggyBank,
  },
];

export default function PlanningScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<PlanningTab>(
    params.tab === "goals" ? "goals" : "budgets",
  );
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  // Which panel should open its "new" form once it is visible.
  const [pendingCreate, setPendingCreate] = useState<PlanningTab | null>(null);
  const clearPendingCreate = useCallback(() => setPendingCreate(null), []);

  // Allow deep-linking from the dashboard (/budgets?tab=goals).
  useEffect(() => {
    if (params.tab === "goals" || params.tab === "budgets") {
      setTab(params.tab);
    }
  }, [params.tab]);

  function startCreate(kind: PlanningTab) {
    setShowCreateMenu(false);
    setTab(kind);
    setPendingCreate(kind);
  }

  return (
    <View className="flex-1 bg-appBackground">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-[28px] font-extrabold text-appText">
          Planning
        </Text>
        <Text className="text-sm text-appText-muted mt-0.5">
          {tab === "budgets"
            ? "Track spending against your limits"
            : "Track your progress toward targets"}
        </Text>

        <View className="flex-row bg-appSurface rounded-2xl p-1.5 mt-4">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <TouchableOpacity
                key={key}
                className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-xl ${
                  active ? "bg-appPrimary-muted" : ""
                }`}
                onPress={() => setTab(key)}
              >
                <Icon
                  size={20}
                  color={active ? Colors.primaryLight : Colors.textMuted}
                />
                <Text
                  className={`text-[16px] font-bold ${
                    active ? "text-appPrimary-light" : "text-appText-muted"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === "budgets" ? (
        <BudgetsPanel
          openCreate={pendingCreate === "budgets"}
          onCreateOpened={clearPendingCreate}
        />
      ) : (
        <GoalsPanel
          openCreate={pendingCreate === "goals"}
          onCreateOpened={clearPendingCreate}
        />
      )}

      <TouchableOpacity
        className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-appPrimary items-center justify-center shadow-md shadow-appPrimary elevation-5"
        onPress={() => setShowCreateMenu(true)}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Choose what to create */}
      <Modal
        visible={showCreateMenu}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-end"
          onPress={() => setShowCreateMenu(false)}
        >
          <Pressable className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-appText">
                Create new
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateMenu(false)}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {TABS.map(({ key, newLabel, newHint, Icon }) => (
              <TouchableOpacity
                key={key}
                className="flex-row items-center gap-3 bg-appSurface rounded-2xl p-4 mb-2.5"
                onPress={() => startCreate(key)}
              >
                <View className="w-11 h-11 rounded-full bg-appPrimary-muted items-center justify-center">
                  <Icon size={20} color={Colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-appText">
                    {newLabel}
                  </Text>
                  <Text className="text-xs text-appText-muted mt-0.5">
                    {newHint}
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

import {
  AlertTriangle,
  Calendar,
  Check,
  Plus,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { NotificationBell } from "@/components/notification-bell";
import { useFinance } from "@/lib/finance-context";
import { formatCurrency, formatDate } from "@/lib/utils";

const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

export default function BudgetsScreen() {
  const { budgets, categories, getBudgetStatuses, addBudget, deleteBudget } =
    useFinance();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("monthly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0],
  );

  const statuses = getBudgetStatuses();

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt <= 0 || !category) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    try {
      await addBudget({
        name: name.trim(),
        amount: amt,
        category,
        period,
        startDate,
        endDate,
      });
      setShowModal(false);
      setName("");
      setAmount("");
      setCategory("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <View className="flex-1 bg-appBackground">
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-[28px] font-extrabold text-appText">
              Budgets
            </Text>
            <Text className="text-sm text-appText-muted mt-0.5">
              Track spending against your limits
            </Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      <FlatList
        data={statuses}
        keyExtractor={(item) => item.budget.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="bg-appSurface rounded-2xl p-4 mb-3">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-full bg-appPrimary-muted items-center justify-center">
                <Wallet size={18} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-appText">
                  {item.budget.name}
                </Text>
                <Text className="text-xs text-appText-muted mt-0.5">
                  {item.budget.category} •{" "}
                  {item.budget.period.charAt(0).toUpperCase() +
                    item.budget.period.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Delete Budget", "Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteBudget(item.budget.id),
                    },
                  ])
                }
              >
                <Trash2 size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-baseline mb-2.5">
              <Text className="text-[22px] font-extrabold text-appText">
                {formatCurrency(item.spent)}
              </Text>
              <Text className="text-sm text-appText-muted ml-1">
                / {formatCurrency(item.budget.amount)}
              </Text>
            </View>

            <View className="h-2.5 bg-appSurface-highlight rounded-md overflow-hidden mb-2">
              <View
                className="h-full rounded-md"
                style={{
                  width: `${Math.min(100, item.percentage)}%`,
                  backgroundColor: item.isExceeded
                    ? Colors.danger
                    : item.isNearLimit
                      ? Colors.accent
                      : Colors.primary,
                }}
              />
            </View>

            <View className="flex-row justify-between items-center">
              <Text
                className="text-sm font-bold"
                style={{
                  color: item.isExceeded
                    ? Colors.danger
                    : item.isNearLimit
                      ? Colors.accent
                      : Colors.primary,
                }}
              >
                {item.percentage.toFixed(0)}%
              </Text>
              <Text className="text-[13px] text-appText-secondary">
                {item.isExceeded
                  ? `Over by ${formatCurrency(item.spent - item.budget.amount)}`
                  : `${formatCurrency(item.remaining)} remaining`}
              </Text>
            </View>

            {(item.isExceeded || item.isNearLimit) && (
              <View
                className="flex-row items-center gap-1.5 self-start px-2.5 py-1 rounded-lg mt-2.5"
                style={{
                  backgroundColor: item.isExceeded
                    ? Colors.dangerMuted
                    : Colors.accentMuted,
                }}
              >
                <AlertTriangle
                  size={14}
                  color={item.isExceeded ? Colors.danger : Colors.accent}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: item.isExceeded ? Colors.danger : Colors.accent,
                  }}
                >
                  {item.isExceeded ? "Budget exceeded!" : "Approaching limit"}
                </Text>
              </View>
            )}

            <View className="flex-row items-center gap-1.5 mt-2.5 pt-2.5 border-t border-appBorder">
              <Calendar size={12} color={Colors.textMuted} />
              <Text className="text-xs text-appText-muted">
                {formatDate(item.budget.startDate)} -{" "}
                {formatDate(item.budget.endDate)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-15">
            <Text className="text-appText text-base font-semibold">
              No budgets yet
            </Text>
            <Text className="text-appText-muted text-[13px] mt-1">
              Create a budget to start tracking spending
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-appPrimary items-center justify-center shadow-md shadow-appPrimary elevation-5"
        onPress={() => setShowModal(true)}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-appText">New Budget</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Budget Name
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                placeholder="e.g. Monthly Food"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Amount Limit
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 20 }}
              >
                {categories
                  .filter((c) => c !== "Uncategorized" && c !== "Income")
                  .map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-appSurface border ${
                        category === cat
                          ? "bg-appPrimary-muted border-appPrimary"
                          : "border-appBorder"
                      }`}
                      onPress={() => setCategory(cat)}
                    >
                      <Tag
                        size={14}
                        color={
                          category === cat ? Colors.primary : Colors.textMuted
                        }
                      />
                      <Text
                        className={`text-[13px] ${
                          category === cat
                            ? "text-appPrimary-light font-semibold"
                            : "text-appText-secondary"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Period
              </Text>
              <View className="flex-row gap-2">
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    className={`flex-1 py-2.5 items-center rounded-xl bg-appSurface border ${
                      period === p
                        ? "bg-appPrimary-muted border-appPrimary"
                        : "border-appBorder"
                    }`}
                    onPress={() => setPeriod(p)}
                  >
                    <Text
                      className={`text-[13px] ${
                        period === p
                          ? "text-appPrimary-light font-semibold"
                          : "text-appText-secondary"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Start Date
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                End Date
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                className="bg-appPrimary rounded-2xl py-4 items-center mt-6"
                onPress={handleAdd}
              >
                <Text className="text-white text-base font-bold">
                  Create Budget
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

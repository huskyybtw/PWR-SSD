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
  StyleSheet,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Budgets</Text>
            <Text style={styles.subtitle}>
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
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetIcon}>
                <Wallet size={18} color={Colors.primary} />
              </View>
              <View style={styles.budgetInfo}>
                <Text style={styles.budgetName}>{item.budget.name}</Text>
                <Text style={styles.budgetMeta}>
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

            <View style={styles.amountRow}>
              <Text style={styles.spentAmount}>
                {formatCurrency(item.spent)}
              </Text>
              <Text style={styles.limitAmount}>
                / {formatCurrency(item.budget.amount)}
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, item.percentage)}%`,
                    backgroundColor: item.isExceeded
                      ? Colors.danger
                      : item.isNearLimit
                        ? Colors.accent
                        : Colors.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetFooter}>
              <Text
                style={[
                  styles.percentText,
                  {
                    color: item.isExceeded
                      ? Colors.danger
                      : item.isNearLimit
                        ? Colors.accent
                        : Colors.primary,
                  },
                ]}
              >
                {item.percentage.toFixed(0)}%
              </Text>
              <Text style={styles.remainingText}>
                {item.isExceeded
                  ? `Over by ${formatCurrency(item.spent - item.budget.amount)}`
                  : `${formatCurrency(item.remaining)} remaining`}
              </Text>
            </View>

            {(item.isExceeded || item.isNearLimit) && (
              <View
                style={[
                  styles.alertBadge,
                  {
                    backgroundColor: item.isExceeded
                      ? Colors.dangerMuted
                      : Colors.accentMuted,
                  },
                ]}
              >
                <AlertTriangle
                  size={14}
                  color={item.isExceeded ? Colors.danger : Colors.accent}
                />
                <Text
                  style={[
                    styles.alertBadgeText,
                    {
                      color: item.isExceeded ? Colors.danger : Colors.accent,
                    },
                  ]}
                >
                  {item.isExceeded ? "Budget exceeded!" : "Approaching limit"}
                </Text>
              </View>
            )}

            <View style={styles.dateRow}>
              <Calendar size={12} color={Colors.textMuted} />
              <Text style={styles.dateText}>
                {formatDate(item.budget.startDate)} -{" "}
                {formatDate(item.budget.endDate)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No budgets yet</Text>
            <Text style={styles.emptySub}>
              Create a budget to start tracking spending
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Budget</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Budget Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Monthly Food"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Amount Limit</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {categories
                  .filter((c) => c !== "Uncategorized" && c !== "Income")
                  .map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        category === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Tag
                        size={14}
                        color={
                          category === cat ? Colors.primary : Colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Period</Text>
              <View style={styles.periodRow}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.periodChip,
                      period === p && styles.periodChipActive,
                    ]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        period === p && styles.periodChipTextActive,
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
                <Text style={styles.submitBtnText}>Create Budget</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  budgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  budgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  budgetMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 10,
  },
  spentAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  limitAmount: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentText: {
    fontSize: 14,
    fontWeight: "700",
  },
  remainingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.primaryLight,
    fontWeight: "600",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  periodChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  periodChipTextActive: {
    color: Colors.primaryLight,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

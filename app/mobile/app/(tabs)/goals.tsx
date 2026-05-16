import {
  Calendar,
  CheckCircle2,
  Plus,
  Target,
  Trash2,
  TrendingUp,
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

export default function GoalsScreen() {
  const { goals, getGoalProgresses, addGoal, updateGoalAmount, deleteGoal } =
    useFinance();
  const [showModal, setShowModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState(
    new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0],
  );
  const [contributeAmount, setContributeAmount] = useState("");

  const progresses = getGoalProgresses();

  async function handleAdd() {
    const amt = parseFloat(targetAmount);
    if (!name.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Please fill all fields correctly.");
      return;
    }
    try {
      await addGoal({
        name: name.trim(),
        targetAmount: amt,
        deadline,
      });
      setShowModal(false);
      setName("");
      setTargetAmount("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function handleContribute() {
    const amt = parseFloat(contributeAmount);
    if (isNaN(amt) || amt <= 0 || !selectedGoalId) return;
    const goal = goals.find((g) => g.id === selectedGoalId);
    if (!goal) return;
    await updateGoalAmount(selectedGoalId, goal.currentAmount + amt);
    setShowContributeModal(false);
    setContributeAmount("");
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Savings Goals</Text>
            <Text style={styles.subtitle}>
              Track your progress toward targets
            </Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      <FlatList
        data={progresses}
        keyExtractor={(item) => item.goal.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.goalCard}
            onPress={() => {
              setSelectedGoalId(item.goal.id);
              setShowContributeModal(true);
            }}
          >
            <View style={styles.goalHeader}>
              <View
                style={[
                  styles.goalIcon,
                  {
                    backgroundColor: item.isAchieved
                      ? Colors.primaryMuted
                      : Colors.accentMuted,
                  },
                ]}
              >
                {item.isAchieved ? (
                  <CheckCircle2 size={20} color={Colors.primary} />
                ) : (
                  <Target size={20} color={Colors.accent} />
                )}
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{item.goal.name}</Text>
                <Text style={styles.goalTarget}>
                  Target: {formatCurrency(item.goal.targetAmount)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Delete Goal", "Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteGoal(item.goal.id),
                    },
                  ])
                }
              >
                <Trash2 size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.goalAmounts}>
              <View>
                <Text style={styles.amountLabel}>Saved</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(item.goal.currentAmount)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.amountLabel}>Remaining</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(
                    Math.max(
                      0,
                      item.goal.targetAmount - item.goal.currentAmount,
                    ),
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${item.percentage}%`,
                    backgroundColor: item.isAchieved
                      ? Colors.primary
                      : Colors.accent,
                  },
                ]}
              />
            </View>

            <View style={styles.goalFooter}>
              <View style={styles.footerItem}>
                <TrendingUp size={14} color={Colors.textMuted} />
                <Text style={styles.footerText}>
                  {item.percentage.toFixed(0)}% complete
                </Text>
              </View>
              <View style={styles.footerItem}>
                <Calendar size={14} color={Colors.textMuted} />
                <Text style={styles.footerText}>
                  {item.daysRemaining > 0
                    ? `${item.daysRemaining} days left`
                    : "Deadline passed"}
                </Text>
              </View>
            </View>

            {item.isAchieved && (
              <View style={styles.achievedBadge}>
                <CheckCircle2 size={14} color={Colors.primary} />
                <Text style={styles.achievedText}>Goal Achieved!</Text>
              </View>
            )}

            <View style={styles.dateRow}>
              <Calendar size={12} color={Colors.textMuted} />
              <Text style={styles.dateText}>
                Deadline: {formatDate(item.goal.deadline)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No goals yet</Text>
            <Text style={styles.emptySub}>
              Set a savings goal to stay motivated
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
              <Text style={styles.modalTitle}>New Savings Goal</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Goal Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Emergency Fund"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Target Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />

              <Text style={styles.inputLabel}>Deadline</Text>
              <TextInput
                style={styles.input}
                value={deadline}
                onChangeText={setDeadline}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
                <Text style={styles.submitBtnText}>Create Goal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showContributeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Goal</Text>
              <TouchableOpacity onPress={() => setShowContributeModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Amount to Add</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={contributeAmount}
                onChangeText={setContributeAmount}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleContribute}
              >
                <Text style={styles.submitBtnText}>Contribute</Text>
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
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  goalTarget: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  goalAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  goalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  achievedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
  },
  achievedText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
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

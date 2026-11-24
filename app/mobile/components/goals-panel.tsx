import {
  Calendar,
  CheckCircle2,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useFinance } from "@/shared/finance-context";
import { AppModal } from "@/components/app-modal";
import { Colors } from "@/constants/colors";
import { formatCurrency, formatDate, toIsoDate } from "@/shared/utils";

/**
 * When `openCreate` is true the "new" form opens once and `onCreateOpened`
 * is called so the parent can clear the request.
 */
export function GoalsPanel({
  openCreate = false,
  onCreateOpened,
}: {
  openCreate?: boolean;
  onCreateOpened?: () => void;
}) {
  const { goals, getGoalProgresses, addGoal, updateGoalAmount, deleteGoal } =
    useFinance();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (openCreate) {
      setShowModal(true);
      onCreateOpened?.();
    }
  }, [openCreate, onCreateOpened]);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState(() =>
    toIsoDate(new Date(new Date().getFullYear(), 11, 31)),
  );
  const [contributeAmount, setContributeAmount] = useState("");

  const progresses = getGoalProgresses();

  async function handleAdd() {
    const amt = parseFloat(targetAmount.replace(",", "."));
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
    const amt = parseFloat(contributeAmount.replace(",", "."));
    if (isNaN(amt) || amt <= 0 || !selectedGoalId) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    const goal = goals.find((g) => g.id === selectedGoalId);
    if (!goal) return;
    try {
      await updateGoalAmount(selectedGoalId, goal.currentAmount + amt);
      setShowContributeModal(false);
      setContributeAmount("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <View className="flex-1 bg-appBackground">
      <FlatList
        data={progresses}
        keyExtractor={(item) => item.goal.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-appSurface rounded-2xl p-4 mb-3"
            onPress={() => {
              setSelectedGoalId(item.goal.id);
              setShowContributeModal(true);
            }}
          >
            <View className="flex-row items-center gap-3 mb-3.5">
              <View
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{
                  backgroundColor: item.isAchieved
                    ? Colors.primaryMuted
                    : Colors.accentMuted,
                }}
              >
                {item.isAchieved ? (
                  <CheckCircle2 size={20} color={Colors.primary} />
                ) : (
                  <Target size={20} color={Colors.accent} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-appText">
                  {item.goal.name}
                </Text>
                <Text className="text-[13px] text-appText-muted mt-0.5">
                  Target: {formatCurrency(item.goal.targetAmount)}
                </Text>
              </View>
              <TouchableOpacity
                className="w-11 h-11 items-center justify-center -m-2"
                onPress={() =>
                  Alert.alert("Delete Goal", "Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await deleteGoal(item.goal.id);
                        } catch (e) {
                          Alert.alert("Error", (e as Error).message);
                        }
                      },
                    },
                  ])
                }
              >
                <Trash2 size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between mb-3">
              <View>
                <Text className="text-[11px] text-appText-muted uppercase tracking-wider">
                  Saved
                </Text>
                <Text className="text-lg font-bold text-appText mt-0.5">
                  {formatCurrency(item.goal.currentAmount)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[11px] text-appText-muted uppercase tracking-wider">
                  Remaining
                </Text>
                <Text className="text-lg font-bold text-appText mt-0.5">
                  {formatCurrency(
                    Math.max(
                      0,
                      item.goal.targetAmount - item.goal.currentAmount,
                    ),
                  )}
                </Text>
              </View>
            </View>

            <View className="h-2.5 bg-appSurface-highlight rounded-md overflow-hidden mb-2.5">
              <View
                className="h-full rounded-md"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.isAchieved
                    ? Colors.primary
                    : Colors.accent,
                }}
              />
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-1">
                <TrendingUp size={14} color={Colors.textMuted} />
                <Text className="text-xs text-appText-muted">
                  {item.percentage.toFixed(0)}% complete
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Calendar size={14} color={Colors.textMuted} />
                <Text className="text-xs text-appText-muted">
                  {item.daysRemaining > 0
                    ? `${item.daysRemaining} days left`
                    : "Deadline passed"}
                </Text>
              </View>
            </View>

            {item.isAchieved && (
              <View className="flex-row items-center gap-1.5 self-start bg-appPrimary-muted px-2.5 py-1 rounded-lg mt-2.5">
                <CheckCircle2 size={14} color={Colors.primary} />
                <Text className="text-xs font-bold text-appPrimary">
                  Goal Achieved!
                </Text>
              </View>
            )}

            <View className="flex-row items-center gap-1.5 mt-2.5 pt-2.5 border-t border-appBorder">
              <Calendar size={12} color={Colors.textMuted} />
              <Text className="text-xs text-appText-muted">
                Deadline: {formatDate(item.goal.deadline)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-15">
            <Text className="text-appText text-base font-semibold">
              No goals yet
            </Text>
            <Text className="text-appText-muted text-[13px] mt-1">
              Set a savings goal to stay motivated
            </Text>
          </View>
        }
      />


      <AppModal
        name="new_goal"
        visible={showModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-appText">
                New Savings Goal
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Goal Name
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                placeholder="e.g. Emergency Fund"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Target Amount
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />

              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Deadline
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                value={deadline}
                onChangeText={setDeadline}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                className="bg-appPrimary rounded-2xl py-4 items-center mt-6"
                onPress={handleAdd}
              >
                <Text className="text-white text-base font-bold">
                  Create Goal
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      <AppModal
        name="goal_contribute"
        visible={showContributeModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-appText">
                Add to Goal
              </Text>
              <TouchableOpacity
                onPress={() => setShowContributeModal(false)}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-3">
                Amount to Add
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-3.5 py-3 text-appText text-[15px] border border-appBorder"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={contributeAmount}
                onChangeText={setContributeAmount}
              />
              <TouchableOpacity
                className="bg-appPrimary rounded-2xl py-4 items-center mt-6"
                onPress={handleContribute}
              >
                <Text className="text-white text-base font-bold">
                  Contribute
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
}

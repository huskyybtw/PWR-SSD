import * as ImagePicker from "expo-image-picker";
import { ArrowDownLeft,
  ArrowUpRight,
  Camera,
  ChevronDown,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
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

export default function TransactionsScreen() {
  const {
    transactions,
    categories,
    addTransaction,
    importTransactions,
    updateTransactionCategory,
    deleteTransaction,
    addCategory,
  } = useFinance();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Uncategorized");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newCategoryName, setNewCategoryName] = useState("");

  const [importText, setImportText] = useState("");

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    if (filterCategory) {
      result = result.filter((t) => t.category === filterCategory);
    }
    return result;
  }, [transactions, search, filterCategory]);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  async function handleAddTransaction() {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0 || !newDesc.trim()) {
      Alert.alert("Error", "Please enter a valid amount and description.");
      return;
    }
    try {
      await addTransaction({
        amount,
        description: newDesc.trim(),
        date: newDate,
        type: newType,
        category: newCategory,
      });
      setShowAddModal(false);
      setNewAmount("");
      setNewDesc("");
      setNewCategory("Uncategorized");
      setNewType("expense");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function handleImportFromImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      Alert.alert(
        "Import Started",
        "Image selected. In a full implementation, OCR would extract transactions from this image.",
      );
    }
  }

  async function handleImportFromText() {
    try {
      const lines = importText.trim().split("\n");
      const imported: Array<{
        amount: number;
        description: string;
        date: string;
        type?: "expense" | "income";
      }> = [];

      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          const amount = parseFloat(parts[0]);
          const description = parts[1];
          const date = parts[2];
          const type = parts[3] as "expense" | "income" | undefined;
          if (!isNaN(amount) && description && date) {
            imported.push({ amount, description, date, type });
          }
        }
      }

      if (imported.length === 0) {
        Alert.alert(
          "No valid data",
          "Format: amount, description, YYYY-MM-DD, [expense|income]",
        );
        return;
      }

      const result = await importTransactions(imported);
      Alert.alert(
        "Import Complete",
        `Imported ${result.imported.length} transactions. Skipped ${result.skipped.length} duplicates.`,
      );
      setShowImportModal(false);
      setImportText("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName("");
  }

  return (
    <View className="flex-1 bg-appBackground">
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row justify-between items-start mb-3">
          <Text className="text-[28px] font-[800] text-appText">Transactions</Text>
          <NotificationBell />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 bg-appSurface rounded-2xl p-[14px]">
            <Text className="text-[12px] text-appText-muted mb-1">Income</Text>
            <Text className="text-[20px] font-[700] text-appPrimary">
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View className="flex-1 bg-appSurface rounded-2xl p-[14px]">
            <Text className="text-[12px] text-appText-muted mb-1">Expenses</Text>
            <Text className="text-[20px] font-[700] text-appDanger-light">
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-[10px] px-5 mb-2">
        <View className="flex-1 flex-row items-center bg-appSurface rounded-xl px-3 gap-2">
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            className="flex-1 text-appText text-[14px] py-3"
            placeholder="Search transactions..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          className={`w-[42px] h-[42px] rounded-xl items-center justify-center ${filterCategory ? "bg-appPrimary-muted" : "bg-appSurface"}`}
          onPress={() => setFilterCategory(null)}
        >
          <Filter
            size={18}
            color={filterCategory ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {filterCategory && (
        <View className="flex-row items-center self-start bg-appPrimary-muted rounded-[20px] px-3 py-1.5 ml-5 mb-2 gap-1.5">
          <Text className="text-appPrimary-light text-[12px] font-[600]">{filterCategory}</Text>
          <TouchableOpacity onPress={() => setFilterCategory(null)}>
            <X size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center gap-3 bg-appSurface rounded-[14px] p-[14px] mb-2"
            onLongPress={() => {
              Alert.alert("Delete Transaction", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteTransaction(item.id),
                },
              ]);
            }}
            onPress={() => {
              setSelectedTxId(item.id);
              setShowCategoryModal(true);
            }}
          >
            <View
              className={`w-[40px] h-[40px] rounded-[20px] items-center justify-center ${item.type === "income" ? "bg-appPrimary-muted" : "bg-appSurface-highlight"}`}
            >
              {item.type === "income" ? (
                <ArrowDownLeft size={16} color={Colors.primary} />
              ) : (
                <ArrowUpRight size={16} color={Colors.dangerLight} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-[600] text-appText">{item.description}</Text>
              <Text className="text-[12px] text-appText-muted mt-[2px]">
                {item.category} • {formatDate(item.date)}
              </Text>
            </View>
            <Text
              className={`text-[15px] font-[700] mr-1 ${item.type === "income" ? "text-appPrimary" : "text-appText"}`}
            >
              {item.type === "income" ? "+" : "-"}
              {formatCurrency(item.amount)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-15">
            <Text className="text-appText-muted text-[14px]">No transactions found</Text>
          </View>
        }
      />

      <View className="absolute right-5 bottom-6 items-end gap-3">
        <TouchableOpacity
          className="w-[56px] h-[56px] rounded-full items-center justify-center elevation-5 shadow-sm shadow-black/20 bg-appSurface-elevated border border-appBorder-light"
          onPress={() => setShowImportModal(true)}
        >
          <Camera size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-[56px] h-[56px] rounded-full items-center justify-center elevation-5 shadow-sm shadow-appPrimary/30 bg-appPrimary"
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row bg-appSurface rounded-xl p-1 mb-4">
                <TouchableOpacity
                  className={`flex-1 py-[10px] items-center rounded-[10px] ${newType === "expense" ? "bg-appSurface-elevated" : ""}`}
                  onPress={() => setNewType("expense")}
                >
                  <Text
                    className={`text-[14px] font-[600] ${newType === "expense" ? "text-appText" : "text-appText-muted"}`}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-[10px] items-center rounded-[10px] ${newType === "income" ? "bg-appSurface-elevated" : ""}`}
                  onPress={() => setNewType("income")}
                >
                  <Text
                    className={`text-[14px] font-[600] ${newType === "income" ? "text-appText" : "text-appText-muted"}`}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">Amount</Text>
              <TextInput
                className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={newAmount}
                onChangeText={setNewAmount}
              />

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">Description</Text>
              <TextInput
                className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder"
                placeholder="e.g. Grocery shopping"
                placeholderTextColor={Colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    className={`px-[14px] py-2 rounded-[20px] border ${newCategory === cat ? "bg-appPrimary-muted border-appPrimary" : "bg-appSurface border-appBorder"}`}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text
                      className={`text-[13px] ${newCategory === cat ? "text-appPrimary-light font-[600]" : "text-appText-secondary"}`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">Date</Text>
              <TextInput
                className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder"
                value={newDate}
                onChangeText={setNewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                className="bg-appPrimary rounded-[14px] py-4 items-center mt-6"
                onPress={handleAddTransaction}
              >
                <Text className="text-white text-[16px] font-[700]">Add Transaction</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showImportModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">Import Transactions</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                className="bg-appSurface rounded-2xl p-6 items-center border-[2px] border-appBorder border-dashed"
                onPress={handleImportFromImage}
              >
                <Camera size={24} color={Colors.primary} />
                <Text className="text-[15px] font-[600] text-appText mt-2.5">Import from Image</Text>
                <Text className="text-[12px] text-appText-muted mt-1">
                  Select a receipt or statement photo
                </Text>
              </TouchableOpacity>

              <Text className="text-center text-appText-muted my-4 text-[13px]">— or paste data —</Text>

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">
                Raw Data (CSV: amount, desc, date, type)
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder h-[120px] pt-3 text-top"
                multiline
                numberOfLines={6}
                placeholder="12.50, Starbucks, 2025-05-01, expense\n1200.00, Rent, 2025-05-01, expense"
                placeholderTextColor={Colors.textMuted}
                value={importText}
                onChangeText={setImportText}
              />

              <TouchableOpacity
                className="bg-appPrimary rounded-[14px] py-4 items-center mt-6"
                onPress={handleImportFromText}
              >
                <Text className="text-white text-[16px] font-[700]">Import</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">Change Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className="flex-row justify-between items-center py-4 border-b border-appBorder-light"
                  onPress={async () => {
                    if (selectedTxId) {
                      await updateTransactionCategory(selectedTxId, cat);
                    }
                    setShowCategoryModal(false);
                  }}
                >
                  <Text className="text-[16px] text-appText">{cat}</Text>
                  <ChevronDown size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              <View className="flex-row gap-3 items-center mt-4">
                <TextInput
                  className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder flex-1"
                  placeholder="New category..."
                  placeholderTextColor={Colors.textMuted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <TouchableOpacity
                  className="w-[46px] h-[46px] bg-appPrimary rounded-xl items-center justify-center"
                  onPress={handleAddCategory}
                >
                  <Plus size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


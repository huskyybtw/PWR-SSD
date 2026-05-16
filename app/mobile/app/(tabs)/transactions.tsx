import * as ImagePicker from "expo-image-picker";
import {
  ArrowDownLeft,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Transactions</Text>
          <NotificationBell />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: Colors.dangerLight }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterCategory && { backgroundColor: Colors.primaryMuted },
          ]}
          onPress={() => setFilterCategory(null)}
        >
          <Filter
            size={18}
            color={filterCategory ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {filterCategory && (
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>{filterCategory}</Text>
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
            style={styles.txCard}
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
              style={[
                styles.txIcon,
                {
                  backgroundColor:
                    item.type === "income"
                      ? Colors.primaryMuted
                      : Colors.surfaceHighlight,
                },
              ]}
            >
              {item.type === "income" ? (
                <ArrowDownLeft size={16} color={Colors.primary} />
              ) : (
                <ArrowUpRight size={16} color={Colors.dangerLight} />
              )}
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txDesc}>{item.description}</Text>
              <Text style={styles.txMeta}>
                {item.category} • {formatDate(item.date)}
              </Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                {
                  color: item.type === "income" ? Colors.primary : Colors.text,
                },
              ]}
            >
              {item.type === "income" ? "+" : "-"}
              {formatCurrency(item.amount)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabImport]}
          onPress={() => setShowImportModal(true)}
        >
          <Camera size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    newType === "expense" && styles.typeBtnActive,
                  ]}
                  onPress={() => setNewType("expense")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      newType === "expense" && styles.typeBtnTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    newType === "income" && styles.typeBtnActive,
                  ]}
                  onPress={() => setNewType("income")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      newType === "income" && styles.typeBtnTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={newAmount}
                onChangeText={setNewAmount}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grocery shopping"
                placeholderTextColor={Colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      newCategory === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        newCategory === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={newDate}
                onChangeText={setNewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddTransaction}
              >
                <Text style={styles.submitBtnText}>Add Transaction</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showImportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Transactions</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.importImageBtn}
                onPress={handleImportFromImage}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.importImageText}>Import from Image</Text>
                <Text style={styles.importImageSub}>
                  Select a receipt or statement photo
                </Text>
              </TouchableOpacity>

              <Text style={styles.orText}>— or paste data —</Text>

              <Text style={styles.inputLabel}>
                Raw Data (CSV: amount, desc, date, type)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={6}
                placeholder="12.50, Starbucks, 2025-05-01, expense\n1200.00, Rent, 2025-05-01, expense"
                placeholderTextColor={Colors.textMuted}
                value={importText}
                onChangeText={setImportText}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleImportFromText}
              >
                <Text style={styles.submitBtnText}>Import</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryOption}
                  onPress={async () => {
                    if (selectedTxId) {
                      await updateTransactionCategory(selectedTxId, cat);
                    }
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryOptionText}>{cat}</Text>
                  <ChevronDown size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              <View style={styles.addCategoryRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New category..."
                  placeholderTextColor={Colors.textMuted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <TouchableOpacity
                  style={styles.addCategoryBtn}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 20,
    marginBottom: 8,
    gap: 6,
  },
  filterChipText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: "600",
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  txMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginRight: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 24,
    alignItems: "flex-end",
    gap: 12,
  },
  fab: {
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
  fabImport: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOpacity: 0.2,
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
  typeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  typeBtnTextActive: {
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
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
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
  importImageBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  importImageText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 10,
  },
  importImageSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  orText: {
    textAlign: "center",
    color: Colors.textMuted,
    marginVertical: 16,
    fontSize: 13,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  addCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  addCategoryBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import {
  Calendar,
  Camera,
  Check,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AppModal } from "@/components/app-modal";
import { TransactionRow } from "@/components/transaction-row";
import { IncomeExpenseCards } from "@/components/income-expense-cards";
import { TransactionFilterSheet } from "@/components/transaction-filter-sheet";
import { Colors } from "@/constants/colors";
import { formatGeminiProgress, GeminiProgress } from "@/services/ai/gemini";
import {
  expenseCategories,
  INCOME_CATEGORY,
} from "@/repositories/categories-repository";
import { useFinance } from "@/shared/finance-context";
import {
  DATE_PRESET_LABELS,
  DEFAULT_FILTERS,
  filterTransactions,
  TransactionFilters,
} from "@/shared/transaction-filters";
import {
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  toIsoDate,
} from "@/shared/utils";

/** "October 2021" for a whole month, otherwise "Oct 1 – Oct 15, 2021". */
function formatRangeLabel(from: string, to: string): string {
  if (from && to && from.slice(0, 7) === to.slice(0, 7) && from.endsWith("-01")) {
    const [y, m] = from.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    if (to.endsWith(`-${String(lastDay).padStart(2, "0")}`)) {
      return formatMonthYear(from);
    }
  }
  return `${from ? formatShortDate(from) : "…"} – ${to ? formatShortDate(to) : "…"}`;
}

/** Default view of this screen: the current month, both types. */
const SCREEN_DEFAULTS: TransactionFilters = {
  ...DEFAULT_FILTERS,
  datePreset: "thisMonth",
};

function FilterChip({
  label,
  active,
  icon,
  onPress,
  onRemove,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  return (
    <TouchableOpacity
      className={`h-11 flex-row items-center gap-1.5 px-4 rounded-full border ${
        active
          ? "bg-appPrimary-muted border-appPrimary"
          : "bg-appSurface border-appBorder"
      }`}
      onPress={onPress ?? onRemove}
    >
      {icon}
      <Text
        className={`text-[13px] font-semibold ${
          active ? "text-appPrimary-light" : "text-appText-secondary"
        }`}
      >
        {label}
      </Text>
      {onRemove && <X size={14} color={Colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function TransactionsScreen() {
  const {
    transactions,
    categories,
    addTransaction,
    updateTransactionCategory,
    deleteTransaction,
    importFromReceiptImage,
    importFromStatementDocument,
    addCategory,
  } = useFinance();

  const [filters, setFilters] = useState<TransactionFilters>(SCREEN_DEFAULTS);

  // Deep links from the dashboard, e.g.
  // /transactions?type=expense&from=2021-10-01&to=2021-10-31&category=Bills&ts=123
  // `ts` makes repeated taps on the same link apply the filters again.
  const params = useLocalSearchParams<{
    type?: string;
    category?: string;
    from?: string;
    to?: string;
    ts?: string;
  }>();
  useEffect(() => {
    if (!params.ts) return;
    setFilters({
      ...SCREEN_DEFAULTS,
      type:
        params.type === "income" || params.type === "expense"
          ? params.type
          : "all",
      categories: params.category ? [params.category] : [],
      datePreset: params.from || params.to ? "custom" : "thisMonth",
      dateFrom: params.from ?? "",
      dateTo: params.to ?? "",
    });
  }, [params.ts, params.type, params.category, params.from, params.to]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Uncategorized");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newDate, setNewDate] = useState(() => toIsoDate(new Date()));
  const [newCategoryName, setNewCategoryName] = useState("");

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters],
  );
  // Anything that differs from the default view (this month, all types).
  const sheetFilterCount =
    (filters.datePreset !== SCREEN_DEFAULTS.datePreset ? 1 : 0) +
    filters.categories.length;
  const isModified =
    sheetFilterCount > 0 ||
    filters.type !== "all" ||
    filters.search.trim() !== "";
  const periodLabel =
    filters.datePreset === "custom"
      ? formatRangeLabel(filters.dateFrom, filters.dateTo)
      : DATE_PRESET_LABELS[filters.datePreset];

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const selectedTx = transactions.find((t) => t.id === selectedTxId);

  const patchFilters = (patch: Partial<TransactionFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const onAiProgress = (progress: GeminiProgress) =>
    setAiStatus(formatGeminiProgress(progress));

  async function handleAddTransaction() {
    const amount = parseFloat(newAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0 || !newDesc.trim()) {
      Alert.alert("Error", "Please enter a valid amount and description.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      Alert.alert("Error", "Date must be in YYYY-MM-DD format.");
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
      setNewDate(toIsoDate(new Date()));
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function handleImportFromImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const selectedAsset = result.assets[0];
      if (!selectedAsset.base64) {
        Alert.alert("Error", "Could not read image file data.");
        return;
      }

      setIsProcessingImage(true);
      setAiStatus("Uploading receipt…");
      const importedTx = await importFromReceiptImage(
        selectedAsset.base64,
        selectedAsset.mimeType || "image/jpeg",
        onAiProgress,
      );
      Alert.alert(
        "Receipt imported",
        `"${importedTx.description}" — ${formatCurrency(importedTx.amount)} (${importedTx.category})`,
      );
      setShowImportModal(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Receipt import failed",
        error?.message || "Could not read this receipt.",
      );
    } finally {
      setIsProcessingImage(false);
      setAiStatus("");
    }
  }

  async function handleImportFromDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const selectedFile = result.assets[0];
      setIsProcessingDoc(true);
      setAiStatus("Reading document…");

      const fileBase64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const report = await importFromStatementDocument(
        fileBase64,
        selectedFile.mimeType || "application/pdf",
        onAiProgress,
      );

      Alert.alert(
        "Import complete",
        `Imported ${report.imported.length} transaction(s). Skipped ${report.skipped.length} duplicate(s).`,
      );
      setShowImportModal(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Statement import failed",
        error?.message || "Could not read transactions from this document.",
      );
    } finally {
      setIsProcessingDoc(false);
      setAiStatus("");
    }
  }

  async function handleChangeCategory(cat: string) {
    if (!selectedTxId) return;
    try {
      await updateTransactionCategory(selectedTxId, cat);
      setShowCategoryModal(false);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const created = await addCategory(name);
      setNewCategoryName("");
      // Adding a category from this sheet also assigns it to the transaction.
      await handleChangeCategory(created);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  function confirmDelete(txId: string) {
    Alert.alert("Delete Transaction", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(txId);
            setShowCategoryModal(false);
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  }

  const isProcessing = isProcessingImage || isProcessingDoc;

  return (
    <View className="flex-1 bg-appBackground">
      {/* HEADER */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-[28px] font-[800] text-appText mb-3">
          Transactions
        </Text>
        <IncomeExpenseCards income={totalIncome} expenses={totalExpenses} />
      </View>

      {/* SEARCH (filter button lives inside the bar) */}
      <View className="px-5">
        <View className="h-12 flex-row items-center bg-appSurface rounded-full pl-4 pr-1.5 gap-2">
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            className="flex-1 text-appText text-[15px] py-0"
            placeholder="Search"
            placeholderTextColor={Colors.textMuted}
            value={filters.search}
            onChangeText={(search) => patchFilters({ search })}
            returnKeyType="search"
            autoCorrect={false}
          />
          {filters.search.length > 0 && (
            <TouchableOpacity
              onPress={() => patchFilters({ search: "" })}
              hitSlop={10}
              className="w-6 h-6 rounded-full bg-appSurface-highlight items-center justify-center"
            >
              <X size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className={`w-10 h-10 rounded-full items-center justify-center ${
              sheetFilterCount > 0 ? "bg-appPrimary" : "bg-appSurface-highlight"
            }`}
            onPress={() => setShowFilterSheet(true)}
            hitSlop={4}
          >
            <SlidersHorizontal
              size={16}
              color={sheetFilterCount > 0 ? "#fff" : Colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* TYPE CHIPS + active filter tags */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <FilterChip
            active={filters.datePreset !== SCREEN_DEFAULTS.datePreset}
            icon={<Calendar size={14} color={Colors.primaryLight} />}
            label={periodLabel}
            onPress={() => setShowFilterSheet(true)}
          />
          {(["expense", "income"] as const).map((type) => (
            <FilterChip
              key={type}
              label={type === "expense" ? "Expenses" : "Income"}
              active={filters.type === type}
              onPress={() =>
                patchFilters({ type: filters.type === type ? "all" : type })
              }
            />
          ))}
          {filters.categories.map((cat) => (
            <FilterChip
              key={cat}
              active
              label={cat}
              onRemove={() =>
                patchFilters({
                  categories: filters.categories.filter((c) => c !== cat),
                })
              }
            />
          ))}
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between px-5 pb-2 min-h-[44px]">
        <Text className="text-[12px] text-appText-muted">
          {filteredTransactions.length}{" "}
          {filteredTransactions.length === 1 ? "transaction" : "transactions"}
        </Text>
        {isModified && (
          <TouchableOpacity
            className="h-11 flex-row items-center gap-1 px-3 -mr-3"
            onPress={() => setFilters(SCREEN_DEFAULTS)}
          >
            <X size={14} color={Colors.primary} />
            <Text className="text-[13px] font-semibold text-appPrimary">
              Clear filters
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TRANSACTION LIST */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            onLongPress={() => confirmDelete(item.id)}
            onPress={() => {
              setSelectedTxId(item.id);
              setShowCategoryModal(true);
            }}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-16 gap-2">
            <Text className="text-appText text-[15px] font-semibold text-center">
              {transactions.length === 0
                ? "No transactions yet"
                : isModified
                  ? "No transactions match your filters"
                  : `No transactions in ${periodLabel.toLowerCase()}`}
            </Text>
            {transactions.length === 0 ? (
              <Text className="text-appText-muted text-[13px] text-center">
                Add one with + or import a receipt / bank statement.
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  isModified
                    ? setFilters(SCREEN_DEFAULTS)
                    : setShowFilterSheet(true)
                }
                className="mt-2 h-11 px-5 justify-center rounded-full bg-appSurface border border-appBorder"
              >
                <Text className="text-appText-secondary text-[14px] font-semibold">
                  {isModified ? "Clear filters" : "Change period"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TransactionFilterSheet
        visible={showFilterSheet}
        filters={filters}
        defaults={SCREEN_DEFAULTS}
        categories={categories}
        onApply={setFilters}
        onClose={() => setShowFilterSheet(false)}
      />

      {/* ACTION FLOATING BUTTONS */}
      <View className="absolute right-5 bottom-6 items-end gap-3">
        <TouchableOpacity
          className="w-[56px] h-[56px] rounded-full items-center justify-center elevation-5 shadow-sm shadow-black/20 bg-appSurface-elevated border border-appBorder-light"
          onPress={() => setShowImportModal(true)}
        >
          <FileText size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-[56px] h-[56px] rounded-full items-center justify-center elevation-5 shadow-sm shadow-appPrimary/30 bg-appPrimary"
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ADD TRANSACTION MODAL */}
      <AppModal
        name="add_transaction"
        visible={showAddModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">
                Add Transaction
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row bg-appSurface rounded-xl p-1 mb-4">
                <TouchableOpacity
                  className={`flex-1 h-11 justify-center items-center rounded-[10px] ${newType === "expense" ? "bg-appSurface-elevated" : ""}`}
                  onPress={() => setNewType("expense")}
                >
                  <Text
                    className={`text-[14px] font-[600] ${newType === "expense" ? "text-appText" : "text-appText-muted"}`}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 h-11 justify-center items-center rounded-[10px] ${newType === "income" ? "bg-appSurface-elevated" : ""}`}
                  onPress={() => setNewType("income")}
                >
                  <Text
                    className={`text-[14px] font-[600] ${newType === "income" ? "text-appText" : "text-appText-muted"}`}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">
                Amount
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={newAmount}
                onChangeText={setNewAmount}
              />

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">
                Description
              </Text>
              <TextInput
                className="bg-appSurface rounded-xl px-[14px] py-3 text-appText text-[15px] border border-appBorder"
                placeholder="e.g. Grocery shopping"
                placeholderTextColor={Colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">
                Category
              </Text>
              {newType === "income" ? (
                <View className="flex-row items-center gap-2 self-start px-[14px] py-2 rounded-[20px] border bg-appPrimary-muted border-appPrimary">
                  <Text className="text-[13px] text-appPrimary-light font-[600]">
                    {INCOME_CATEGORY}
                  </Text>
                  <Text className="text-[11px] text-appText-muted">
                    always used for income
                  </Text>
                </View>
              ) : (
              <View className="flex-row flex-wrap gap-2">
                {expenseCategories(categories).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    className={`px-4 h-11 justify-center rounded-[22px] border ${newCategory === cat ? "bg-appPrimary-muted border-appPrimary" : "bg-appSurface border-appBorder"}`}
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
              )}

              <Text className="text-[13px] font-[600] text-appText-secondary mb-2 mt-3">
                Date
              </Text>
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
                <Text className="text-white text-[16px] font-[700]">
                  Add Transaction
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      {/* UPDATED IMPORT TRANSACTION MODAL (NO MORE TEXT CSV RAW PASTE) */}
      <AppModal
        name="import"
        visible={showImportModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">
                Import
              </Text>
              <TouchableOpacity
                onPress={() => !isProcessing && setShowImportModal(false)}
                disabled={isProcessing}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {/* Option A: Receipt Single Image */}
              <TouchableOpacity
                className="bg-appSurface rounded-2xl p-5 items-center border-[2px] border-appBorder border-dashed"
                onPress={handleImportFromImage}
                disabled={isProcessing}
              >
                {isProcessingImage ? (
                  <View className="items-center gap-2 py-2">
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text className="text-appText-secondary text-[14px] text-center">
                      {aiStatus || "Analyzing receipt…"}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Camera size={24} color={Colors.primary} />
                    <Text className="text-[15px] font-[600] text-appText mt-2">
                      Receipt photo
                    </Text>
                    <Text className="text-[12px] text-appText-muted mt-0.5 text-center">
                      Pick a receipt image from your gallery
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Option B: Bank Statement PDF File Document */}
              <TouchableOpacity
                className="bg-appSurface rounded-2xl p-5 items-center border-[2px] border-appBorder border-dashed"
                onPress={handleImportFromDocument}
                disabled={isProcessing}
              >
                {isProcessingDoc ? (
                  <View className="items-center gap-2 py-2">
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text className="text-appText-secondary text-[14px] text-center">
                      {aiStatus || "Extracting statement rows…"}
                    </Text>
                  </View>
                ) : (
                  <>
                    <FileText size={24} color={Colors.primary} />
                    <Text className="text-[15px] font-[600] text-appText mt-2">
                      Bank statement (PDF / image)
                    </Text>
                    <Text className="text-[12px] text-appText-muted mt-0.5 text-center">
                      Supports PKO BP, Inteligo, and modern electronic
                      statements
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      {/* CHANGE CATEGORY MODAL */}
      <AppModal
        name="transaction_category"
        visible={showCategoryModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">
                Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                className="w-11 h-11 items-center justify-center -mr-2"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTx && (
                <View className="bg-appSurface rounded-xl p-3 mb-2">
                  <Text className="text-appText font-semibold" numberOfLines={1}>
                    {selectedTx.description}
                  </Text>
                  <Text className="text-appText-muted text-[12px] mt-0.5">
                    {formatCurrency(selectedTx.amount)} •{" "}
                    {formatShortDate(selectedTx.date)}
                  </Text>
                </View>
              )}
              {selectedTx?.type === "income" && (
                <Text className="text-[13px] text-appText-muted py-3">
                  Income transactions always use the "{INCOME_CATEGORY}" category.
                </Text>
              )}
              {(selectedTx?.type === "income"
                ? [INCOME_CATEGORY]
                : expenseCategories(categories)
              ).map((cat) => {
                const isCurrent = selectedTx?.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    className="flex-row justify-between items-center py-4 border-b border-appBorder-light"
                    onPress={() => handleChangeCategory(cat)}
                  >
                    <Text
                      className={`text-[16px] ${isCurrent ? "text-appPrimary-light font-semibold" : "text-appText"}`}
                    >
                      {cat}
                    </Text>
                    {isCurrent && <Check size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              {selectedTx?.type !== "income" && (
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
              )}
              {selectedTxId && (
                <TouchableOpacity
                  className="mt-5 py-3.5 items-center rounded-xl border border-appDanger"
                  onPress={() => confirmDelete(selectedTxId)}
                >
                  <Text className="text-appDanger-light font-semibold">
                    Delete transaction
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
}

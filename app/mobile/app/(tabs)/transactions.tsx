import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  ChevronDown,
  FileText,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useFinance } from "@/app/_finance-context";
import { NotificationBell } from "@/components/notification-bell";
import { Colors } from "@/constants/colors";
import { formatCurrency, formatDate } from "@/shared/utils";

export default function TransactionsScreen() {
  const {
    transactions,
    categories,
    addTransaction,
    importTransactions,
    updateTransactionCategory,
    deleteTransaction,
    importFromReceiptImage,
    importFromStatementDocument,
    addCategory,
  } = useFinance();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Uncategorized");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newCategoryName, setNewCategoryName] = useState("");

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
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const selectedAsset = result.assets[0];
    if (!selectedAsset.base64) {
      Alert.alert("Error", "Could not read image file data.");
      return;
    }

    const mimeType = selectedAsset.mimeType || "image/jpeg";
    setIsProcessingImage(true);

    try {
      const importedTx = await importFromReceiptImage(
        selectedAsset.base64,
        mimeType,
      );
      Alert.alert(
        "Success",
        `Imported "${importedTx.description}" for ${formatCurrency(importedTx.amount)}!`,
      );
      setShowImportModal(false);
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error?.message || "Gemini AI was unable to parse this receipt.";
      Alert.alert("Processing Failed", errorMessage);
    } finally {
      setIsProcessingImage(false);
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

      const fileBase64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const mimeType = selectedFile.mimeType || "application/pdf";

      const report = await importFromStatementDocument(fileBase64, mimeType);

      Alert.alert(
        "Import Complete",
        `Successfully integrated ${report.imported.length} new statement rows. Skipped ${report.skipped.length} existing duplicates.`,
      );
      setShowImportModal(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Document Parsing Failed",
        error?.message || "Could not successfully evaluate statement records.",
      );
    } finally {
      setIsProcessingDoc(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName("");
  }

  return (
    <View className="flex-1 bg-appBackground">
      {/* HEADER SECTION */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row justify-between items-start mb-3">
          <Text className="text-[28px] font-[800] text-appText">
            Transactions
          </Text>
          {/* <NotificationBell /> */}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 bg-appSurface rounded-2xl p-[14px]">
            <Text className="text-[12px] text-appText-muted mb-1">Income</Text>
            <Text className="text-[20px] font-[700] text-appPrimary">
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View className="flex-1 bg-appSurface rounded-2xl p-[14px]">
            <Text className="text-[12px] text-appText-muted mb-1">
              Expenses
            </Text>
            <Text className="text-[20px] font-[700] text-appDanger-light">
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* FILTER & SEARCH */}
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
      </View>

      {filterCategory && (
        <View className="flex-row items-center self-start bg-appPrimary-muted rounded-[20px] px-3 py-1.5 ml-5 mb-2 gap-1.5">
          <Text className="text-appPrimary-light text-[12px] font-[600]">
            {filterCategory}
          </Text>
          <TouchableOpacity onPress={() => setFilterCategory(null)}>
            <X size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* TRANSACTION LIST */}
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
              <Text className="text-[14px] font-[600] text-appText">
                {item.description}
              </Text>
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
            <Text className="text-appText-muted text-[14px]">
              No transactions found
            </Text>
          </View>
        }
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
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">
                Add Transaction
              </Text>
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
      </Modal>

      {/* UPDATED IMPORT TRANSACTION MODAL (NO MORE TEXT CSV RAW PASTE) */}
      <Modal visible={showImportModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">
                AI Financial Document Import
              </Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
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
                disabled={isProcessingImage || isProcessingDoc}
              >
                {isProcessingImage ? (
                  <View className="items-center gap-2 py-2">
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text className="text-appText-secondary text-[14px]">
                      Analyzing Receipt details...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Camera size={24} color={Colors.primary} />
                    <Text className="text-[15px] font-[600] text-appText mt-2">
                      Single Receipt Image Scan
                    </Text>
                    <Text className="text-[12px] text-appText-muted mt-0.5 text-center">
                      Extract items from checkout snapshots & store receipts
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Option B: Bank Statement PDF File Document */}
              <TouchableOpacity
                className="bg-appSurface rounded-2xl p-5 items-center border-[2px] border-appBorder border-dashed"
                onPress={handleImportFromDocument}
                disabled={isProcessingImage || isProcessingDoc}
              >
                {isProcessingDoc ? (
                  <View className="items-center gap-2 py-2">
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text className="text-appText-secondary text-[14px]">
                      Extracting Statement Table rows...
                    </Text>
                  </View>
                ) : (
                  <>
                    <FileText size={24} color={Colors.primary} />
                    <Text className="text-[15px] font-[600] text-appText mt-2">
                      Bank Statement PDF Document
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
      </Modal>

      {/* CHANGE CATEGORY MODAL */}
      <Modal visible={showCategoryModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-10 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-[700] text-appText">
                Change Category
              </Text>
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

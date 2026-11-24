import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { AppModal } from "@/components/app-modal";
import { Colors } from "@/constants/colors";
import {
  DATE_PRESET_LABELS,
  DatePreset,
  DEFAULT_FILTERS,
  TransactionFilters,
} from "@/shared/transaction-filters";

const SIMPLE_PRESETS: DatePreset[] = [
  "thisMonth",
  "lastMonth",
  "thisYear",
  "all",
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`h-11 justify-center px-4 rounded-full border ${
        active
          ? "bg-appPrimary-muted border-appPrimary"
          : "bg-appSurface border-appBorder"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-[13px] ${
          active ? "text-appPrimary-light font-semibold" : "text-appText-secondary"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[13px] font-semibold text-appText-secondary mb-2 mt-5">
      {children}
    </Text>
  );
}

export function TransactionFilterSheet({
  visible,
  filters,
  defaults = DEFAULT_FILTERS,
  categories,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: TransactionFilters;
  /** What "Reset" goes back to. */
  defaults?: TransactionFilters;
  categories: string[];
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}) {
  // Edits are kept in a draft and only applied on "Show results".
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const update = (patch: Partial<TransactionFilters>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const toggleCategory = (cat: string) =>
    update({
      categories: draft.categories.includes(cat)
        ? draft.categories.filter((c) => c !== cat)
        : [...draft.categories, cat],
    });

  return (
    <AppModal
        name="transaction_filters"
        visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-appSurface-elevated rounded-t-3xl px-5 pt-5 pb-8 max-h-[88%]">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xl font-bold text-appText">Filters</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-11 h-11 items-center justify-center -mr-2"
            >
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SectionLabel>Date</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {SIMPLE_PRESETS.map((p) => (
                <Chip
                  key={p}
                  label={DATE_PRESET_LABELS[p]}
                  active={draft.datePreset === p}
                  onPress={() => update({ datePreset: p })}
                />
              ))}
            </View>
            <SectionLabel>Categories</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  active={draft.categories.includes(cat)}
                  onPress={() => toggleCategory(cat)}
                />
              ))}
            </View>

          </ScrollView>

          <View className="flex-row gap-3 mt-5">
            <TouchableOpacity
              className="flex-1 py-4 items-center rounded-2xl border border-appBorder-light"
              onPress={() =>
                setDraft({
                  ...defaults,
                  search: draft.search,
                  type: draft.type,
                })
              }
            >
              <Text className="text-appText font-semibold">Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-[2] py-4 items-center rounded-2xl bg-appPrimary"
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            >
              <Text className="text-white font-bold">Show results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AppModal>
  );
}

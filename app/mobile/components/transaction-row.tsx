import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { Transaction } from "@/shared/types/finance";
import { formatCurrency, formatShortDate } from "@/shared/utils";

/** One transaction line, used on the Dashboard and the Transactions list. */
export function TransactionRow({
  tx,
  onPress,
  onLongPress,
}: {
  tx: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const isIncome = tx.type === "income";
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 bg-appSurface rounded-[14px] p-[14px] mb-2"
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      activeOpacity={0.7}
    >
      <CategoryIcon category={tx.category} isIncome={isIncome} />
      <View className="flex-1">
        <Text className="text-[14px] font-[600] text-appText" numberOfLines={1}>
          {tx.description}
        </Text>
        <Text
          className="text-[12px] text-appText-muted mt-[2px]"
          numberOfLines={1}
        >
          {tx.category} • {formatShortDate(tx.date)}
        </Text>
      </View>
      <Text
        className={`text-[15px] font-[700] ${isIncome ? "text-appPrimary" : "text-appDanger-light"}`}
      >
        {isIncome ? "+" : "-"}
        {formatCurrency(tx.amount)}
      </Text>
    </TouchableOpacity>
  );
}

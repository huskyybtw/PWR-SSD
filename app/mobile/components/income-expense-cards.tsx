import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { formatCurrency } from "@/shared/utils";

function Card({
  label,
  amount,
  amountClassName,
  onPress,
}: {
  label: string;
  amount: number;
  amountClassName: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-1 bg-appSurface rounded-2xl p-[14px] border border-appBorder"
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text className="text-[12px] text-appText-muted mb-1">{label}</Text>
      <Text
        className={`text-[20px] font-[700] ${amountClassName}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCurrency(amount)}
      </Text>
    </TouchableOpacity>
  );
}

/** Income / Expenses summary used on Dashboard, Transactions and Reports. */
export function IncomeExpenseCards({
  income,
  expenses,
  onPressIncome,
  onPressExpenses,
}: {
  income: number;
  expenses: number;
  onPressIncome?: () => void;
  onPressExpenses?: () => void;
}) {
  return (
    <View className="flex-row gap-3">
      <Card
        label="Income"
        amount={income}
        amountClassName="text-appPrimary"
        onPress={onPressIncome}
      />
      <Card
        label="Expenses"
        amount={expenses}
        amountClassName="text-appDanger-light"
        onPress={onPressExpenses}
      />
    </View>
  );
}

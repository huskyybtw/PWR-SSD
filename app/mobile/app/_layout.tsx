import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { TouchCapture } from "@/components/uat/touch-capture";
import { UatOverlay } from "@/components/uat/uat-overlay";
import { Colors } from "@/constants/colors";
import { bootstrapApp } from "@/shared/bootstrap";
import { FinanceProvider } from "@/shared/finance-context";
import { installAlertLogging } from "@/shared/uat/recorder";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Dev builds: log native alerts during UAT sessions.
if (__DEV__) installAlertLogging();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function DatabaseErrorScreen({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
      }}
    >
      <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700" }}>
        Could not open the database
      </Text>
      <Text style={{ color: Colors.textMuted, textAlign: "center" }}>
        {error}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: Colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
          marginTop: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    try {
      await bootstrapApp();
      setStatus("ready");
    } catch (e) {
      console.error("Database init failed", e);
      setError((e as Error)?.message ?? String(e));
      setStatus("error");
    } finally {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Data services must not start before migrations have run.
  if (status === "loading") return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        {status === "error" ? (
          <DatabaseErrorScreen error={error} onRetry={bootstrap} />
        ) : (
          <FinanceProvider>
            <TouchCapture style={{ flex: 1 }}>
              <RootLayoutNav />
              {__DEV__ && <UatOverlay />}
            </TouchCapture>
          </FinanceProvider>
        )}
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

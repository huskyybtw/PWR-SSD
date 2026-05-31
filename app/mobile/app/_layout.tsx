import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { FinanceProvider } from "@/app/_finance-context";
import { initDatabase } from "@/shared/client";
import "../global.css";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
      } catch (error) {
        console.error("Database init failed", error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    bootstrap();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FinanceProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </FinanceProvider>
    </QueryClientProvider>
  );
}

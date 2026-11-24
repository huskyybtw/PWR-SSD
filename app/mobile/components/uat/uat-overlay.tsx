import { useGlobalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { formatMs } from "@/shared/uat/format";
import * as uat from "@/shared/uat/recorder";

function useRecorderState() {
  const [state, setState] = useState(uat.getState());
  useEffect(() => uat.subscribe(setState), []);
  return state;
}

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt === null ? 0 : now - startedAt;
}

/**
 * Dev-only UAT controls (rendered only when __DEV__):
 *  idle      → "UAT" pill → starts recording immediately
 *  recording → red "● 1:23 Stop" pill → stops immediately
 *  stopped   → sheet: session name + Save / Discard
 */
export function UatOverlay() {
  const insets = useSafeAreaInsets();
  const state = useRecorderState();
  const elapsed = useElapsed(state.recording ? state.startedAt : null);
  const [name, setName] = useState("");

  // Log every screen change.
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  useEffect(() => {
    uat.setScreen(pathname, params as Record<string, unknown>);
  }, [pathname, params]);

  const showSaveSheet = state.status === "stopped" || state.status === "saving";

  async function handleSave() {
    try {
      const res = await uat.save(name);
      if (res.status === "no_folder") {
        Alert.alert(
          "No folder chosen",
          'Pick the folder Download/uat_tests (create it in the picker if needed) so the session can be saved.',
        );
        return;
      }
      setName("");
      Alert.alert(
        "Session saved",
        `${res.folder}\n\nRun "npm run uat:pull" on your computer to copy it into the repo.`,
      );
    } catch (e) {
      Alert.alert("Saving failed", (e as Error).message);
    }
  }

  function handleDiscard() {
    Alert.alert("Discard session?", "The recorded log will be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          uat.discard();
          setName("");
        },
      },
    ]);
  }

  return (
    <>
      {/* Floating pill. Its own touches are not logged. */}
      <View
        pointerEvents="box-none"
        onTouchStart={uat.ignoreCurrentTouch}
        style={{
          position: "absolute",
          left: 12,
          bottom: insets.bottom + 68,
          zIndex: 1000,
          elevation: 1000,
        }}
      >
        {state.recording ? (
          <TouchableOpacity
            onPress={() => uat.stop()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: 22,
              backgroundColor: "#B91C1C",
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />
            <Text style={{ color: "#fff", fontWeight: "700", fontVariant: ["tabular-nums"] }}>
              {formatMs(elapsed).replace(/\.\d$/, "")}
            </Text>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Stop</Text>
          </TouchableOpacity>
        ) : state.status === "idle" ? (
          <TouchableOpacity
            onPress={() => uat.start()}
            style={{
              height: 44,
              paddingHorizontal: 14,
              borderRadius: 22,
              justifyContent: "center",
              backgroundColor: "rgba(30,41,59,0.9)",
              borderWidth: 1,
              borderColor: Colors.borderLight,
            }}
          >
            <Text style={{ color: Colors.textSecondary, fontWeight: "700", fontSize: 12 }}>
              UAT
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Save / discard sheet after Stop */}
      <Modal visible={showSaveSheet} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        >
          <View
            style={{
              backgroundColor: Colors.surfaceElevated,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 20 + insets.bottom,
              gap: 12,
            }}
          >
            <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700" }}>
              Recording stopped
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
              Duration{" "}
              {formatMs((state.endedAt ?? 0) - (state.startedAt ?? 0)).replace(/\.\d$/, "")}.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Session name, e.g. P1 T1-T4"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              style={{
                height: 48,
                borderRadius: 12,
                paddingHorizontal: 14,
                color: Colors.text,
                fontSize: 15,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={handleDiscard}
                disabled={state.status === "saving"}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: Colors.danger,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: Colors.dangerLight, fontWeight: "700" }}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={state.status === "saving" || !name.trim()}
                style={{
                  flex: 2,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: name.trim() ? Colors.primary : Colors.surfaceHighlight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {state.status === "saving" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Save session</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

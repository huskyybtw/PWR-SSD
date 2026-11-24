jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.0.0" } },
}));

const mockStorage = {
  root: null as string | null,
  chosen: "content://downloads" as string | null,
  writes: [] as { root: string; name: string; files: Record<string, string> }[],
  failNextWrite: false,
};
jest.mock("./storage", () => ({
  getSavedRoot: jest.fn(async () => mockStorage.root),
  chooseRoot: jest.fn(async () => {
    mockStorage.root = mockStorage.chosen;
    return mockStorage.chosen;
  }),
  writeSession: jest.fn(async (root: string, name: string, files: Record<string, string>) => {
    if (mockStorage.failNextWrite) {
      mockStorage.failNextWrite = false;
      throw new Error("permission lost");
    }
    mockStorage.writes.push({ root, name, files });
    return { folder: `Download/uat_tests/sessions/${name}`, name };
  }),
}));

import { Alert } from "react-native";

import * as recorder from "./recorder";
import { chooseRoot } from "./storage";

beforeEach(() => {
  recorder.__resetForTests();
  mockStorage.root = null;
  mockStorage.chosen = "content://downloads";
  mockStorage.writes = [];
  mockStorage.failNextWrite = false;
  (chooseRoot as jest.Mock).mockClear();
});

describe("UAT recorder", () => {
  it("ignores events while not recording", () => {
    recorder.logAppEvent("transaction_added");
    recorder.onTouchStart(1, 1);
    recorder.onTouchEnd(1, 1);
    expect(recorder.__getEventsForTests()).toHaveLength(0);
  });

  it("records taps, screens and modals with relative timestamps", () => {
    recorder.start();
    recorder.setScreen("/transactions");
    recorder.openModal("filters");
    recorder.onTouchStart(100, 200);
    recorder.onTouchEnd(102, 201);
    recorder.closeModal("filters");

    const events = recorder.__getEventsForTests();
    expect(events.map((e) => e.type)).toEqual([
      "session_start",
      "screen",
      "screen",
      "modal_open",
      "tap",
      "modal_close",
    ]);
    const tap = events.find((e) => e.type === "tap")!;
    expect(tap).toMatchObject({ screen: "/transactions", modal: "filters", x: 100, y: 200 });
    expect(tap.t).toBeGreaterThanOrEqual(0);
  });

  it("does not log touches the overlay asked to ignore", () => {
    recorder.start();
    recorder.ignoreCurrentTouch();
    recorder.onTouchStart(5, 5);
    recorder.onTouchEnd(5, 5);
    expect(recorder.__getEventsForTests().some((e) => e.type === "tap")).toBe(false);
  });

  it("logs native alerts and the chosen button", () => {
    const nativeAlert = jest.fn();
    Alert.alert = nativeAlert;
    recorder.installAlertLogging();

    recorder.start();
    const onPress = jest.fn();
    Alert.alert("Import complete", "Imported 3", [{ text: "OK", onPress }]);
    const buttons = nativeAlert.mock.calls[0][2] as { onPress: () => void }[];
    buttons[0].onPress();

    const events = recorder.__getEventsForTests();
    expect(events.find((e) => e.type === "alert_shown")?.data).toMatchObject({
      title: "Import complete",
      message: "Imported 3",
      buttons: ["OK"],
    });
    expect(events.find((e) => e.type === "alert_button")?.data).toMatchObject({ button: "OK" });
    expect(onPress).toHaveBeenCalled();
  });

  it("stop → save asks for a folder once and writes the 3 files", async () => {
    recorder.start();
    recorder.stop();
    expect(recorder.getState().status).toBe("stopped");

    const res = await recorder.save("P1 – Kasia");
    expect(res).toEqual({
      status: "saved",
      folder: "Download/uat_tests/sessions/p1-kasia",
    });
    expect(chooseRoot).toHaveBeenCalledTimes(1);
    const write = mockStorage.writes[0];
    expect(write.root).toBe("content://downloads");
    expect(Object.keys(write.files)).toEqual(["session.json", "events.csv", "summary.md"]);
    expect(JSON.parse(write.files["session.json"]).meta.name).toBe("P1 – Kasia");
    expect(write.files["summary.md"]).toContain("# UAT session: P1 – Kasia");
    expect(recorder.getState().status).toBe("idle");

    // second session reuses the remembered folder
    recorder.start();
    recorder.stop();
    await recorder.save("P2");
    expect(chooseRoot).toHaveBeenCalledTimes(1);
  });

  it("asks for the folder again when access was lost", async () => {
    mockStorage.root = "content://old";
    mockStorage.failNextWrite = true;
    recorder.start();
    recorder.stop();
    const res = await recorder.save("p3");
    expect(res.status).toBe("saved");
    expect(chooseRoot).toHaveBeenCalledTimes(1);
    expect(mockStorage.writes[0].root).toBe("content://downloads");
  });

  it("keeps the session when no folder is chosen", async () => {
    mockStorage.chosen = null;
    recorder.start();
    recorder.stop();
    expect(await recorder.save("p4")).toEqual({ status: "no_folder" });
    expect(recorder.getState().status).toBe("stopped");
  });

  it("discard drops the stopped session", () => {
    recorder.start();
    recorder.stop();
    recorder.discard();
    expect(recorder.getState().status).toBe("idle");
    expect(recorder.__getEventsForTests()).toHaveLength(0);
  });
});

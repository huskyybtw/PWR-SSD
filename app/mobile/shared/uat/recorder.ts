/**
 * Dev-only UAT session recorder (runs fully on the device).
 *
 * Collects taps, screen changes, modals, native alerts and app events in
 * memory while a session runs. After Stop the moderator names the session and
 * saves or discards it. Saved sessions go to shared storage
 * (<picked folder>/uat_tests/sessions/<name>/), and `npm run uat:pull` copies
 * them - together with the matching Android screen recordings - into the repo.
 *
 * Every public logging function is a cheap no-op when no session is recording.
 */
import Constants from "expo-constants";
import { Alert, Platform } from "react-native";

import {
  buildSummary,
  classifyTouch,
  eventsToCsv,
  sanitizeId,
  UatEvent,
  UatEventType,
  UatSessionMeta,
} from "./format";
import { chooseRoot, getSavedRoot, writeSession } from "./storage";

export type RecorderStatus = "idle" | "recording" | "stopped" | "saving";

export type RecorderState = {
  status: RecorderStatus;
  /** convenience: status === "recording" */
  recording: boolean;
  startedAt: number | null;
  endedAt: number | null;
};

type Listener = (state: RecorderState) => void;

const INITIAL_STATE: RecorderState = {
  status: "idle",
  recording: false,
  startedAt: null,
  endedAt: null,
};
let state: RecorderState = INITIAL_STATE;
let sessionId = "";
let events: UatEvent[] = [];
let currentScreen = "/";
const modalStack: string[] = [];
const listeners = new Set<Listener>();

let touchStart: { x: number; y: number; t: number } | null = null;
let ignoreTouch = false;

// ---------- state ----------

function setState(patch: Partial<RecorderState>) {
  state = { ...state, ...patch };
  state.recording = state.status === "recording";
  listeners.forEach((l) => l(state));
}

export function getState(): RecorderState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isRecording(): boolean {
  return state.recording;
}

// ---------- logging ----------

export function logEvent(
  type: UatEventType,
  data?: Record<string, unknown>,
  coords?: { x: number; y: number },
) {
  if (!state.recording || state.startedAt === null) return;
  const now = Date.now();
  events.push({
    t: now - state.startedAt,
    time: new Date(now).toISOString(),
    type,
    screen: currentScreen,
    modal: modalStack[modalStack.length - 1],
    ...(coords ? { x: coords.x, y: coords.y } : {}),
    ...(data ? { data } : {}),
  });
}

/** Named app-level event, e.g. logAppEvent("import_statement", { imported: 3 }). */
export function logAppEvent(name: string, data: Record<string, unknown> = {}) {
  logEvent("app_event", { name, ...data });
}

export function setScreen(pathname: string, params?: Record<string, unknown>) {
  if (pathname === currentScreen) return;
  currentScreen = pathname;
  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([k]) => k !== "ts"))
    : undefined;
  logEvent(
    "screen",
    cleanParams && Object.keys(cleanParams).length ? { params: cleanParams } : undefined,
  );
}

export function openModal(name: string) {
  modalStack.push(name);
  logEvent("modal_open", { name });
}

export function closeModal(name: string) {
  const i = modalStack.lastIndexOf(name);
  if (i === -1) return;
  logEvent("modal_close", { name });
  modalStack.splice(i, 1);
}

// ---------- touches ----------

/** Called by the overlay so its own touches are not logged. */
export function ignoreCurrentTouch() {
  ignoreTouch = true;
}

export function onTouchStart(x: number, y: number) {
  if (!state.recording) return;
  touchStart = { x, y, t: Date.now() };
}

export function onTouchEnd(x: number, y: number) {
  if (!state.recording) {
    ignoreTouch = false;
    return;
  }
  const start = touchStart;
  touchStart = null;
  if (ignoreTouch) {
    ignoreTouch = false;
    return;
  }
  if (!start) return;
  const end = { x, y, t: Date.now() };
  const kind = classifyTouch(start, end);
  logEvent(
    kind,
    kind === "swipe"
      ? { dx: Math.round(x - start.x), dy: Math.round(y - start.y), ms: end.t - start.t }
      : kind === "long_press"
        ? { ms: end.t - start.t }
        : undefined,
    { x: start.x, y: start.y },
  );
}

// ---------- native alerts ----------

let alertPatched = false;

/** Wraps Alert.alert so dialogs and the chosen button are logged. */
export function installAlertLogging() {
  if (alertPatched) return;
  alertPatched = true;
  const original = Alert.alert.bind(Alert);
  Alert.alert = ((title, message, buttons, options) => {
    if (state.recording) {
      logEvent("alert_shown", {
        title,
        ...(message ? { message } : {}),
        ...(buttons?.length ? { buttons: buttons.map((b) => b.text ?? "") } : {}),
      });
      if (buttons?.length) {
        buttons = buttons.map((b) => ({
          ...b,
          onPress: (value?: unknown) => {
            logEvent("alert_button", { title, button: b.text ?? "" });
            return (b.onPress as ((v?: unknown) => void) | undefined)?.(value);
          },
        }));
      }
    }
    return original(title, message, buttons, options);
  }) as typeof Alert.alert;
}

// ---------- session lifecycle ----------

function deviceInfo(): Record<string, unknown> {
  const c = (Platform as any).constants ?? {};
  return {
    os: Platform.OS,
    osVersion: Platform.Version,
    ...(c.Model ? { model: c.Model } : {}),
    ...(c.Brand ? { brand: c.Brand } : {}),
  };
}

function makeSessionId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function start() {
  if (state.status !== "idle") return;
  sessionId = makeSessionId();
  events = [];
  modalStack.length = 0;
  touchStart = null;
  setState({ ...INITIAL_STATE, status: "recording", startedAt: Date.now() });
  logEvent("session_start");
  logEvent("screen");
}

/** Stops logging. The session then waits for save(name) or discard(). */
export function stop() {
  if (state.status !== "recording") return;
  logEvent("session_end");
  setState({ status: "stopped", endedAt: Date.now() });
}

/** Builds the files of the stopped session (exported for tests). */
export function buildSessionFiles(name: string): Record<string, string> {
  if (state.startedAt === null) throw new Error("No session to save.");
  const endedAt = state.endedAt ?? Date.now();
  const meta: UatSessionMeta = {
    sessionId,
    name,
    startedAt: new Date(state.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMs: endedAt - state.startedAt,
    device: deviceInfo(),
    appVersion: Constants.expoConfig?.version,
  };
  return {
    "session.json": JSON.stringify({ meta, events }, null, 2),
    "events.csv": eventsToCsv(events),
    "summary.md": buildSummary(meta, events),
  };
}

export type SaveResult =
  | { status: "saved"; folder: string }
  | { status: "no_folder" };

/**
 * Saves the stopped session as <picked folder>/uat_tests/sessions/<name>/.
 * Asks for the folder the first time (or when access was lost).
 */
export async function save(name: string): Promise<SaveResult> {
  if (state.status !== "stopped") throw new Error("Stop the recording first.");
  const displayName = name.trim() || sessionId;
  const folderName = sanitizeId(displayName);
  const files = buildSessionFiles(displayName);
  setState({ status: "saving" });

  try {
    let root = await getSavedRoot();
    if (!root) root = await chooseRoot();
    if (!root) {
      setState({ status: "stopped" });
      return { status: "no_folder" };
    }
    try {
      const res = await writeSession(root, folderName, files);
      reset();
      return { status: "saved", folder: res.folder };
    } catch {
      // Access to the remembered folder was lost: ask again once.
      const again = await chooseRoot();
      if (!again) {
        setState({ status: "stopped" });
        return { status: "no_folder" };
      }
      const res = await writeSession(again, folderName, files);
      reset();
      return { status: "saved", folder: res.folder };
    }
  } catch (e) {
    setState({ status: "stopped" });
    throw e;
  }
}

/** Throws the stopped session away. */
export function discard() {
  if (state.status !== "stopped") return;
  reset();
}

function reset() {
  sessionId = "";
  events = [];
  modalStack.length = 0;
  touchStart = null;
  setState({ ...INITIAL_STATE });
}

/** For tests only. */
export function __resetForTests() {
  state = { ...INITIAL_STATE };
  sessionId = "";
  events = [];
  currentScreen = "/";
  modalStack.length = 0;
  touchStart = null;
  ignoreTouch = false;
}

export function __getEventsForTests(): UatEvent[] {
  return events;
}

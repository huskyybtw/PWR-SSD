/**
 * Pure helpers for UAT session logs (no React Native imports, unit tested).
 * The app builds events.csv and summary.md with these and sends them to the
 * UAT server, which only writes files.
 */

export type UatEventType =
  | "session_start"
  | "session_end"
  | "screen"
  | "tap"
  | "long_press"
  | "swipe"
  | "modal_open"
  | "modal_close"
  | "alert_shown"
  | "alert_button"
  | "app_event"
  | "error";

export interface UatEvent {
  /** ms since session start */
  t: number;
  /** ISO wall-clock time on the device */
  time: string;
  type: UatEventType;
  /** route (pathname) at the moment of the event */
  screen: string;
  /** modal name if the event happened inside a modal */
  modal?: string;
  x?: number;
  y?: number;
  data?: Record<string, unknown>;
}

export interface UatSessionMeta {
  sessionId: string;
  /** Session name entered when the recording was stopped. */
  name: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  device: Record<string, unknown>;
  appVersion?: string;
}

// ---------- touch classification ----------

export const TAP_MAX_MOVE = 12; // px
export const LONG_PRESS_MS = 500;

export function classifyTouch(
  start: { x: number; y: number; t: number },
  end: { x: number; y: number; t: number },
): "tap" | "long_press" | "swipe" {
  const moved = Math.hypot(end.x - start.x, end.y - start.y);
  if (moved > TAP_MAX_MOVE) return "swipe";
  return end.t - start.t >= LONG_PRESS_MS ? "long_press" : "tap";
}

// ---------- CSV ----------

export function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function detailOf(e: UatEvent): string {
  const parts: string[] = [];
  if (e.modal) parts.push(`modal=${e.modal}`);
  if (e.data) {
    for (const [k, v] of Object.entries(e.data)) {
      if (k === "name" && v === e.modal) continue;
      parts.push(`${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
  }
  return parts.join("; ");
}

export function eventsToCsv(events: UatEvent[]): string {
  const header = "t_ms,time,type,screen,x,y,detail";
  const rows = events.map((e) =>
    [
      e.t,
      e.time,
      e.type,
      e.screen,
      e.x !== undefined ? Math.round(e.x) : "",
      e.y !== undefined ? Math.round(e.y) : "",
      detailOf(e),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

// ---------- summary ----------

export interface UatStats {
  durationMs: number;
  taps: number;
  longPresses: number;
  swipes: number;
  tapsByScreen: Record<string, number>;
  screenTimeline: { screen: string; from: number; durationMs: number }[];
  modals: { name: string; t: number }[];
  alerts: { t: number; title: string; message?: string; button?: string }[];
  errors: { t: number; detail: string }[];
  appEvents: { t: number; name: string; detail: string }[];
}

const ERROR_WORDS = /(fail|error|błąd|invalid|could not|unable)/i;

export function computeStats(events: UatEvent[], durationMs: number): UatStats {
  const stats: UatStats = {
    durationMs,
    taps: 0,
    longPresses: 0,
    swipes: 0,
    tapsByScreen: {},
    screenTimeline: [],
    modals: [],
    alerts: [],
    errors: [],
    appEvents: [],
  };

  for (const e of events) {
    switch (e.type) {
      case "tap": {
        stats.taps++;
        const key = e.modal ? `${e.screen} › ${e.modal}` : e.screen;
        stats.tapsByScreen[key] = (stats.tapsByScreen[key] ?? 0) + 1;
        break;
      }
      case "long_press":
        stats.longPresses++;
        break;
      case "swipe":
        stats.swipes++;
        break;
      case "screen": {
        const prev = stats.screenTimeline[stats.screenTimeline.length - 1];
        if (prev && prev.screen === e.screen) break;
        if (prev) prev.durationMs = e.t - prev.from;
        stats.screenTimeline.push({ screen: e.screen, from: e.t, durationMs: 0 });
        break;
      }
      case "modal_open":
        stats.modals.push({ name: e.modal ?? String(e.data?.name ?? "modal"), t: e.t });
        break;
      case "alert_shown": {
        const title = String(e.data?.title ?? "");
        const message = e.data?.message ? String(e.data.message) : undefined;
        stats.alerts.push({ t: e.t, title, message });
        if (ERROR_WORDS.test(title) || ERROR_WORDS.test(message ?? "")) {
          stats.errors.push({ t: e.t, detail: `${title}${message ? `: ${message}` : ""}` });
        }
        break;
      }
      case "alert_button": {
        const last = [...stats.alerts].reverse().find((a) => !a.button);
        if (last) last.button = String(e.data?.button ?? "");
        break;
      }
      case "app_event": {
        const name = String(e.data?.name ?? "event");
        const { name: _omit, ...rest } = e.data ?? {};
        const detail = Object.entries(rest)
          .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join(", ");
        stats.appEvents.push({ t: e.t, name, detail });
        if (rest.error) stats.errors.push({ t: e.t, detail: `${name}: ${String(rest.error)}` });
        break;
      }
      case "error":
        stats.errors.push({ t: e.t, detail: String(e.data?.message ?? "error") });
        break;
    }
  }

  const last = stats.screenTimeline[stats.screenTimeline.length - 1];
  if (last) last.durationMs = Math.max(0, durationMs - last.from);
  return stats;
}

/** 83500 → "1:23.5" */
export function formatMs(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function buildSummary(meta: UatSessionMeta, events: UatEvent[]): string {
  const st = computeStats(events, meta.durationMs);
  const lines: string[] = [];
  lines.push(`# UAT session: ${meta.name}`, "");
  lines.push(`- Session: \`${meta.sessionId}\``);
  lines.push(`- Started: ${meta.startedAt}`);
  lines.push(`- Duration: ${formatMs(meta.durationMs)}`);
  lines.push(
    `- Device: ${Object.entries(meta.device)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(", ")}`,
  );
  if (meta.appVersion) lines.push(`- App version: ${meta.appVersion}`);
  lines.push(
    `- Touches: ${st.taps} taps, ${st.longPresses} long presses, ${st.swipes} swipes`,
    "",
  );

  lines.push("## Screen timeline", "", "| Time | Screen | Time on screen |", "|---|---|---|");
  for (const s of st.screenTimeline) {
    lines.push(`| ${formatMs(s.from)} | ${s.screen} | ${formatMs(s.durationMs)} |`);
  }

  lines.push("", "## Taps per screen", "", "| Screen | Taps |", "|---|---|");
  for (const [screen, n] of Object.entries(st.tapsByScreen).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${screen} | ${n} |`);
  }

  if (st.modals.length) {
    lines.push("", "## Modals opened", "");
    for (const m of st.modals) lines.push(`- ${formatMs(m.t)} ${m.name}`);
  }

  if (st.alerts.length) {
    lines.push("", "## Alerts shown", "");
    for (const a of st.alerts) {
      lines.push(
        `- ${formatMs(a.t)} **${a.title}**${a.message ? ` — ${a.message}` : ""}${a.button ? ` → _${a.button}_` : ""}`,
      );
    }
  }

  if (st.appEvents.length) {
    lines.push("", "## App events", "");
    for (const a of st.appEvents) {
      lines.push(`- ${formatMs(a.t)} ${a.name}${a.detail ? ` (${a.detail})` : ""}`);
    }
  }

  lines.push("", "## Errors", "");
  if (st.errors.length === 0) lines.push("- none");
  for (const e of st.errors) lines.push(`- ${formatMs(e.t)} ${e.detail}`);

  lines.push("");
  return lines.join("\n");
}

/** Safe folder name part: "Jan K." → "jan-k" */
export function sanitizeId(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "participant"
  );
}

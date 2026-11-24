import {
  buildSummary,
  classifyTouch,
  computeStats,
  csvCell,
  eventsToCsv,
  formatMs,
  sanitizeId,
  UatEvent,
} from "./format";

const ev = (over: Partial<UatEvent>): UatEvent => ({
  t: 0,
  time: "2026-11-24T10:00:00.000Z",
  type: "tap",
  screen: "/",
  ...over,
});

describe("classifyTouch", () => {
  it("detects taps, long presses and swipes", () => {
    expect(classifyTouch({ x: 0, y: 0, t: 0 }, { x: 3, y: 4, t: 120 })).toBe("tap");
    expect(classifyTouch({ x: 0, y: 0, t: 0 }, { x: 2, y: 2, t: 700 })).toBe("long_press");
    expect(classifyTouch({ x: 0, y: 0, t: 0 }, { x: 0, y: 80, t: 200 })).toBe("swipe");
  });
});

describe("CSV", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(undefined)).toBe("");
  });

  it("writes one row per event with rounded coordinates", () => {
    const csv = eventsToCsv([
      ev({ t: 10, x: 10.6, y: 20.2 }),
      ev({ t: 20, type: "alert_shown", data: { title: "Import complete" } }),
    ]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("t_ms,time,type,screen,x,y,detail");
    expect(lines[1]).toContain(",tap,/,11,20,");
    expect(lines[2]).toContain("title=Import complete");
  });
});

describe("computeStats / summary", () => {
  const events: UatEvent[] = [
    ev({ t: 0, type: "screen", screen: "/" }),
    ev({ t: 1000, type: "tap", screen: "/" }),
    ev({ t: 2000, type: "screen", screen: "/transactions" }),
    ev({ t: 2500, type: "tap", screen: "/transactions" }),
    ev({ t: 3000, type: "modal_open", screen: "/transactions", modal: "import" }),
    ev({ t: 3500, type: "tap", screen: "/transactions", modal: "import" }),
    ev({ t: 4000, type: "alert_shown", screen: "/transactions", data: { title: "Statement import failed", message: "busy" } }),
    ev({ t: 4500, type: "alert_button", screen: "/transactions", data: { button: "OK" } }),
    ev({ t: 5000, type: "app_event", data: { name: "import_statement", imported: 3, skipped: 0 } }),
  ];

  it("counts taps per screen and modal and times screens", () => {
    const st = computeStats(events, 6000);
    expect(st.taps).toBe(3);
    expect(st.tapsByScreen).toEqual({
      "/": 1,
      "/transactions": 1,
      "/transactions › import": 1,
    });
    expect(st.screenTimeline).toEqual([
      { screen: "/", from: 0, durationMs: 2000 },
      { screen: "/transactions", from: 2000, durationMs: 4000 },
    ]);
    expect(st.alerts[0]).toMatchObject({ title: "Statement import failed", button: "OK" });
    expect(st.errors).toHaveLength(1);
  });

  it("renders a markdown summary", () => {
    const md = buildSummary(
      {
        sessionId: "s1",
        name: "P1 T1-T4",
        startedAt: "2026-11-24T10:00:00Z",
        endedAt: "2026-11-24T10:00:06Z",
        durationMs: 6000,
        device: { os: "android" },
      },
      events,
    );
    expect(md).toContain("# UAT session: P1 T1-T4");
    expect(md).toContain("| 0:02.0 | /transactions | 0:04.0 |");
    expect(md).toContain("**Statement import failed** — busy → _OK_");
    expect(md).toContain("import_statement (imported=3, skipped=0)");
  });
});

describe("helpers", () => {
  it("formats durations", () => {
    expect(formatMs(83500)).toBe("1:23.5");
    expect(formatMs(5000)).toBe("0:05.0");
  });

  it("sanitizes participant ids for folder names", () => {
    expect(sanitizeId("Jan Kowalski")).toBe("jan-kowalski");
    expect(sanitizeId("Paweł/../P1")).toBe("pawel-p1");
    expect(sanitizeId("***")).toBe("participant");
  });
});

#!/usr/bin/env node
/**
 * Copies UAT sessions recorded on the phone into app/mobile/uat_tests/sessions.
 *
 *   npm run uat:pull                 copy new sessions (+ their screen recordings)
 *   npm run uat:pull -- --force      re-copy sessions that already exist locally
 *   npm run uat:pull -- --delete     remove copied sessions/videos from the phone
 *   npm run uat:taps -- on|off       show taps on screen (Android "Show taps")
 *
 * Phone:  /sdcard/Download/uat_tests/sessions/<name>/   (UAT_DEVICE_DIR)
 * Local:  app/mobile/uat_tests/sessions/<name>/         (UAT_DIR, gitignored)
 *
 * Screen recordings (Android's built-in recorder saves to Movies/ or DCIM/)
 * whose file time falls inside the session are copied as video_1.mp4, ...
 * Device: ANDROID_SERIAL, otherwise the only connected device.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, "..");
const LOCAL_DIR = path.resolve(process.env.UAT_DIR ?? path.join(mobileRoot, "uat_tests", "sessions"));
const DEVICE_DIR = process.env.UAT_DEVICE_DIR ?? "/sdcard/Download/uat_tests/sessions";
const VIDEO_DIRS = ["/sdcard/Movies", "/sdcard/DCIM", "/sdcard/Pictures"];
// A recording's file time is when it was finished; allow it to end a while after Stop.
const VIDEO_BEFORE_MS = 60_000;
const VIDEO_AFTER_MS = 10 * 60_000;

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);

// ---------- adb ----------

function findAdb() {
  const exe = process.platform === "win32" ? "adb.exe" : "adb";
  const candidates = [
    "adb",
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, "platform-tools", exe),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", exe),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", exe),
    process.env.HOME && path.join(process.env.HOME, "Library", "Android", "sdk", "platform-tools", exe),
    process.env.HOME && path.join(process.env.HOME, "Android", "Sdk", "platform-tools", exe),
  ].filter(Boolean);
  for (const c of candidates) {
    const r = spawnSync(c, ["version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  fail("adb not found. Install Android platform-tools or add adb to PATH.");
}

function fail(msg) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
  process.exit(1);
}

const ADB = findAdb();

function pickDevice() {
  if (process.env.ANDROID_SERIAL) return process.env.ANDROID_SERIAL;
  const out = spawnSync(ADB, ["devices"], { encoding: "utf8" }).stdout ?? "";
  const devices = out
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter(([id, st]) => id && st === "device")
    .map(([id]) => id);
  if (devices.length === 0) fail("No device connected (adb devices is empty).");
  if (devices.length > 1) fail(`Several devices connected (${devices.join(", ")}). Set ANDROID_SERIAL.`);
  return devices[0];
}

const SERIAL = pickDevice();

function adb(argv, { allowFail = false } = {}) {
  const r = spawnSync(ADB, ["-s", SERIAL, ...argv], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && !allowFail) {
    fail(`adb ${argv.join(" ")} failed:\n${r.stderr || r.stdout}`);
  }
  return { ok: r.status === 0, out: (r.stdout ?? "").replace(/\r/g, "") };
}

/** Quote a path for the device shell. */
const q = (p) => `'${p.replace(/'/g, `'\\''`)}'`;

// ---------- taps mode ----------

if (args[0] === "taps") {
  const on = args[1] !== "off";
  adb(["shell", "settings", "put", "system", "show_touches", on ? "1" : "0"]);
  console.log(`Show taps ${on ? "ON" : "OFF"} on ${SERIAL}`);
  process.exit(0);
}

// ---------- pull sessions ----------

function listDeviceSessions() {
  const r = adb(["shell", `ls -1 ${q(DEVICE_DIR)} 2>/dev/null`], { allowFail: true });
  return r.out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listDeviceVideos() {
  const dirs = VIDEO_DIRS.map(q).join(" ");
  const cmd = `find ${dirs} -type f -iname '*.mp4' -exec stat -c '%Y|%s|%n' {} \\; 2>/dev/null`;
  const r = adb(["shell", cmd], { allowFail: true });
  return r.out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [mtime, size, ...rest] = line.split("|");
      return { mtimeMs: Number(mtime) * 1000, size: Number(size), path: rest.join("|") };
    })
    .filter((v) => Number.isFinite(v.mtimeMs) && v.path);
}

function readMeta(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "session.json"), "utf8")).meta;
  } catch {
    return null;
  }
}

const sessions = listDeviceSessions();
if (sessions.length === 0) {
  console.log(`No sessions on the phone in ${DEVICE_DIR}.`);
  console.log("Save a session in the app first (UAT button → Start → Stop → Save).");
  process.exit(0);
}

fs.mkdirSync(LOCAL_DIR, { recursive: true });
const videos = listDeviceVideos();
const pulled = [];
const usedVideos = [];

for (const name of sessions) {
  const local = path.join(LOCAL_DIR, name);
  if (fs.existsSync(local) && !flag("--force")) {
    console.log(`• ${name}: already in repo (use --force to copy again)`);
    continue;
  }
  if (fs.existsSync(local)) fs.rmSync(local, { recursive: true, force: true });

  adb(["pull", `${DEVICE_DIR}/${name}`, LOCAL_DIR]);
  const meta = readMeta(local);
  let videoCount = 0;

  if (meta) {
    const start = Date.parse(meta.startedAt);
    const end = Date.parse(meta.endedAt);
    const matching = videos
      .filter((v) => v.mtimeMs >= start - VIDEO_BEFORE_MS && v.mtimeMs <= end + VIDEO_AFTER_MS)
      .sort((a, b) => a.mtimeMs - b.mtimeMs);
    const info = [];
    for (const v of matching) {
      videoCount++;
      const target = path.join(local, `video_${videoCount}.mp4`);
      adb(["pull", v.path, target]);
      usedVideos.push(v.path);
      info.push({
        file: path.basename(target),
        source: v.path,
        finishedAt: new Date(v.mtimeMs).toISOString(),
        sizeMB: +(v.size / 1024 / 1024).toFixed(1),
      });
    }
    if (info.length) {
      fs.writeFileSync(path.join(local, "videos.json"), JSON.stringify(info, null, 2));
      // link the videos from the summary
      const summaryPath = path.join(local, "summary.md");
      if (fs.existsSync(summaryPath)) {
        const lines = ["", "## Screen recordings", ""];
        for (const i of info) lines.push(`- [${i.file}](./${i.file}) — finished ${i.finishedAt}, ${i.sizeMB} MB`);
        fs.appendFileSync(summaryPath, lines.join("\n") + "\n");
      }
    }
  }

  pulled.push(name);
  console.log(
    `✔ ${name} → ${path.relative(process.cwd(), local) || local}` +
      (meta ? ` (${videoCount} video${videoCount === 1 ? "" : "s"})` : " (no session.json!)"),
  );
  if (meta && videoCount === 0) {
    console.log("  ⚠ No screen recording found for this session (Movies/, DCIM/, Pictures/).");
  }
}

if (flag("--delete") && pulled.length) {
  for (const name of pulled) adb(["shell", `rm -rf ${q(`${DEVICE_DIR}/${name}`)}`], { allowFail: true });
  for (const v of usedVideos) adb(["shell", `rm -f ${q(v)}`], { allowFail: true });
  console.log(`Removed ${pulled.length} session(s) and ${usedVideos.length} video(s) from the phone.`);
}

console.log(`\nDone: ${pulled.length} new session(s) in ${LOCAL_DIR}`);

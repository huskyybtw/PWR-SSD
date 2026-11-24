/**
 * Saves UAT sessions to SHARED phone storage, so `npm run uat:pull` can copy
 * them into the repo with adb (app-private storage is not readable by adb in
 * Expo Go).
 *
 * The moderator picks a folder once with the Android folder picker; its URI
 * is remembered. Android does not allow picking "Download" itself, so the
 * folder to pick is Download/uat_tests (create it in the picker if missing).
 * Sessions are written to
 *   <picked "uat_tests">/sessions/<name>/                    or
 *   <any other picked folder>/uat_tests/sessions/<name>/
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const SAF = FileSystem.StorageAccessFramework;
const ROOT_KEY = "uat.rootDirUri";
export const UAT_DIR_NAME = "uat_tests";
export const SESSIONS_DIR_NAME = "sessions";

export type SessionFiles = Record<string, string>; // file name -> contents

/** Last path segment of a SAF document URI, e.g. ".../primary%3ADownload%2Fuat_tests" -> "uat_tests". */
export function safName(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const tail = decoded.split("/").pop() ?? decoded;
  return tail.split(":").pop() ?? tail;
}

export async function getSavedRoot(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ROOT_KEY);
  } catch {
    return null;
  }
}

/** Sub-folders to create below the picked folder. */
export function sessionsPathFor(rootUri: string): string[] {
  return safName(rootUri) === UAT_DIR_NAME
    ? [SESSIONS_DIR_NAME]
    : [UAT_DIR_NAME, SESSIONS_DIR_NAME];
}

/** Opens the Android folder picker (at Download/uat_tests) and remembers the choice. */
export async function chooseRoot(): Promise<string | null> {
  const initial = SAF.getUriForDirectoryInRoot(`Download/${UAT_DIR_NAME}`);
  const res = await SAF.requestDirectoryPermissionsAsync(initial);
  if (!res.granted) return null;
  await AsyncStorage.setItem(ROOT_KEY, res.directoryUri);
  return res.directoryUri;
}

async function findChild(parentUri: string, name: string): Promise<string | null> {
  const children = await SAF.readDirectoryAsync(parentUri);
  return children.find((c) => safName(c) === name) ?? null;
}

async function ensureDir(parentUri: string, name: string): Promise<string> {
  return (await findChild(parentUri, name)) ?? SAF.makeDirectoryAsync(parentUri, name);
}

/** "p1", "p1-2", "p1-3"... the first name not used yet in the sessions folder. */
export function uniqueName(existing: string[], wanted: string): string {
  if (!existing.includes(wanted)) return wanted;
  let i = 2;
  while (existing.includes(`${wanted}-${i}`)) i++;
  return `${wanted}-${i}`;
}

/**
 * Writes the files into <root>/uat_tests/sessions/<folderName>/.
 * Returns the human-readable path of the created folder.
 */
export async function writeSession(
  rootUri: string,
  folderName: string,
  files: SessionFiles,
): Promise<{ folder: string; name: string }> {
  const subPath = sessionsPathFor(rootUri);
  let dir = rootUri;
  for (const part of subPath) dir = await ensureDir(dir, part);

  const existing = (await SAF.readDirectoryAsync(dir)).map(safName);
  const name = uniqueName(existing, folderName);
  const sessionDir = await SAF.makeDirectoryAsync(dir, name);

  for (const [fileName, contents] of Object.entries(files)) {
    // octet-stream keeps the file name exactly as given (no extra extension).
    const fileUri = await SAF.createFileAsync(
      sessionDir,
      fileName,
      "application/octet-stream",
    );
    await SAF.writeAsStringAsync(fileUri, contents);
  }

  const rootLabel = decodeURIComponent(rootUri).split(":").pop() || "chosen folder";
  return { folder: [rootLabel, ...subPath, name].join("/"), name };
}

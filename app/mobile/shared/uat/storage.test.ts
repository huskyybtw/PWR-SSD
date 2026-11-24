const mockFs: { dirs: Record<string, string[]>; files: Record<string, string> } = {
  dirs: {},
  files: {},
};

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) },
}));

jest.mock("expo-file-system/legacy", () => {
  const child = (parent: string, name: string) =>
    `${parent}%2F${encodeURIComponent(name)}`;
  return {
    StorageAccessFramework: {
      getUriForDirectoryInRoot: (n: string) => `content://root/${n}`,
      requestDirectoryPermissionsAsync: jest.fn(),
      readDirectoryAsync: jest.fn(async (uri: string) => mockFs.dirs[uri] ?? []),
      makeDirectoryAsync: jest.fn(async (parent: string, name: string) => {
        const uri = child(parent, name);
        mockFs.dirs[parent] = [...(mockFs.dirs[parent] ?? []), uri];
        mockFs.dirs[uri] = [];
        return uri;
      }),
      createFileAsync: jest.fn(async (parent: string, name: string) => {
        const uri = child(parent, name);
        mockFs.dirs[parent] = [...(mockFs.dirs[parent] ?? []), uri];
        return uri;
      }),
      writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
        mockFs.files[uri] = contents;
      }),
    },
  };
});

import { safName, uniqueName, writeSession } from "./storage";

const ROOT = "content://tree/primary%3ADownload";

beforeEach(() => {
  mockFs.dirs = { [ROOT]: [] };
  mockFs.files = {};
});

describe("UAT storage", () => {
  it("reads the folder name from SAF URIs", () => {
    expect(safName("content://x/document/primary%3ADownload%2Fuat_tests")).toBe("uat_tests");
    expect(safName("content://x/tree/primary%3ADownload")).toBe("Download");
  });

  it("picks a free folder name", () => {
    expect(uniqueName(["a"], "b")).toBe("b");
    expect(uniqueName(["p1", "p1-2"], "p1")).toBe("p1-3");
  });

  it("creates uat_tests/sessions/<name> once and writes all files", async () => {
    const res = await writeSession(ROOT, "p1", { "a.json": "{}", "b.csv": "x" });
    expect(res).toEqual({ folder: "Download/uat_tests/sessions/p1", name: "p1" });
    expect(Object.values(mockFs.files)).toEqual(["{}", "x"]);

    // second write reuses uat_tests/sessions and avoids the name clash
    const res2 = await writeSession(ROOT, "p1", { "a.json": "{}" });
    expect(res2.name).toBe("p1-2");
    expect(mockFs.dirs[ROOT].filter((u) => safName(u) === "uat_tests")).toHaveLength(1);
  });

  it("does not nest uat_tests when that folder itself was picked", async () => {
    const UAT_ROOT = "content://tree/primary%3ADownload%2Fuat_tests";
    mockFs.dirs[UAT_ROOT] = [];
    const res = await writeSession(UAT_ROOT, "p0", { "a.json": "{}" });
    expect(res.folder).toBe("Download/uat_tests/sessions/p0");
    expect(mockFs.dirs[UAT_ROOT].map(safName)).toEqual(["sessions"]);
  });
});

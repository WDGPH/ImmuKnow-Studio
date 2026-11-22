import { afterEach, expect, it, vi } from "vitest";
import { detectNativeRuntime } from "../src/native-runtime";

afterEach(() => vi.unstubAllGlobals());

it.each([
  ["Windows", "x86", "64", "windows-x86_64"],
  ["macOS", "arm", "64", "macos-aarch64"],
  ["macOS", "x86", "64", "macos-x86_64"],
  ["Linux", "x86", "64", "linux-x86_64"],
  ["Windows", "x86", "32", undefined],
  ["Windows", "arm", "64", undefined],
  ["Linux", "arm", "64", undefined],
  ["Chrome OS", "x86", "64", undefined],
  ["macOS", undefined, undefined, undefined],
])("suggests a supported release for %s, %s, %s", async (platform, architecture, bitness, id) => {
  vi.stubGlobal("navigator", {
    userAgentData: { platform, getHighEntropyValues: async () => ({ architecture, bitness }) },
  });
  expect((await detectNativeRuntime())?.id).toBe(id);
});

it("leaves the choice open when the browser rejects the request for hints", async () => {
  vi.stubGlobal("navigator", {
    userAgentData: { platform: "Windows", getHighEntropyValues: vi.fn().mockRejectedValue(new Error()) },
  });
  await expect(detectNativeRuntime()).resolves.toBeUndefined();
});

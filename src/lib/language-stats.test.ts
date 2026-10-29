
import { describe, expect, it } from "vitest";

import { calculateLanguageStats } from "./language-stats";
import type { RepoFile } from "../types/repository";

function createFile(
  path: string,
  language?: string
): RepoFile {
  return {
    id: path,
    name: path.split("/").at(-1) ?? path,
    path,
    kind: "feature",
    language,
  };
}

describe("Language Distribution", () => {
  it("counts files by language", () => {
    const files = [
      createFile("src/app.ts", "TypeScript"),
      createFile("src/utils.ts", "TypeScript"),
      createFile("src/main.py", "Python"),
    ];

    const result = calculateLanguageStats(files);

    expect(result.totalFiles).toBe(3);
    expect(result.dominantLanguage).toBe("TypeScript");

    expect(result.languages).toEqual([
      {
        language: "TypeScript",
        count: 2,
        percentage: (2 / 3) * 100,
      },
      {
        language: "Python",
        count: 1,
        percentage: (1 / 3) * 100,
      },
    ]);
  });

  it("handles an empty repository", () => {
    const result = calculateLanguageStats([]);

    expect(result.totalFiles).toBe(0);
    expect(result.languages).toEqual([]);
    expect(result.dominantLanguage).toBeNull();
  });

  it("groups files without a detected language", () => {
    const result = calculateLanguageStats([
      createFile("LICENSE"),
      createFile("custom.file", ""),
    ]);

    expect(result.languages).toEqual([
      {
        language: "Unknown",
        count: 2,
        percentage: 100,
      },
    ]);
  });
});

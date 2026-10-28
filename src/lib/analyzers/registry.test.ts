
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  runLanguageAnalyzers,
} from "./registry";

import {
  parseGithubUrl,
} from "../github/client";

describe("RepoAtlas unified analyzers", () => {

  it("resolves TypeScript imports", async () => {
    const sources = new Map([
      [
        "frontend/src/main.ts",
        'import "./utils"; import "@/lib/api";',
      ],
    ]);

    const paths = new Set([
      "frontend/src/main.ts",
      "frontend/src/utils.ts",
      "frontend/src/lib/api.ts",
    ]);

    const result = await runLanguageAnalyzers({
      sources,
      availablePaths: paths,
    });

    expect(result.connections).toContainEqual([
      "frontend/src/main.ts",
      "frontend/src/utils.ts",
    ]);

    expect(result.connections).toContainEqual([
      "frontend/src/main.ts",
      "frontend/src/lib/api.ts",
    ]);
  });

  it("resolves local Python modules", async () => {
    const sources = new Map([
      [
        "backend/app/main.py",
        "from app.comparison import compare",
      ],
    ]);

    const paths = new Set([
      "backend/app/main.py",
      "backend/app/comparison.py",
    ]);

    const result = await runLanguageAnalyzers({
      sources,
      availablePaths: paths,
    });

    expect(result.connections).toContainEqual([
      "backend/app/main.py",
      "backend/app/comparison.py",
    ]);
  });

  it("resolves Java imports conservatively", async () => {
    const sources = new Map([
      [
        "app/src/main/java/com/demo/Main.java",
        "import com.demo.Util; class Main {}",
      ],
    ]);

    const paths = new Set([
      "app/src/main/java/com/demo/Main.java",
      "app/src/main/java/com/demo/Util.java",
    ]);

    const result = await runLanguageAnalyzers({
      sources,
      availablePaths: paths,
    });

    expect(result.connections).toContainEqual([
      "app/src/main/java/com/demo/Main.java",
      "app/src/main/java/com/demo/Util.java",
    ]);
  });

  it("does not fabricate external dependencies", async () => {
    const sources = new Map([
      [
        "app/src/main.ts",
        'import React from "react";',
      ],
    ]);

    const paths = new Set([
      "app/src/main.ts",
    ]);

    const result = await runLanguageAnalyzers({
      sources,
      availablePaths: paths,
    });

    expect(result.connections).toEqual([]);
  });

  it("distinguishes indexed files from downloaded sources", async () => {
    const sources = new Map([
      [
        "app/index.ts",
        "export const x = 1;",
      ],
    ]);

    const paths = new Set([
      "app/index.ts",
      "src/Other.java",
    ]);

    const result = await runLanguageAnalyzers({
      sources,
      availablePaths: paths,
    });

    expect(result.analyzedPaths).toEqual([
      "app/index.ts",
    ]);
  });

  it("rejects GitHub URLs on untrusted domains", () => {
    expect(() =>
      parseGithubUrl(
        "https://evil.example/owner/repo"
      )
    ).toThrow();

    expect(
      parseGithubUrl(
        "https://github.com/test/repo"
      )
    ).toEqual({
      owner: "test",
      repo: "repo",
    });
  });
});

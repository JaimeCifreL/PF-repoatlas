
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  compareRepositoryVersions,
  detectCycleGroups,
} from "./compare";

import type {
  AnalysisResult,
  RepoFile,
  RepoConnection,
} from "../../types/repository";

function file(
  path: string,
  sha: string
): RepoFile {
  return {
    id: path,
    name: path.split("/").at(-1) ?? path,
    path,
    sha,
    kind: "feature",
    language: "TypeScript",
    analysisStatus: "analyzed",
    analysisPrecision: "syntax",
  };
}

function revision(
  branch: string,
  files: RepoFile[],
  connections: RepoConnection[],
  partial = false
): AnalysisResult {
  return {
    repository: "demo/repo",
    branch,
    commitSha: branch === "before"
      ? "aaaa0000"
      : "bbbb0000",

    files,
    connections,

    totalCodeFiles: files.length,
    analyzedFiles: files.filter(
      (item) =>
        item.analysisStatus === "analyzed"
    ).length,

    partial,
    inventoryComplete: true,
    warnings: [],
  };
}

describe("RepoAtlas - Architecture Time Machine", () => {

  it("detects added, removed and modified files", () => {
    const before = revision(
      "before",
      [
        file("src/A.ts", "a1"),
        file("src/B.ts", "b1"),
        file("src/C.ts", "c1"),
      ],
      []
    );

    const after = revision(
      "after",
      [
        file("src/A.ts", "a2"),
        file("src/B.ts", "b1"),
        file("src/D.ts", "d1"),
      ],
      []
    );

    const result = compareRepositoryVersions(
      before,
      after
    );

    expect(result.summary.addedFiles).toBe(1);
    expect(result.summary.removedFiles).toBe(1);
    expect(result.summary.modifiedFiles).toBe(1);
    expect(result.summary.unchangedFiles).toBe(1);

    expect(result.fileChanges).toContainEqual({
      path: "src/A.ts",
      change: "modified",
      language: "TypeScript",
      beforeSha: "a1",
      afterSha: "a2",
    });

    expect(
      result.fileChanges.find(
        (item) =>
          item.path === "src/D.ts"
      )?.change
    ).toBe("added");
  });

  it("detects added and removed dependencies", () => {
    const files = [
      file("src/A.ts", "a1"),
      file("src/B.ts", "b1"),
      file("src/C.ts", "c1"),
    ];

    const before = revision(
      "before",
      files,
      [
        ["src/A.ts", "src/B.ts"],
      ]
    );

    const after = revision(
      "after",
      files,
      [
        ["src/A.ts", "src/C.ts"],
      ]
    );

    const result = compareRepositoryVersions(
      before,
      after
    );

    expect(
      result.summary.addedConnections
    ).toBe(1);

    expect(
      result.summary.removedConnections
    ).toBe(1);

    expect(result.connectionChanges).toContainEqual({
      source: "src/A.ts",
      target: "src/C.ts",
      change: "added",
      confidence: "analyzed",
    });

    expect(result.connectionChanges).toContainEqual({
      source: "src/A.ts",
      target: "src/B.ts",
      change: "removed",
      confidence: "analyzed",
    });
  });

  it("detects a newly introduced cycle", () => {
    const files = [
      file("src/A.ts", "a1"),
      file("src/B.ts", "b1"),
    ];

    const before = revision(
      "before",
      files,
      [
        ["src/A.ts", "src/B.ts"],
      ]
    );

    const after = revision(
      "after",
      files,
      [
        ["src/A.ts", "src/B.ts"],
        ["src/B.ts", "src/A.ts"],
      ]
    );

    const result = compareRepositoryVersions(
      before,
      after
    );

    expect(
      result.summary.introducedCycles
    ).toBe(1);

    expect(
      result.summary.resolvedCycles
    ).toBe(0);

    expect(result.cycleChanges[0]).toEqual({
      members: [
        "src/A.ts",
        "src/B.ts",
      ],
      change: "introduced",
      confidence: "analyzed",
    });
  });

  it("detects a resolved cycle", () => {
    const files = [
      file("src/A.ts", "a1"),
      file("src/B.ts", "b1"),
    ];

    const before = revision(
      "before",
      files,
      [
        ["src/A.ts", "src/B.ts"],
        ["src/B.ts", "src/A.ts"],
      ]
    );

    const after = revision(
      "after",
      files,
      [
        ["src/A.ts", "src/B.ts"],
      ]
    );

    const result = compareRepositoryVersions(
      before,
      after
    );

    expect(
      result.summary.resolvedCycles
    ).toBe(1);

    expect(
      result.summary.introducedCycles
    ).toBe(0);
  });

  it("does not report changes between identical snapshots", () => {
    const files = [
      file("src/A.ts", "a1"),
      file("src/B.ts", "b1"),
    ];

    const snapshot = revision(
      "before",
      files,
      [
        ["src/A.ts", "src/B.ts"],
      ]
    );

    const result = compareRepositoryVersions(
      snapshot,
      snapshot
    );

    expect(result.fileChanges).toEqual([]);
    expect(result.connectionChanges).toEqual([]);
    expect(result.cycleChanges).toEqual([]);

    expect(result.summary.unchangedFiles).toBe(2);
  });

  it("marks limited analyzer coverage", () => {
    const before = revision(
      "before",
      [
        file("src/A.ts", "a1"),
        {
          ...file("src/B.ts", "b1"),
          analysisStatus: "indexed",
        },
      ],
      [],
      true
    );

    const after = revision(
      "after",
      [
        file("src/A.ts", "a2"),
        {
          ...file("src/B.ts", "b2"),
          analysisStatus: "indexed",
        },
      ],
      [
        ["src/B.ts", "src/A.ts"],
      ],
      true
    );

    const result = compareRepositoryVersions(
      before,
      after
    );

    expect(result.coverageLimited).toBe(true);

    expect(
      result.connectionChanges[0]?.confidence
    ).toBe("limited");
  });

  it("does not compare different repositories", () => {
    const before = revision(
      "before",
      [file("src/A.ts", "a1")],
      []
    );

    const after = {
      ...revision(
        "after",
        [file("src/A.ts", "a2")],
        []
      ),
      repository: "another/repo",
    };

    expect(() =>
      compareRepositoryVersions(before, after)
    ).toThrow(
      "Cannot compare two different repositories."
    );
  });

  it("ignores acyclic dependency chains", () => {
    const files = [
      file("A.ts", "a"),
      file("B.ts", "b"),
      file("C.ts", "c"),
    ];

    expect(
      detectCycleGroups({
        files,
        connections: [
          ["A.ts", "B.ts"],
          ["B.ts", "C.ts"],
        ],
      })
    ).toEqual([]);
  });
});


import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFolderGrouping,
} from "./folder-groups";

import {
  buildGraphProjection,
  projectGraphImpact,
  resolveGraphMode,
} from "./graph-aggregation";

import {
  analyzeImpact,
} from "./graph-impact";

import {
  createGraphIndex,
} from "./graph-core";

import type {
  RepositoryGraph,
} from "../types/repository";

const graph: RepositoryGraph = {
  files: [
    {
      id: "src/a/A.ts",
      name: "A.ts",
      path: "src/a/A.ts",
      kind: "entry",
    },
    {
      id: "src/a/B.ts",
      name: "B.ts",
      path: "src/a/B.ts",
      kind: "feature",
    },
    {
      id: "src/b/C.ts",
      name: "C.ts",
      path: "src/b/C.ts",
      kind: "shared",
    },
  ],

  connections: [
    ["src/a/A.ts", "src/a/B.ts"],
    ["src/a/A.ts", "src/b/C.ts"],
    ["src/a/B.ts", "src/b/C.ts"],
  ],
};

const grouping = buildFolderGrouping(graph, 2);

describe("RepoAtlas - Graph Aggregation", () => {

  it("uses modules automatically for large graphs", () => {
    expect(
      resolveGraphMode("auto", 500)
    ).toBe("modules");

    expect(
      resolveGraphMode("auto", 20)
    ).toBe("files");
  });

  it("collapses groups and aggregates cross-module edges", () => {
    const result = buildGraphProjection(
      graph,
      grouping,
      "modules"
    );

    expect(result.graph.files).toHaveLength(2);
    expect(result.graph.connections).toHaveLength(1);

    const a = result.fileToNode.get("src/a/A.ts");
    const b = result.fileToNode.get("src/a/B.ts");
    const c = result.fileToNode.get("src/b/C.ts");

    expect(a).toBe(b);
    expect(a).not.toBe(c);

    expect(result.graph.connections).toContainEqual([
      a,
      c,
    ]);
  });

  it("preserves individual files when expanding a module", () => {
    const folderA = grouping.fileToGroup.get(
      "src/a/A.ts"
    );

    expect(folderA).toBeDefined();

    const expanded = buildGraphProjection(
      graph,
      grouping,
      "modules",
      new Set([folderA!])
    );

    expect(expanded.graph.files).toHaveLength(3);

    expect(expanded.graph.connections).toContainEqual([
      "src/a/A.ts",
      "src/a/B.ts",
    ]);

    expect(expanded.graph.connections).toContainEqual([
      "src/a/B.ts",
      expanded.fileToNode.get("src/b/C.ts"),
    ]);
  });

  it("restores the original file graph", () => {
    const result = buildGraphProjection(
      graph,
      grouping,
      "files"
    );

    expect(result.graph.files).toEqual(graph.files);

    expect(result.graph.connections).toEqual(
      graph.connections
    );
  });

  it("focuses on a selected file and its neighbors", () => {
    const result = buildGraphProjection(
      graph,
      grouping,
      "focus",
      new Set(),
      "src/a/A.ts"
    );

    expect(
      result.graph.files.map((file) => file.id)
    ).toContain("src/a/A.ts");

    expect(result.graph.files.length).toBeLessThanOrEqual(
      200
    );

    expect(result.graph.connections).toHaveLength(3);
  });

  it("projects impact onto collapsed modules", () => {
    const originalImpact = analyzeImpact(
      createGraphIndex(graph),
      "src/b/C.ts"
    );

    const projected = buildGraphProjection(
      graph,
      grouping,
      "modules"
    );

    const projectedImpact = projectGraphImpact(
      originalImpact,
      projected,
      graph.connections
    );

    const affectedModule =
      projected.fileToNode.get("src/a/A.ts");

    expect(projectedImpact).not.toBeNull();

    expect(
      projectedImpact?.depthById.has(
        affectedModule!
      )
    ).toBe(true);

    expect(
      projectedImpact?.highlightedEdges.size
    ).toBeGreaterThan(0);
  });
});

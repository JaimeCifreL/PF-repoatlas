
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
  MAX_FOCUS_NODES,
} from "./graph-aggregation";

import type {
  RepositoryGraph,
  RepoFile,
  RepoConnection,
} from "../types/repository";

function createLargeRepository(
  count: number
): RepositoryGraph {
  const files: RepoFile[] = [];
  const connections: RepoConnection[] = [];

  for (let i = 0; i < count; i++) {
    const moduleIndex = Math.floor(i / 100);

    const path =
      `packages/module-${moduleIndex}/file-${i}.ts`;

    files.push({
      id: path,
      name: `file-${i}.ts`,
      path,
      kind: "feature",
      language: "TypeScript",
      analysisStatus: "analyzed",
    });

    if (i > 0) {
      const previousIndex = i - 1;
      const previousModule =
        Math.floor(previousIndex / 100);

      connections.push([
        path,
        `packages/module-${previousModule}/file-${previousIndex}.ts`,
      ]);
    }
  }

  return {
    files,
    connections,
  };
}

describe("RepoAtlas - Large Graph Projection", () => {

  it("collapses 5000 files into 50 modules", () => {
    const graph = createLargeRepository(5000);

    const grouping = buildFolderGrouping(
      graph,
      2
    );

    const projection = buildGraphProjection(
      graph,
      grouping,
      "modules"
    );

    expect(graph.files).toHaveLength(5000);

    expect(projection.graph.files).toHaveLength(50);

    expect(projection.collapsedGroups).toBe(50);

    expect(projection.graph.connections).toHaveLength(49);
  });

  it("keeps every original file mapped to a module", () => {
    const graph = createLargeRepository(5000);

    const grouping = buildFolderGrouping(
      graph,
      2
    );

    const projection = buildGraphProjection(
      graph,
      grouping,
      "modules"
    );

    expect(projection.fileToNode.size).toBe(5000);

    for (const file of graph.files) {
      expect(
        projection.fileToNode.has(file.id)
      ).toBe(true);
    }
  });

  it("limits the local focus graph", () => {
    const graph = createLargeRepository(5000);

    const grouping = buildFolderGrouping(
      graph,
      2
    );

    const focus = buildGraphProjection(
      graph,
      grouping,
      "focus",
      new Set(),
      "packages/module-25/file-2500.ts"
    );

    expect(
      focus.graph.files.length
    ).toBeLessThanOrEqual(MAX_FOCUS_NODES);

    expect(
      focus.graph.files.some(
        (file) =>
          file.id ===
          "packages/module-25/file-2500.ts"
      )
    ).toBe(true);
  });
});

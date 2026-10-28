
import { describe, expect, it } from "vitest";

import { buildFolderGrouping } from "./folder-groups";
import type { RepositoryGraph } from "@/types/repository";

function testGraph(
  paths: Record<string, string>,
  connections: RepositoryGraph["connections"] = []
): RepositoryGraph {
  return {
    files: Object.entries(paths).map(([id, path]) => ({
      id,
      path,
      name: path.split(/[\\/]/).at(-1) ?? id,
      kind: "feature" as const,
    })),
    connections,
  };
}

describe("RepoAtlas - Folder Grouping", () => {
  it("agrupa archivos de una misma carpeta", () => {
    const graph = testGraph({
      A: "src/components/A.tsx",
      B: "src/components/B.tsx",
      C: "src/types/C.ts",
    });

    const result = buildFolderGrouping(graph, 2);

    expect(result.groups).toHaveLength(2);
    expect(result.fileToGroup.get("A")).toBe(
      result.fileToGroup.get("B")
    );
    expect(result.fileToGroup.get("A")).not.toBe(
      result.fileToGroup.get("C")
    );
  });

  it("permite cambiar la profundidad", () => {
    const graph = testGraph({
      A: "frontend/src/components/A.tsx",
      B: "frontend/src/types/B.ts",
    });

    const level2 = buildFolderGrouping(graph, 2);
    const level3 = buildFolderGrouping(graph, 3);

    expect(level2.groups).toHaveLength(1);
    expect(level3.groups).toHaveLength(2);
  });

  it("reconoce rutas de Windows", () => {
    const graph = testGraph({
      A: "backend\\services\\invoices.py",
      B: "backend/services/payments.py",
    });

    const result = buildFolderGrouping(graph, 2);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.path).toBe(
      "backend/services"
    );
  });

  it("agrupa archivos de la raíz", () => {
    const graph = testGraph({
      A: "index.ts",
      B: "config.js",
    });

    const result = buildFolderGrouping(graph);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.name).toBe("Root");
    expect(result.groups[0]?.fileCount).toBe(2);
  });

  it("distingue conexiones internas y externas", () => {
    const graph = testGraph(
      {
        A: "src/components/A.tsx",
        B: "src/components/B.tsx",
        C: "src/lib/C.ts",
      },
      [
        ["A", "B"],
        ["A", "C"],
        ["B", "C"],
        ["A", "C"],
        ["MISSING", "C"],
      ]
    );

    const result = buildFolderGrouping(graph, 2);

    const components = result.groups.find(
      (group) => group.path === "src/components"
    );

    expect(components?.internalConnections).toBe(1);
    expect(components?.outgoingConnections).toBe(2);

    expect(result.crossFolderConnections).toBe(2);
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.count).toBe(2);
  });

  it("gestiona repositorios vacíos", () => {
    const result = buildFolderGrouping(testGraph({}));

    expect(result.groups).toEqual([]);
    expect(result.links).toEqual([]);
    expect(result.crossFolderConnections).toBe(0);
  });
});

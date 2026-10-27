
import { describe, expect, it } from "vitest";

import { createGraphIndex } from "./graph-core";

import {
  analyzeImpact,
  connectionKey,
  getImpactPath,
} from "./graph-impact";

import type { RepositoryGraph } from "../types/repository";

// Generador de grafos sencillos para las pruebas.
function createTestGraph(
  ids: string[],
  connections: RepositoryGraph["connections"]
): RepositoryGraph {
  return {
    files: ids.map((id) => ({
      id,
      name: id,
      path: id,
      kind: "feature" as const,
    })),
    connections,
  };
}

describe("RepoAtlas - Impact Analysis", () => {

  it("detecta dependientes directos e indirectos", () => {
    const graph = createTestGraph(
      ["A", "B", "C", "D"],
      [
        ["A", "B"],
        ["B", "C"],
        ["D", "C"],
      ]
    );

    const index = createGraphIndex(graph);
    const result = analyzeImpact(index, "C");

    expect(new Set(result.direct)).toEqual(
      new Set(["B", "D"])
    );

    expect(result.indirect).toEqual(["A"]);

    expect(result.depthById.get("A")).toBe(2);
    expect(result.depthById.get("B")).toBe(1);
  });

  it("reconstruye correctamente la ruta de impacto", () => {
    const graph = createTestGraph(
      ["page.tsx", "viewer.tsx", "types.ts"],
      [
        ["page.tsx", "viewer.tsx"],
        ["viewer.tsx", "types.ts"],
      ]
    );

    const index = createGraphIndex(graph);
    const result = analyzeImpact(index, "types.ts");

    expect(getImpactPath(result, "page.tsx")).toEqual([
      "types.ts",
      "viewer.tsx",
      "page.tsx",
    ]);

    expect(
      result.highlightedEdges.has(
        connectionKey("page.tsx", "viewer.tsx")
      )
    ).toBe(true);
  });

  it("evita bucles con dependencias circulares", () => {
    const graph = createTestGraph(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["B", "A"],
        ["C", "B"],
      ]
    );

    const index = createGraphIndex(graph);
    const result = analyzeImpact(index, "A");

    expect(result.direct).toEqual(["B"]);
    expect(result.indirect).toEqual(["C"]);

    // El archivo inicial nunca se cuenta
    // como afectado por sí mismo.
    expect(result.direct).not.toContain("A");
    expect(result.indirect).not.toContain("A");
  });

  it("no incluye archivos independientes", () => {
    const graph = createTestGraph(
      ["A", "B", "C"],
      [["A", "B"]]
    );

    const index = createGraphIndex(graph);
    const result = analyzeImpact(index, "B");

    expect(result.direct).toEqual(["A"]);
    expect(result.indirect).toEqual([]);
    expect(result.depthById.has("C")).toBe(false);
    expect(getImpactPath(result, "C")).toEqual([]);
  });

  it("gestiona archivos inexistentes", () => {
    const graph = createTestGraph(["A"], []);

    const result = analyzeImpact(
      createGraphIndex(graph),
      "NO_EXISTE"
    );

    expect(result.direct).toEqual([]);
    expect(result.indirect).toEqual([]);
  });
});

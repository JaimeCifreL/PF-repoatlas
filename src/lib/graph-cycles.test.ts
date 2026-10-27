
import { describe, expect, it } from "vitest";

import { createGraphIndex } from "./graph-core";
import { findDependencyCycles } from "./graph-cycles";

import type { RepositoryGraph } from "@/types/repository";

function createTestGraph(
  ids: string[],
  connections: RepositoryGraph["connections"]
) {
  return createGraphIndex({
    files: ids.map((id) => ({
      id,
      name: id,
      path: id,
      kind: "feature" as const,
    })),
    connections,
  });
}

describe("RepoAtlas - Circular Dependencies", () => {

  it("detecta un ciclo de tres archivos", () => {
    const graph = createTestGraph(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["B", "C"],
        ["C", "A"],
      ]
    );

    expect(findDependencyCycles(graph)).toEqual([
      ["A", "B", "C"],
    ]);
  });

  it("detecta varios ciclos independientes", () => {
    const graph = createTestGraph(
      ["A", "B", "C", "D", "E"],
      [
        ["A", "B"],
        ["B", "A"],
        ["C", "D"],
        ["D", "C"],
      ]
    );

    expect(findDependencyCycles(graph)).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });

  it("no genera falsos ciclos", () => {
    const graph = createTestGraph(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["B", "C"],
      ]
    );

    expect(findDependencyCycles(graph)).toEqual([]);
  });

  it("detecta referencias a uno mismo", () => {
    const graph = createTestGraph(
      ["A", "B"],
      [["A", "A"]]
    );

    expect(findDependencyCycles(graph)).toEqual([
      ["A"],
    ]);
  });

  it("ignora archivos aislados", () => {
    const graph = createTestGraph(
      ["A", "B", "C"],
      [["A", "B"]]
    );

    expect(findDependencyCycles(graph)).toEqual([]);
  });

});

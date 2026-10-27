
import { describe, expect, it } from "vitest";

import { createGraphIndex } from "./graph-core";
import { calculateGraphMetrics } from "./graph-metrics";

import type { RepositoryGraph } from "@/types/repository";

function testMetrics(
  ids: string[],
  connections: RepositoryGraph["connections"]
) {
  const graph: RepositoryGraph = {
    files: ids.map((id) => ({
      id,
      name: id,
      path: id,
      kind: "feature",
    })),
    connections,
  };

  return calculateGraphMetrics(
    createGraphIndex(graph)
  );
}

describe("RepoAtlas - Architecture Metrics", () => {

  it("calcula fan-in y fan-out", () => {
    const metrics = testMetrics(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["A", "C"],
        ["B", "C"],
      ]
    );

    expect(metrics.byFile.get("A")?.fanOut).toBe(2);
    expect(metrics.byFile.get("A")?.fanIn).toBe(0);

    expect(metrics.byFile.get("C")?.fanIn).toBe(2);
    expect(metrics.byFile.get("C")?.fanOut).toBe(0);
  });

  it("calcula el impacto directo e indirecto", () => {
    const metrics = testMetrics(
      ["A", "B", "C", "D"],
      [
        ["A", "B"],
        ["B", "C"],
        ["D", "C"],
      ]
    );

    const file = metrics.byFile.get("C");

    expect(file?.directImpact).toBe(2);
    expect(file?.indirectImpact).toBe(1);
    expect(file?.totalImpact).toBe(3);
  });

  it("detecta archivos aislados", () => {
    const metrics = testMetrics(
      ["A", "B", "C"],
      [["A", "B"]]
    );

    expect(metrics.isolatedFiles).toBe(1);
    expect(metrics.byFile.get("C")?.isolated).toBe(true);
  });

  it("identifica archivos dentro de ciclos", () => {
    const metrics = testMetrics(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["B", "A"],
        ["B", "C"],
      ]
    );

    expect(metrics.cycleGroups).toEqual([
      ["A", "B"],
    ]);

    expect(metrics.filesInCycles).toBe(2);
    expect(metrics.byFile.get("A")?.inCycle).toBe(true);
    expect(metrics.byFile.get("C")?.inCycle).toBe(false);
  });

  it("evita contar conexiones duplicadas", () => {
    const metrics = testMetrics(
      ["A", "B"],
      [
        ["A", "B"],
        ["A", "B"],
        ["A", "MISSING"],
      ]
    );

    expect(metrics.connections).toBe(1);
    expect(metrics.byFile.get("B")?.fanIn).toBe(1);
  });

  it("calcula la centralidad normalizada", () => {
    const metrics = testMetrics(
      ["A", "B", "C", "D"],
      [
        ["A", "B"],
        ["B", "C"],
      ]
    );

    expect(
      metrics.byFile.get("B")?.degreeCentrality
    ).toBeCloseTo(2 / 3);
  });

  it("ordena los archivos de mayor impacto", () => {
    const metrics = testMetrics(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["B", "C"],
      ]
    );

    expect(metrics.highestImpact[0]?.id).toBe("C");
    expect(metrics.highestImpact[0]?.totalImpact).toBe(2);
  });

  it("gestiona repositorios vacíos", () => {
    const metrics = testMetrics([], []);

    expect(metrics.files).toBe(0);
    expect(metrics.connections).toBe(0);
    expect(metrics.cycleGroups).toEqual([]);
    expect(metrics.highestImpact).toEqual([]);
  });
});


import type { GraphIndex } from "./graph-core";
import { analyzeImpact } from "./graph-impact";
import { findDependencyCycles } from "./graph-cycles";

export type FileMetrics = {
  id: string;

  // Relaciones directas.
  fanIn: number;
  fanOut: number;

  // Alcance potencial de una modificación.
  directImpact: number;
  indirectImpact: number;
  totalImpact: number;

  // Proporción de vecinos distintos (0 a 1).
  degreeCentrality: number;

  // Indicadores estructurales.
  inCycle: boolean;
  isolated: boolean;
  analysisStatus: "indexed" | "analyzed";
};

export type ArchitectureMetrics = {
  files: number;
  connections: number;

  cycleGroups: readonly (readonly string[])[];
  filesInCycles: number;
  isolatedFiles: number;

  byFile: ReadonlyMap<string, FileMetrics>;

  mostReferenced: readonly FileMetrics[];
  highestImpact: readonly FileMetrics[];
  analyzedFiles: number;
  indexedOnlyFiles: number;
};

/**
 * Calcula métricas de arquitectura a partir
 * del índice común de RepoAtlas.
 *
 * Es independiente del lenguaje de programación.
 */
export function calculateGraphMetrics(
  index: GraphIndex
): ArchitectureMetrics {
  const cycleGroups = findDependencyCycles(index);

  const cycleIds = new Set(
    cycleGroups.flat()
  );

  const byFile = new Map<string, FileMetrics>();

  const fileCount = index.filesById.size;

  let connectionCount = 0;
  let isolatedFiles = 0;
  let analyzedFiles = 0;
  let indexedOnlyFiles = 0;

  for (const id of index.filesById.keys()) {
    const analysisStatus =
      index.filesById.get(id)?.analysisStatus ?? "analyzed";

    if (analysisStatus === "analyzed") {
      analyzedFiles++;
    } else {
      indexedOnlyFiles++;
    }

    const incoming =
      index.incoming.get(id) ?? new Set<string>();

    const outgoing =
      index.outgoing.get(id) ?? new Set<string>();

    const fanIn = incoming.size;
    const fanOut = outgoing.size;

    connectionCount += fanOut;

    const impact = analyzeImpact(index, id);

    // Vecinos únicos, independientemente
    // de la dirección de cada conexión.
    const neighbors = new Set<string>([
      ...incoming,
      ...outgoing,
    ]);

    neighbors.delete(id);

    const degreeCentrality =
      fileCount > 1
        ? neighbors.size / (fileCount - 1)
        : 0;

    const isolated = analysisStatus === "analyzed" && fanIn === 0 && fanOut === 0;

    if (isolated) {
      isolatedFiles++;
    }

    const directImpact = impact.direct.length;
    const indirectImpact = impact.indirect.length;

    byFile.set(id, {
      id,
      fanIn,
      fanOut,
      directImpact,
      indirectImpact,
      totalImpact: directImpact + indirectImpact,
      degreeCentrality,
      inCycle: cycleIds.has(id),
      isolated,
      analysisStatus,
    });
  }

  const allMetrics = [...byFile.values()];

  // Archivos más referenciados por otros.
  const mostReferenced = [...allMetrics]
    .filter((item) => item.fanIn > 0)
    .sort(
      (a, b) =>
        b.fanIn - a.fanIn ||
        a.id.localeCompare(b.id)
    )
    .slice(0, 5);

  // Archivos cuya modificación podría
  // alcanzar más archivos dependientes.
  const highestImpact = [...allMetrics]
    .filter((item) => item.totalImpact > 0)
    .sort(
      (a, b) =>
        b.totalImpact - a.totalImpact ||
        a.id.localeCompare(b.id)
    )
    .slice(0, 5);

  return {
    files: fileCount,
    connections: connectionCount,
    cycleGroups,
    filesInCycles: cycleIds.size,
    isolatedFiles,
    byFile,
    mostReferenced,
    highestImpact,
    analyzedFiles,
  indexedOnlyFiles,
  };
}

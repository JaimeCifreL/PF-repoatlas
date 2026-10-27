
import type { GraphIndex } from "./graph-core";

export type ImpactResult = {
  selectedId: string;

  // Archivos afectados a distancia 1.
  direct: readonly string[];

  // Archivos afectados a distancia 2 o superior.
  indirect: readonly string[];

  // Distancia mínima de cada archivo al seleccionado.
  depthById: ReadonlyMap<string, number>;

  // Archivo anterior en la ruta de impacto.
  previousById: ReadonlyMap<string, string>;

  // Conexiones utilizadas para representar el impacto.
  highlightedEdges: ReadonlySet<string>;
};

// Identificador único de una conexión dirigida.
export function connectionKey(
  source: string,
  target: string
): string {
  return `${source}\0${target}`;
}

/**
 * Calcula los posibles archivos afectados al cambiar uno.
 *
 * Convención:
 * Si A importa B, existe la conexión A -> B.
 *
 * Por tanto, al modificar B, A puede verse afectado.
 *
 * Recorremos las dependencias inversas.
 */
export function analyzeImpact(
  index: GraphIndex,
  selectedId: string
): ImpactResult {
  const direct: string[] = [];
  const indirect: string[] = [];

  const depthById = new Map<string, number>();
  const previousById = new Map<string, string>();
  const highlightedEdges = new Set<string>();

  const emptyResult: ImpactResult = {
    selectedId,
    direct,
    indirect,
    depthById,
    previousById,
    highlightedEdges,
  };

  if (!index.filesById.has(selectedId)) {
    return emptyResult;
  }

  // El archivo inicial tiene profundidad cero.
  depthById.set(selectedId, 0);

  const queue: string[] = [selectedId];

  // Índice de lectura para evitar usar shift().
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];

    if (current === undefined) continue;

    const currentDepth = depthById.get(current) ?? 0;

    // Buscar archivos que dependen del actual.
    const dependents = index.incoming.get(current);

    if (!dependents) continue;

    for (const dependent of dependents) {

      // Evitar duplicados y dependencias circulares.
      if (depthById.has(dependent)) {
        continue;
      }

      const nextDepth = currentDepth + 1;

      depthById.set(dependent, nextDepth);
      previousById.set(dependent, current);

      // Registrar la conexión original:
      // dependent importa current.
      highlightedEdges.add(
        connectionKey(dependent, current)
      );

      if (nextDepth === 1) {
        direct.push(dependent);
      } else {
        indirect.push(dependent);
      }

      queue.push(dependent);
    }
  }

  return {
    selectedId,
    direct,
    indirect,
    depthById,
    previousById,
    highlightedEdges,
  };
}

/**
 * Reconstruye la ruta de impacto hasta un archivo.
 *
 * Ejemplo:
 * types.ts -> viewer.tsx -> page.tsx
 */
export function getImpactPath(
  result: ImpactResult,
  targetId: string
): string[] {
  if (!result.depthById.has(targetId)) {
    return [];
  }

  const path: string[] = [targetId];

  let current = targetId;

  while (current !== result.selectedId) {
    const previous = result.previousById.get(current);

    if (!previous) {
      return [];
    }

    path.unshift(previous);
    current = previous;
  }

  return path;
}

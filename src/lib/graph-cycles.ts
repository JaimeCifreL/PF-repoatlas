
import type { GraphIndex } from "./graph-core";

/**
 * Detecta grupos de archivos con dependencias circulares.
 *
 * Utiliza el algoritmo de Tarjan para encontrar
 * componentes fuertemente conexas.
 *
 * Complejidad: O(V + E)
 */
export function findDependencyCycles(
  graph: GraphIndex
): string[][] {
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();

  const stack: string[] = [];
  const onStack = new Set<string>();

  const cycles: string[][] = [];

  let nextIndex = 0;

  function visit(id: string): void {
    const currentIndex = nextIndex++;

    indices.set(id, currentIndex);
    lowLinks.set(id, currentIndex);

    stack.push(id);
    onStack.add(id);

    const dependencies = graph.outgoing.get(id) ?? [];

    for (const dependency of dependencies) {
      if (!indices.has(dependency)) {
        visit(dependency);

        lowLinks.set(
          id,
          Math.min(
            lowLinks.get(id) ?? currentIndex,
            lowLinks.get(dependency) ?? currentIndex
          )
        );
      } else if (onStack.has(dependency)) {
        lowLinks.set(
          id,
          Math.min(
            lowLinks.get(id) ?? currentIndex,
            indices.get(dependency) ?? currentIndex
          )
        );
      }
    }

    if (lowLinks.get(id) !== indices.get(id)) {
      return;
    }

    const component: string[] = [];

    while (stack.length > 0) {
      const member = stack.pop();

      if (member === undefined) break;

      onStack.delete(member);
      component.push(member);

      if (member === id) break;
    }

    const hasSelfLoop =
      component.length === 1 &&
      graph.outgoing.get(component[0])?.has(component[0]);

    if (component.length > 1 || hasSelfLoop) {
      cycles.push(component.sort());
    }
  }

  for (const id of graph.filesById.keys()) {
    if (!indices.has(id)) {
      visit(id);
    }
  }

  // Resultado estable para pruebas e interfaz.
  return cycles.sort((a, b) =>
    a[0].localeCompare(b[0])
  );
}

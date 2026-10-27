
import type {
  RepoFile,
  RepositoryGraph,
} from "@/types/repository";

// Índice de relaciones entre archivos.
export type GraphIndex = {
  filesById: ReadonlyMap<string, RepoFile>;

  // Archivos que importa cada archivo.
  outgoing: ReadonlyMap<string, ReadonlySet<string>>;

  // Archivos que dependen de cada archivo.
  incoming: ReadonlyMap<string, ReadonlySet<string>>;
};

/**
 * Construye un índice de dependencias.
 *
 * Cada relación [A, B] significa:
 * A importa o depende de B.
 *
 * No depende del lenguaje de programación.
 */
export function createGraphIndex(
  graph: RepositoryGraph
): GraphIndex {
  const filesById = new Map<string, RepoFile>();

  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  // Registrar todos los archivos.
  for (const file of graph.files) {
    filesById.set(file.id, file);

    outgoing.set(file.id, new Set());
    incoming.set(file.id, new Set());
  }

  // Construir relaciones en ambos sentidos.
  for (const [source, target] of graph.connections) {

    // Ignorar referencias a archivos inexistentes.
    if (
      !filesById.has(source) ||
      !filesById.has(target)
    ) {
      continue;
    }

    // A depende de B.
    outgoing.get(source)?.add(target);

    // B tiene como dependiente a A.
    incoming.get(target)?.add(source);
  }

  return {
    filesById,
    outgoing,
    incoming,
  };
}

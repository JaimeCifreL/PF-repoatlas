
import type { RepositoryGraph } from "@/types/repository";

export type FolderDepth = 1 | 2 | 3;

export type FolderGroup = {
  id: string;
  path: string;
  name: string;
  fileIds: readonly string[];
  fileCount: number;
  internalConnections: number;
  incomingConnections: number;
  outgoingConnections: number;
};

export type FolderLink = {
  source: string;
  target: string;
  count: number;
};

export type FolderGrouping = {
  depth: FolderDepth;
  groups: readonly FolderGroup[];
  fileToGroup: ReadonlyMap<string, string>;
  links: readonly FolderLink[];
  crossFolderConnections: number;
};

function getFolderPath(
  filePath: string,
  depth: FolderDepth
): string {
  const parts = filePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part !== "" && part !== ".");

  // Excluir el nombre del archivo.
  const directories = parts.slice(0, -1);

  if (directories.length === 0) {
    return ".";
  }

  return directories.slice(0, depth).join("/");
}

/**
 * Agrupa archivos por la profundidad de sus carpetas.
 *
 * No depende del lenguaje de programación.
 * Mantiene las conexiones internas y entre grupos.
 */
export function buildFolderGrouping(
  graph: RepositoryGraph,
  depth: FolderDepth = 3
): FolderGrouping {
  type MutableGroup = {
    path: string;
    fileIds: string[];
    internalConnections: number;
    incomingConnections: number;
    outgoingConnections: number;
  };

  const drafts = new Map<string, MutableGroup>();
  const fileToGroup = new Map<string, string>();
  const links = new Map<string, FolderLink>();

  // Registrar archivos.
  for (const file of graph.files) {
    if (fileToGroup.has(file.id)) continue;

    const path = getFolderPath(file.path, depth);
    const groupId = `folder:${path}`;

    let group = drafts.get(groupId);

    if (!group) {
      group = {
        path,
        fileIds: [],
        internalConnections: 0,
        incomingConnections: 0,
        outgoingConnections: 0,
      };

      drafts.set(groupId, group);
    }

    group.fileIds.push(file.id);
    fileToGroup.set(file.id, groupId);
  }

  const seenEdges = new Set<string>();
  let crossFolderConnections = 0;

  // Agrupar conexiones.
  for (const [source, target] of graph.connections) {
    const sourceGroupId = fileToGroup.get(source);
    const targetGroupId = fileToGroup.get(target);

    if (!sourceGroupId || !targetGroupId) continue;

    // No contar dos veces una conexión idéntica.
    const edgeId = JSON.stringify([source, target]);

    if (seenEdges.has(edgeId)) continue;
    seenEdges.add(edgeId);

    const sourceGroup = drafts.get(sourceGroupId);
    const targetGroup = drafts.get(targetGroupId);

    if (!sourceGroup || !targetGroup) continue;

    if (sourceGroupId === targetGroupId) {
      sourceGroup.internalConnections++;
      continue;
    }

    sourceGroup.outgoingConnections++;
    targetGroup.incomingConnections++;
    crossFolderConnections++;

    const linkId = JSON.stringify([
      sourceGroupId,
      targetGroupId,
    ]);

    const existing = links.get(linkId);

    if (existing) {
      existing.count++;
    } else {
      links.set(linkId, {
        source: sourceGroupId,
        target: targetGroupId,
        count: 1,
      });
    }
  }

  const groups: FolderGroup[] = [...drafts.entries()]
    .map(([id, group]) => ({
      id,
      path: group.path,
      name:
        group.path === "."
          ? "Root"
          : group.path.split("/").at(-1) ?? group.path,
      fileIds: group.fileIds.sort(),
      fileCount: group.fileIds.length,
      internalConnections: group.internalConnections,
      incomingConnections: group.incomingConnections,
      outgoingConnections: group.outgoingConnections,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    depth,
    groups,
    fileToGroup,
    links: [...links.values()].sort(
      (a, b) =>
        a.source.localeCompare(b.source) ||
        a.target.localeCompare(b.target)
    ),
    crossFolderConnections,
  };
}

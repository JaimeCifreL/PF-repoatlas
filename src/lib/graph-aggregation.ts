
import type {
  RepositoryGraph,
  RepoFile,
  RepoConnection,
} from "../types/repository";

import type {
  FolderGrouping,
} from "./folder-groups";

import {
  connectionKey,
  type ImpactResult,
} from "./graph-impact";

export type GraphScaleMode =
  | "auto"
  | "modules"
  | "files"
  | "focus";

export type ResolvedGraphMode =
  | "modules"
  | "files"
  | "focus";

export const AUTO_MODULE_THRESHOLD = 180;
export const MAX_GRAPH_NODES = 650;
export const MAX_FOCUS_NODES = 200;

export type GraphProjection = {
  graph: RepositoryGraph;

  // Original file ID -> rendered node ID.
  fileToNode: ReadonlyMap<string, string>;

  // Rendered module ID -> original folder group ID.
  moduleToFolder: ReadonlyMap<string, string>;

  // Group ID -> rendered module ID.
  folderToModule: ReadonlyMap<string, string>;

  collapsedGroups: number;
  expandedGroups: number;

  // Number of real connections represented by each edge.
  edgeWeights: ReadonlyMap<string, number>;
};

export function resolveGraphMode(
  mode: GraphScaleMode,
  totalFiles: number
): ResolvedGraphMode {
  if (mode === "auto") {
    return totalFiles > AUTO_MODULE_THRESHOLD
      ? "modules"
      : "files";
  }

  return mode;
}

function moduleNodeId(groupId: string): string {
  return `repoatlas:module:${encodeURIComponent(groupId)}`;
}

function fileProjection(
  graph: RepositoryGraph
): GraphProjection {
  return {
    graph,
    fileToNode: new Map(
      graph.files.map((file) => [file.id, file.id])
    ),
    moduleToFolder: new Map(),
    folderToModule: new Map(),
    collapsedGroups: 0,
    expandedGroups: 0,
    edgeWeights: new Map(),
  };
}

function focusedProjection(
  graph: RepositoryGraph,
  focusId: string | null
): GraphProjection {
  const byId = new Map(
    graph.files.map((file) => [file.id, file])
  );

  if (!focusId || !byId.has(focusId)) {
    return {
      graph: {
        files: [],
        connections: [],
      },
      fileToNode: new Map(),
      moduleToFolder: new Map(),
      folderToModule: new Map(),
      collapsedGroups: 0,
      expandedGroups: 0,
      edgeWeights: new Map(),
    };
  }

  const neighbors = new Map<string, Set<string>>();

  for (const [source, target] of graph.connections) {
    if (!byId.has(source) || !byId.has(target)) {
      continue;
    }

    if (!neighbors.has(source)) {
      neighbors.set(source, new Set());
    }

    if (!neighbors.has(target)) {
      neighbors.set(target, new Set());
    }

    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  }

  const visible = new Set<string>([focusId]);
  const queue = [focusId];

  for (
    let i = 0;
    i < queue.length &&
    visible.size < MAX_FOCUS_NODES;
    i++
  ) {
    const current = queue[i];

    for (const neighbor of neighbors.get(current) ?? []) {
      if (visible.size >= MAX_FOCUS_NODES) {
        break;
      }

      if (!visible.has(neighbor)) {
        visible.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return {
    graph: {
      files: graph.files.filter((file) =>
        visible.has(file.id)
      ),
      connections: graph.connections.filter(
        ([source, target]) =>
          visible.has(source) &&
          visible.has(target)
      ),
    },
    fileToNode: new Map(
      [...visible].map((id) => [id, id])
    ),
    moduleToFolder: new Map(),
    folderToModule: new Map(),
    collapsedGroups: 0,
    expandedGroups: 0,
    edgeWeights: new Map(),
  };
}

export function buildGraphProjection(
  graph: RepositoryGraph,
  grouping: FolderGrouping,
  mode: ResolvedGraphMode,
  expandedFolders: ReadonlySet<string> = new Set(),
  focusId: string | null = null
): GraphProjection {
  if (mode === "files") {
    return fileProjection(graph);
  }

  if (mode === "focus") {
    return focusedProjection(graph, focusId);
  }

  const sourceFiles = new Map(
    graph.files.map((file) => [file.id, file])
  );

  const fileToNode = new Map<string, string>();
  const moduleToFolder = new Map<string, string>();
  const folderToModule = new Map<string, string>();

  const displayedFiles: RepoFile[] = [];
  const usedIds = new Set<string>(
    graph.files.map((file) => file.id)
  );

  let collapsedGroups = 0;
  let expandedGroups = 0;

  for (const group of grouping.groups) {
    const expanded = expandedFolders.has(group.id);

    if (expanded) {
      expandedGroups++;

      for (const id of group.fileIds) {
        const file = sourceFiles.get(id);

        if (!file) continue;

        displayedFiles.push(file);
        fileToNode.set(id, id);
      }

      continue;
    }

    collapsedGroups++;

    const id = moduleNodeId(group.id);

    if (usedIds.has(id)) {
      throw new Error(
        `Graph node ID collision: ${id}`
      );
    }

    const moduleFile: RepoFile = {
      id,
      name: `${group.name} (${group.fileCount})`,
      path: group.path,
      kind: "shared",
      language: "Module",
      analysisStatus: "indexed",
    };

    displayedFiles.push(moduleFile);

    moduleToFolder.set(id, group.id);
    folderToModule.set(group.id, id);

    for (const fileId of group.fileIds) {
      fileToNode.set(fileId, id);
    }
  }

  // Defensive fallback for files not assigned to any group.
  for (const file of graph.files) {
    if (!fileToNode.has(file.id)) {
      fileToNode.set(file.id, file.id);
      displayedFiles.push(file);
    }
  }

  const displayedConnections: RepoConnection[] = [];
  const edgeWeights = new Map<string, number>();
  const seenEdges = new Set<string>();

  for (const [source, target] of graph.connections) {
    const mappedSource = fileToNode.get(source);
    const mappedTarget = fileToNode.get(target);

    if (!mappedSource || !mappedTarget) {
      continue;
    }

    // Internal connections of collapsed modules are
    // represented by the module itself.
    if (mappedSource === mappedTarget) {
      continue;
    }

    const key = connectionKey(
      mappedSource,
      mappedTarget
    );

    edgeWeights.set(
      key,
      (edgeWeights.get(key) ?? 0) + 1
    );

    if (seenEdges.has(key)) {
      continue;
    }

    seenEdges.add(key);

    displayedConnections.push([
      mappedSource,
      mappedTarget,
    ]);
  }

  return {
    graph: {
      files: displayedFiles,
      connections: displayedConnections,
    },
    fileToNode,
    moduleToFolder,
    folderToModule,
    collapsedGroups,
    expandedGroups,
    edgeWeights,
  };
}

/**
 * Convert the original impact analysis to the visible graph.
 * The inspector continues to use the original ImpactResult.
 */
export function projectGraphImpact(
  impact: ImpactResult | null,
  projection: GraphProjection,
  originalConnections: readonly RepoConnection[]
): ImpactResult | null {
  if (!impact) {
    return null;
  }

  const source = projection.fileToNode.get(
    impact.selectedId
  );

  if (!source) {
    return null;
  }

  const depthById = new Map<string, number>([
    [source, 0],
  ]);

  for (const [id, depth] of impact.depthById) {
    const mapped = projection.fileToNode.get(id);

    if (!mapped || mapped === source) {
      continue;
    }

    const previous = depthById.get(mapped);

    if (
      previous === undefined ||
      depth < previous
    ) {
      depthById.set(mapped, depth);
    }
  }

  const highlightedEdges = new Set<string>();

  for (
    const [originalSource, originalTarget]
    of originalConnections
  ) {
    const originalKey = connectionKey(
      originalSource,
      originalTarget
    );

    if (!impact.highlightedEdges.has(originalKey)) {
      continue;
    }

    const mappedSource =
      projection.fileToNode.get(originalSource);

    const mappedTarget =
      projection.fileToNode.get(originalTarget);

    if (
      mappedSource &&
      mappedTarget &&
      mappedSource !== mappedTarget
    ) {
      highlightedEdges.add(
        connectionKey(mappedSource, mappedTarget)
      );
    }
  }

  return {
    ...impact,
    selectedId: source,
    direct: [...depthById]
      .filter(([, depth]) => depth === 1)
      .map(([id]) => id),
    indirect: [...depthById]
      .filter(([, depth]) => depth > 1)
      .map(([id]) => id),
    depthById,
    previousById: new Map<string, string>(),
    highlightedEdges,
  };
}


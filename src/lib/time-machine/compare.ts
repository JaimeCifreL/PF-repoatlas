
import type {
  AnalysisResult,
  RepoConnection,
  RepositoryGraph,
  RepoFile,
} from "../../types/repository";

export type FileChangeKind =
  | "added"
  | "removed"
  | "modified";

export type FileChange = {
  path: string;
  change: FileChangeKind;
  language: string;
  beforeSha?: string;
  afterSha?: string;
};

export type ConnectionChange = {
  source: string;
  target: string;
  change: "added" | "removed";
  confidence: "analyzed" | "limited";
};

export type CycleChange = {
  members: string[];
  change: "introduced" | "resolved";
  confidence: "analyzed" | "limited";
};

export type TimeMachineReport = {
  repository: string;
  beforeRef: string;
  afterRef: string;

  before: AnalysisResult;
  after: AnalysisResult;

  summary: {
    addedFiles: number;
    removedFiles: number;
    modifiedFiles: number;
    unchangedFiles: number;

    addedConnections: number;
    removedConnections: number;

    introducedCycles: number;
    resolvedCycles: number;
  };

  fileChanges: FileChange[];
  connectionChanges: ConnectionChange[];
  cycleChanges: CycleChange[];

  coverageLimited: boolean;
  warnings: string[];
};

function edgeKey(
  source: string,
  target: string
): string {
  return JSON.stringify([source, target]);
}

/**
 * Detects strongly connected components.
 *
 * Each component with more than one file represents
 * a circular dependency group.
 *
 * The graph may have many indexed-only files, so we
 * traverse only nodes participating in actual edges.
 */
export function detectCycleGroups(
  graph: RepositoryGraph
): string[][] {
  const existingFiles = new Set(
    graph.files.map((file) => file.id)
  );

  const adjacency = new Map<string, string[]>();
  const selfLoops = new Set<string>();

  for (const [source, target] of graph.connections) {
    if (
      !existingFiles.has(source) ||
      !existingFiles.has(target)
    ) {
      continue;
    }

    if (!adjacency.has(source)) {
      adjacency.set(source, []);
    }

    if (!adjacency.has(target)) {
      adjacency.set(target, []);
    }

    adjacency.get(source)?.push(target);

    if (source === target) {
      selfLoops.add(source);
    }
  }

  let nextIndex = 0;

  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();

  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];

  function visit(id: string) {
    indexes.set(id, nextIndex);
    lowLinks.set(id, nextIndex);
    nextIndex++;

    stack.push(id);
    onStack.add(id);

    for (const target of adjacency.get(id) ?? []) {
      if (!indexes.has(target)) {
        visit(target);

        lowLinks.set(
          id,
          Math.min(
            lowLinks.get(id)!,
            lowLinks.get(target)!
          )
        );
      } else if (onStack.has(target)) {
        lowLinks.set(
          id,
          Math.min(
            lowLinks.get(id)!,
            indexes.get(target)!
          )
        );
      }
    }

    if (lowLinks.get(id) !== indexes.get(id)) {
      return;
    }

    const component: string[] = [];

    while (stack.length > 0) {
      const current = stack.pop()!;

      onStack.delete(current);
      component.push(current);

      if (current === id) {
        break;
      }
    }

    if (
      component.length > 1 ||
      (component.length === 1 &&
        selfLoops.has(component[0]))
    ) {
      cycles.push(component.sort());
    }
  }

  for (const id of adjacency.keys()) {
    if (!indexes.has(id)) {
      visit(id);
    }
  }

  return cycles.sort((a, b) =>
    a.join("|").localeCompare(b.join("|"))
  );
}

function connectionMap(
  connections: readonly RepoConnection[]
): Map<string, RepoConnection> {
  return new Map(
    connections.map((connection) => [
      edgeKey(connection[0], connection[1]),
      connection,
    ])
  );
}

function sourceConfidence(
  source: string,
  beforeFiles: ReadonlyMap<string, RepoFile>,
  afterFiles: ReadonlyMap<string, RepoFile>
): "analyzed" | "limited" {
  const versions = [
    beforeFiles.get(source),
    afterFiles.get(source),
  ];

  const reliable = versions.every(
    (file) =>
      !file ||
      (
        file.analysisStatus === "analyzed" &&
        file.analysisPrecision !== "heuristic"
      )
  );

  return reliable ? "analyzed" : "limited";
}

export function compareRepositoryVersions(
  before: AnalysisResult,
  after: AnalysisResult
): TimeMachineReport {
  if (before.repository !== after.repository) {
    throw new Error(
      "Cannot compare two different repositories."
    );
  }

  const beforeFiles = new Map(
    before.files.map((file) => [file.path, file])
  );

  const afterFiles = new Map(
    after.files.map((file) => [file.path, file])
  );

  const paths = new Set([
    ...beforeFiles.keys(),
    ...afterFiles.keys(),
  ]);

  const fileChanges: FileChange[] = [];
  let unchangedFiles = 0;
  let missingBlobHashes = 0;

  for (const path of paths) {
    const oldFile = beforeFiles.get(path);
    const newFile = afterFiles.get(path);

    if (!oldFile && newFile) {
      fileChanges.push({
        path,
        change: "added",
        language: newFile.language ?? "Unknown",
        afterSha: newFile.sha,
      });

      continue;
    }

    if (oldFile && !newFile) {
      fileChanges.push({
        path,
        change: "removed",
        language: oldFile.language ?? "Unknown",
        beforeSha: oldFile.sha,
      });

      continue;
    }

    if (!oldFile || !newFile) {
      continue;
    }

    if (!oldFile.sha || !newFile.sha) {
      missingBlobHashes++;
      continue;
    }

    if (oldFile.sha !== newFile.sha) {
      fileChanges.push({
        path,
        change: "modified",
        language:
          newFile.language ??
          oldFile.language ??
          "Unknown",
        beforeSha: oldFile.sha,
        afterSha: newFile.sha,
      });
    } else {
      unchangedFiles++;
    }
  }

  fileChanges.sort((a, b) =>
    a.path.localeCompare(b.path)
  );

  const beforeConnections = connectionMap(
    before.connections
  );

  const afterConnections = connectionMap(
    after.connections
  );

  const connectionChanges: ConnectionChange[] = [];

  for (const [key, [source, target]] of afterConnections) {
    if (!beforeConnections.has(key)) {
      connectionChanges.push({
        source,
        target,
        change: "added",
        confidence: sourceConfidence(
          source,
          beforeFiles,
          afterFiles
        ),
      });
    }
  }

  for (const [key, [source, target]] of beforeConnections) {
    if (!afterConnections.has(key)) {
      connectionChanges.push({
        source,
        target,
        change: "removed",
        confidence: sourceConfidence(
          source,
          beforeFiles,
          afterFiles
        ),
      });
    }
  }

  connectionChanges.sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target)
  );

  const beforeCycles = detectCycleGroups(before);
  const afterCycles = detectCycleGroups(after);

  const cycleKey = (members: string[]) =>
    JSON.stringify(members);

  const beforeKeys = new Set(
    beforeCycles.map(cycleKey)
  );

  const afterKeys = new Set(
    afterCycles.map(cycleKey)
  );

  const coverageLimited =
    before.partial ||
    after.partial ||
    missingBlobHashes > 0;

  const cycleChanges: CycleChange[] = [
    ...afterCycles
      .filter((members) =>
        !beforeKeys.has(cycleKey(members))
      )
      .map(
        (members): CycleChange => ({
          members,
          change: "introduced",
          confidence: coverageLimited
            ? "limited"
            : "analyzed",
        })
      ),

    ...beforeCycles
      .filter((members) =>
        !afterKeys.has(cycleKey(members))
      )
      .map(
        (members): CycleChange => ({
          members,
          change: "resolved",
          confidence: coverageLimited
            ? "limited"
            : "analyzed",
        })
      ),
  ];

  const warnings = [
    ...before.warnings.map(
      (warning) => `BEFORE: ${warning}`
    ),
    ...after.warnings.map(
      (warning) => `AFTER: ${warning}`
    ),
  ];

  if (missingBlobHashes > 0) {
    warnings.push(
      `${missingBlobHashes} files could not be ` +
      `compared because their blob SHA is missing.`
    );
  }

  return {
    repository: before.repository,
    beforeRef: before.branch,
    afterRef: after.branch,
    before,
    after,

    summary: {
      addedFiles: fileChanges.filter(
        (item) => item.change === "added"
      ).length,

      removedFiles: fileChanges.filter(
        (item) => item.change === "removed"
      ).length,

      modifiedFiles: fileChanges.filter(
        (item) => item.change === "modified"
      ).length,

      unchangedFiles,

      addedConnections: connectionChanges.filter(
        (item) => item.change === "added"
      ).length,

      removedConnections: connectionChanges.filter(
        (item) => item.change === "removed"
      ).length,

      introducedCycles: cycleChanges.filter(
        (item) => item.change === "introduced"
      ).length,

      resolvedCycles: cycleChanges.filter(
        (item) => item.change === "resolved"
      ).length,
    },

    fileChanges,
    connectionChanges,
    cycleChanges,
    coverageLimited,
    warnings,
  };
}

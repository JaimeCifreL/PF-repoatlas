
import type {
  AnalysisResult,
  RepoFile,
} from "../../types/repository";

import { detectLanguage } from "../language-detection";

import {
  canAnalyze,
  runLanguageAnalyzers,
} from "../analyzers/registry";

import {
  loadGithubSnapshot,
  loadGithubText,
  type GithubSnapshot,
  type GithubEntry,
} from "./client";

const MAX_SOURCE_FILES = 350;
const MAX_SOURCE_BYTES = 160_000;
const CONCURRENCY = 8;
const CACHE_MS = 120_000;

const cache = new Map<
  string,
  {
    until: number;
    value: AnalysisResult;
  }
>();

function toFile(entry: GithubEntry): RepoFile {
  const name =
    entry.path.split("/").at(-1) ??
    entry.path;

  const kind: RepoFile["kind"] =
    /(^|\/)(shared|lib|utils|types)\//i.test(
      entry.path
    )
      ? "shared"
      : /^(index|main|app|page|route)\./i.test(name)
        ? "entry"
        : "feature";

  return {
    id: entry.path,
    name,
    path: entry.path,
    kind,
    size: entry.size,

    language:
      entry.type === "commit"
        ? "Git submodule"
        : detectLanguage(entry.path),

    analysisStatus: "indexed",
  };
}

export function snapshotInventory(
  snapshot: GithubSnapshot
): Pick<
  AnalysisResult,
  | "repository"
  | "branch"
  | "commitSha"
  | "files"
  | "directories"
> {
  return {
    repository: snapshot.repository,
    branch: snapshot.branch,
    commitSha: snapshot.commitSha,

    files: snapshot.entries
      .filter(
        (entry) => entry.type !== "tree"
      )
      .map(toFile),

    directories: snapshot.entries
      .filter(
        (entry) => entry.type === "tree"
      )
      .map((entry) => entry.path),
  };
}

export async function analyzeGithubRepository(
  url: string,
  branch?: string
): Promise<AnalysisResult> {
  const key = `${url.trim()}#${branch ?? ""}`;

  const now = Date.now();
  const cached = cache.get(key);

  if (
    cached &&
    cached.until > now
  ) {
    return cached.value;
  }

  const snapshot = await loadGithubSnapshot(
    url,
    branch
  );

  const inventory = snapshotInventory(snapshot);

  const eligible = snapshot.entries.filter(
    (entry) =>
      entry.type === "blob" &&
      entry.mode !== "120000" &&
      canAnalyze(entry.path)
  );

  const selected = eligible
    .filter(
      (entry) =>
        entry.size === undefined ||
        entry.size <= MAX_SOURCE_BYTES
    )
    .slice(0, MAX_SOURCE_FILES);

  const warnings: string[] = [];

  const skippedBySize = eligible.filter(
    (entry) =>
      entry.size !== undefined &&
      entry.size > MAX_SOURCE_BYTES
  ).length;

  if (eligible.length > selected.length) {
    warnings.push(
      `Analysis limited: ${selected.length}/${eligible.length} ` +
      `supported code files selected ` +
      `(${skippedBySize} too large). ` +
      `All files are still indexed.`
    );
  }

  const sources = new Map<
    string,
    string
  >();

  for (
    let i = 0;
    i < selected.length;
    i += CONCURRENCY
  ) {
    await Promise.all(
      selected
        .slice(i, i + CONCURRENCY)
        .map(async (entry) => {
          try {
            const text = await loadGithubText(
              snapshot,
              entry
            );

            if (
              Buffer.byteLength(text, "utf8") >
              MAX_SOURCE_BYTES
            ) {
              warnings.push(
                `${entry.path}: skipped (large file)`
              );

              return;
            }

            sources.set(entry.path, text);
          } catch (error) {
            warnings.push(
              `${entry.path}: ${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`
            );
          }
        })
    );
  }

  const output = await runLanguageAnalyzers({
    sources,

    availablePaths: new Set(
      inventory.files.map(
        (file) => file.path
      )
    ),
  });

  const analyzed = new Set(
    output.analyzedPaths
  );

  const files = inventory.files.map(
    (file) => ({
      ...file,

      analysisStatus: (
        analyzed.has(file.path)
          ? "analyzed"
          : "indexed"
      ) as "indexed" | "analyzed",

      analysisPrecision:
        analyzed.has(file.path)
          ? output.precisionByPath?.[file.path]
          : undefined,
    })
  );

  const result: AnalysisResult = {
    ...inventory,

    files,
    connections: output.connections,

    totalCodeFiles: eligible.length,
    analyzedFiles: analyzed.size,

    partial:
      analyzed.size !== eligible.length ||
      output.warnings.length > 0,

    inventoryComplete: true,

    warnings: [
      ...warnings,
      ...output.warnings,
    ],
  };

  cache.set(key, {
    until: Date.now() + CACHE_MS,
    value: result,
  });

  if (cache.size > 8) {
    cache.delete(
      cache.keys().next().value ?? key
    );
  }

  return result;
}

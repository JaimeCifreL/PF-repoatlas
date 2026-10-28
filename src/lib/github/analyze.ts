
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
    sha: entry.sha,
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
      .filter((entry) => entry.type !== "tree")
      .map(toFile),

    directories: snapshot.entries
      .filter((entry) => entry.type === "tree")
      .map((entry) => entry.path),
  };
}

export async function analyzeGithubSnapshot(
  snapshot: GithubSnapshot
): Promise<AnalysisResult> {
  const key =
    `${snapshot.repository}@${snapshot.commitSha}`;

  const cached = cache.get(key);

  if (cached && cached.until > Date.now()) {
    return {
      ...cached.value,
      branch: snapshot.branch,
    };
  }

  const inventory = snapshotInventory(snapshot);

  const eligible = snapshot.entries
    .filter(
      (entry) =>
        entry.type === "blob" &&
        entry.mode !== "120000" &&
        canAnalyze(entry.path)
    )
    .sort((a, b) =>
      a.path.localeCompare(b.path)
    );

  const selected = eligible
    .filter(
      (entry) =>
        entry.size === undefined ||
        entry.size <= MAX_SOURCE_BYTES
    )
    .slice(0, MAX_SOURCE_FILES);

  const warnings: string[] = [];

  if (eligible.length > selected.length) {
    warnings.push(
      `Analysis limited to ${selected.length} of ` +
      `${eligible.length} supported source files. ` +
      `All files remain indexed.`
    );
  }

  const sources = new Map<string, string>();

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
            const source = await loadGithubText(
              snapshot,
              entry
            );

            if (
              Buffer.byteLength(source, "utf8") >
              MAX_SOURCE_BYTES
            ) {
              warnings.push(
                `${entry.path}: file too large`
              );

              return;
            }

            sources.set(entry.path, source);
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
      inventory.files.map((file) => file.path)
    ),
  });

  const analyzed = new Set(
    output.analyzedPaths
  );

  const files: RepoFile[] = inventory.files.map(
    (file) => ({
      ...file,

      analysisStatus: analyzed.has(file.path)
        ? "analyzed"
        : "indexed",

      analysisPrecision: analyzed.has(file.path)
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
      analyzed.size < eligible.length ||
      warnings.length > 0 ||
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
    const oldest =
      cache.keys().next().value;

    if (oldest) {
      cache.delete(oldest);
    }
  }

  return result;
}

export async function analyzeGithubRepository(
  url: string,
  ref?: string
): Promise<AnalysisResult> {
  const snapshot = await loadGithubSnapshot(
    url,
    ref
  );

  return analyzeGithubSnapshot(snapshot);
}

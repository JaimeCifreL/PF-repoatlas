
import type { RepoConnection } from "../../types/repository";

import { javascriptAnalyzer } from "./javascript";
import { pythonAnalyzer } from "./python";

import {
  javaAnalyzer,
  csharpAnalyzer,
  phpAnalyzer,
  goAnalyzer,
  rustAnalyzer,
  rubyAnalyzer,
  dartAnalyzer,
} from "./other-languages";

import type {
  AnalyzerContext,
  AnalyzerOutput,
  LanguageAnalyzer,
} from "./types";

export const languageAnalyzers:
  readonly LanguageAnalyzer[] = [
    javascriptAnalyzer,
    pythonAnalyzer,
    javaAnalyzer,
    csharpAnalyzer,
    phpAnalyzer,
    goAnalyzer,
    rustAnalyzer,
    rubyAnalyzer,
    dartAnalyzer,
  ];

export function canAnalyze(path: string): boolean {
  const normalized = path.toLowerCase();

  return languageAnalyzers.some((analyzer) =>
    analyzer.extensions.some((extension) =>
      normalized.endsWith(extension)
    )
  );
}

export async function runLanguageAnalyzers(
  context: AnalyzerContext,
  analyzers: readonly LanguageAnalyzer[] =
    languageAnalyzers
): Promise<AnalyzerOutput> {
  const connections: RepoConnection[] = [];
  const analyzedPaths = new Set<string>();
  const warnings: string[] = [];
  const seen = new Set<string>();

  const precisionByPath: Record<
    string,
    "syntax" | "heuristic"
  > = {};

  for (const analyzer of analyzers) {
    const matchingSources = new Map<
      string,
      string
    >();

    for (const [path, source] of context.sources) {
      if (
        analyzer.extensions.some((ext) =>
          path.toLowerCase().endsWith(
            ext.toLowerCase()
          )
        )
      ) {
        matchingSources.set(path, source);
      }
    }

    if (matchingSources.size === 0) {
      continue;
    }

    try {
      const result = await analyzer.analyze({
        sources: matchingSources,
        availablePaths: context.availablePaths,
      });

      for (const path of result.analyzedPaths) {
        if (!matchingSources.has(path)) {
          warnings.push(
            `${analyzer.id}: unexpected analyzed file ${path}`
          );
          continue;
        }

        analyzedPaths.add(path);

        precisionByPath[path] =
          analyzer.precision ?? "heuristic";
      }

      for (
        const [source, target] of result.connections
      ) {
        if (
          !matchingSources.has(source) ||
          !context.availablePaths.has(target)
        ) {
          warnings.push(
            `${analyzer.id}: invalid dependency ${source} -> ${target}`
          );
          continue;
        }

        const key = JSON.stringify([
          source,
          target,
        ]);

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        connections.push([source, target]);
      }

      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push(
        `${analyzer.id}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  return {
    connections,
    analyzedPaths: [...analyzedPaths],
    warnings,
    precisionByPath,
  };
}

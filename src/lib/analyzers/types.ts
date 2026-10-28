
import type { RepoConnection } from "../../types/repository";

export type AnalyzerContext = {
  sources: ReadonlyMap<string, string>;
  availablePaths: ReadonlySet<string>;
};

export type AnalyzerOutput = {
  connections: readonly RepoConnection[];
  analyzedPaths: readonly string[];
  warnings: readonly string[];

  precisionByPath?: Readonly<
    Record<string, "syntax" | "heuristic">
  >;
};

export type LanguageAnalyzer = {
  id: string;
  extensions: readonly string[];
  precision?: "syntax" | "heuristic";

  analyze(
    context: AnalyzerContext
  ): AnalyzerOutput | Promise<AnalyzerOutput>;
};

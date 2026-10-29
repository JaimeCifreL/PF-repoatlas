
import type { RepoFile } from "../types/repository";

export type LanguageStat = {
  language: string;
  count: number;
  percentage: number;
};

export type LanguageSummary = {
  totalFiles: number;
  languages: LanguageStat[];
  dominantLanguage: string | null;
};

export function calculateLanguageStats(
  files: readonly RepoFile[]
): LanguageSummary {
  const counts = new Map<string, number>();

  for (const file of files) {
    const language = file.language?.trim() || "Unknown";

    counts.set(
      language,
      (counts.get(language) ?? 0) + 1
    );
  }

  const totalFiles = files.length;

  const languages = Array.from(counts.entries())
    .map(([language, count]) => ({
      language,
      count,
      percentage:
        totalFiles > 0
          ? (count / totalFiles) * 100
          : 0,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.language.localeCompare(b.language)
    );

  return {
    totalFiles,
    languages,
    dominantLanguage: languages[0]?.language ?? null,
  };
}


"use client";

import { useMemo } from "react";
import { Code2, Files, Layers3 } from "lucide-react";

import type { RepoFile } from "../types/repository";
import { calculateLanguageStats } from "../lib/language-stats";

type Props = {
  files: readonly RepoFile[];
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#E6C84B",
  Python: "#438FB6",
  CSS: "#A46DDE",
  HTML: "#E87651",
  Java: "#C58A59",
  "C#": "#8A65C9",
  PHP: "#777BB4",
  Go: "#54BFC6",
  Rust: "#BA7553",
  Ruby: "#CA5454",
  Dart: "#3FA7D6",
  JSON: "#9CA3AF",
  Markdown: "#70A79A",
  Unknown: "#657889",
};

const FALLBACK_COLORS = [
  "#57C7A5",
  "#E0A861",
  "#D57FAA",
  "#7D9BD3",
  "#A7B76D",
];

export function LanguageDistribution({ files }: Props) {
  const summary = useMemo(
    () => calculateLanguageStats(files),
    [files]
  );

  const colors = useMemo(() => {
    const result = new Map<string, string>();

    summary.languages.forEach((item, index) => {
      result.set(
        item.language,
        LANGUAGE_COLORS[item.language] ??
          FALLBACK_COLORS[index % FALLBACK_COLORS.length]
      );
    });

    return result;
  }, [summary.languages]);

  const topLanguages = summary.languages.slice(0, 8);

  if (summary.totalFiles === 0) {
    return (
      <section className="rounded-xl border border-[#293B4B] bg-[#101B28] p-5">
        <div className="flex items-center gap-2">
          <Code2 size={17} className="text-[#41D8B4]" />
          <h2 className="text-sm font-semibold text-[#E5EFF4]">
            Language Distribution
          </h2>
        </div>

        <p className="mt-5 text-sm text-[#8198A9]">
          Analyze a repository to see its language distribution.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#293B4B] bg-[#101B28] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Code2 size={17} className="text-[#41D8B4]" />

            <h2 className="text-sm font-semibold text-[#E5EFF4]">
              Language Distribution
            </h2>
          </div>

          <p className="mt-2 text-xs text-[#8198A9]">
            Repository file inventory by detected language
          </p>
        </div>

        <span className="rounded-md border border-[#286E5F] bg-[#143B33] px-3 py-2 font-mono text-[10px] text-[#7AE9C8]">
          {summary.languages.length} LANGUAGES
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#2A3F4F] bg-[#0B1520] p-4">
          <div className="flex items-center gap-2 text-[#7895A7]">
            <Files size={14} />
            <span className="font-mono text-[10px]">
              TOTAL FILES
            </span>
          </div>

          <p className="mt-2 font-mono text-2xl font-semibold text-[#E8F4F5]">
            {summary.totalFiles.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg border border-[#2A3F4F] bg-[#0B1520] p-4">
          <div className="flex items-center gap-2 text-[#7895A7]">
            <Layers3 size={14} />
            <span className="font-mono text-[10px]">
              TOP LANGUAGE
            </span>
          </div>

          <p className="mt-2 truncate text-lg font-semibold text-[#69DDBB]">
            {summary.dominantLanguage ?? "Unknown"}
          </p>
        </div>
      </div>

      <div
        className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-[#243644]"
        role="img"
        aria-label="Language distribution"
      >
        {summary.languages.map((item) => (
          <div
            key={item.language}
            title={`${item.language}: ${item.count} files (${item.percentage.toFixed(1)}%)`}
            style={{
              width: `${item.percentage}%`,
              backgroundColor: colors.get(item.language),
            }}
          />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {topLanguages.map((item) => (
          <div key={item.language}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{
                    backgroundColor: colors.get(item.language),
                  }}
                />

                <span className="truncate text-xs text-[#CFDEE6]">
                  {item.language}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3 font-mono text-[11px]">
                <span className="text-[#7E99A9]">
                  {item.count}
                </span>

                <span className="w-14 text-right text-[#DCEBF0]">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-[#243644]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: colors.get(item.language),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {summary.languages.length > topLanguages.length && (
        <p className="mt-5 text-xs text-[#7893A4]">
          Showing the 8 most common languages.
          The distribution bar includes all languages.
        </p>
      )}
    </section>
  );
}
